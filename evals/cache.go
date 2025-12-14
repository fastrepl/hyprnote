package evals

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"os"
	"path/filepath"

	"github.com/adrg/xdg"
	"github.com/dgraph-io/badger/v4"
	"github.com/openai/openai-go/v3"
)

// CachingChatCompleter wraps a ChatCompleter with response caching using BadgerDB.
type CachingChatCompleter struct {
	next     ChatCompleter
	db       *badger.DB
	cacheDir string
}

// CacheConfig configures the caching behavior.
type CacheConfig struct {
	Enabled  bool
	CacheDir string
}

// DefaultCacheDir returns the platform-specific default cache directory.
func DefaultCacheDir() string {
	return filepath.Join(xdg.CacheHome, "hyprnote", "eval.cache")
}

// NewCachingChatCompleter creates a new caching wrapper around the given ChatCompleter.
// If caching is disabled or the cache directory cannot be determined, it returns
// a passthrough wrapper that delegates directly to the underlying client.
func NewCachingChatCompleter(next ChatCompleter, cfg CacheConfig) (*CachingChatCompleter, error) {
	if !cfg.Enabled {
		return &CachingChatCompleter{next: next}, nil
	}

	cacheDir := cfg.CacheDir
	if cacheDir == "" {
		cacheDir = DefaultCacheDir()
	}

	if cacheDir == "" {
		return &CachingChatCompleter{next: next}, nil
	}

	if err := os.MkdirAll(cacheDir, 0755); err != nil {
		return nil, err
	}

	opts := badger.DefaultOptions(cacheDir)
	opts.Logger = nil

	db, err := badger.Open(opts)
	if err != nil {
		return nil, err
	}

	return &CachingChatCompleter{next: next, db: db, cacheDir: cacheDir}, nil
}

// Close closes the underlying BadgerDB database.
func (c *CachingChatCompleter) Close() error {
	if c.db != nil {
		return c.db.Close()
	}
	return nil
}

// CacheDir returns the directory where cache data is stored.
func (c *CachingChatCompleter) CacheDir() string {
	return c.cacheDir
}

type cacheRequest struct {
	Model          string         `json:"model"`
	Messages       []cacheMessage `json:"messages"`
	Temperature    float64        `json:"temperature,omitempty"`
	N              int64          `json:"n,omitempty"`
	ResponseFormat any            `json:"response_format,omitempty"`
}

type cacheMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

func computeCacheKey(params openai.ChatCompletionNewParams) (string, error) {
	messages := make([]cacheMessage, 0)
	for _, msg := range params.Messages {
		if userMsg := msg.OfUser; userMsg != nil {
			for _, part := range userMsg.Content.OfArrayOfContentParts {
				if textPart := part.OfText; textPart != nil {
					messages = append(messages, cacheMessage{Role: "user", Content: textPart.Text})
				}
			}
			if userMsg.Content.OfString.Valid() {
				messages = append(messages, cacheMessage{Role: "user", Content: userMsg.Content.OfString.Value})
			}
		}
		if sysMsg := msg.OfSystem; sysMsg != nil {
			if sysMsg.Content.OfString.Valid() {
				messages = append(messages, cacheMessage{Role: "system", Content: sysMsg.Content.OfString.Value})
			}
		}
		if asstMsg := msg.OfAssistant; asstMsg != nil {
			if asstMsg.Content.OfString.Valid() {
				messages = append(messages, cacheMessage{Role: "assistant", Content: asstMsg.Content.OfString.Value})
			}
		}
	}

	var temp float64
	if params.Temperature.Valid() {
		temp = params.Temperature.Value
	}

	var n int64
	if params.N.Valid() {
		n = params.N.Value
	}

	var responseFormat any
	if params.ResponseFormat.OfJSONSchema != nil {
		responseFormat = map[string]any{
			"type":   "json_schema",
			"name":   params.ResponseFormat.OfJSONSchema.JSONSchema.Name,
			"schema": params.ResponseFormat.OfJSONSchema.JSONSchema.Schema,
			"strict": params.ResponseFormat.OfJSONSchema.JSONSchema.Strict,
		}
	}

	req := cacheRequest{
		Model:          params.Model,
		Messages:       messages,
		Temperature:    temp,
		N:              n,
		ResponseFormat: responseFormat,
	}

	data, err := json.Marshal(req)
	if err != nil {
		return "", err
	}

	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:]), nil
}

// CreateChatCompletion implements ChatCompleter with caching.
// It first checks the cache for a matching response, and if not found,
// delegates to the underlying client and caches the result.
func (c *CachingChatCompleter) CreateChatCompletion(ctx context.Context, params openai.ChatCompletionNewParams) (*openai.ChatCompletion, error) {
	if c.db == nil {
		return c.next.CreateChatCompletion(ctx, params)
	}

	cacheKey, err := computeCacheKey(params)
	if err != nil {
		return c.next.CreateChatCompletion(ctx, params)
	}

	var cached *openai.ChatCompletion
	err = c.db.View(func(txn *badger.Txn) error {
		item, err := txn.Get([]byte(cacheKey))
		if err != nil {
			return err
		}
		return item.Value(func(val []byte) error {
			cached = &openai.ChatCompletion{}
			return json.Unmarshal(val, cached)
		})
	})
	if err == nil && cached != nil {
		return cached, nil
	}

	resp, err := c.next.CreateChatCompletion(ctx, params)
	if err != nil {
		return nil, err
	}

	data, marshalErr := json.Marshal(resp)
	if marshalErr == nil {
		c.db.Update(func(txn *badger.Txn) error {
			return txn.Set([]byte(cacheKey), data)
		})
	}

	return resp, nil
}
