package evals

import (
	"bufio"
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httputil"
	"os"
	"path/filepath"
	"strings"

	"github.com/adrg/xdg"
	"github.com/cyberphone/json-canonicalization/go/src/webpki.org/jsoncanonicalizer"
	"github.com/dgraph-io/badger/v4"
	"golang.org/x/sync/singleflight"
)

const cacheKeyVersion = 1

type CacheConfig struct {
	Enabled  bool
	CacheDir string
}

func DefaultCacheDir() string {
	return filepath.Join(xdg.CacheHome, "hyprnote", "eval.cache")
}

type CachingRoundTripper struct {
	next     http.RoundTripper
	db       *badger.DB
	cacheDir string
	group    singleflight.Group
}

func NewCachingRoundTripper(next http.RoundTripper, cfg CacheConfig) (*CachingRoundTripper, error) {
	if !cfg.Enabled {
		return &CachingRoundTripper{next: next}, nil
	}

	cacheDir := cfg.CacheDir
	if cacheDir == "" {
		cacheDir = DefaultCacheDir()
	}

	if cacheDir == "" {
		return &CachingRoundTripper{next: next}, nil
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

	return &CachingRoundTripper{next: next, db: db, cacheDir: cacheDir}, nil
}

func (c *CachingRoundTripper) Close() error {
	if c.db != nil {
		return c.db.Close()
	}
	return nil
}

func (c *CachingRoundTripper) CacheDir() string {
	return c.cacheDir
}

type cacheKeyInput struct {
	Version int    `json:"v"`
	Method  string `json:"method"`
	URL     string `json:"url"`
	Body    string `json:"body"`
}

func canonicalizeJSON(data []byte) ([]byte, error) {
	return jsoncanonicalizer.Transform(data)
}

func computeHTTPCacheKey(method, url string, body []byte) (string, error) {
	var canonicalBody []byte
	if len(body) > 0 {
		var err error
		canonicalBody, err = canonicalizeJSON(body)
		if err != nil {
			return "", err
		}
	}

	keyInput := cacheKeyInput{
		Version: cacheKeyVersion,
		Method:  method,
		URL:     url,
		Body:    string(canonicalBody),
	}

	data, err := json.Marshal(keyInput)
	if err != nil {
		return "", err
	}

	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:]), nil
}

func shouldCache(req *http.Request) bool {
	if req.Method == http.MethodPost {
		return true
	}

	if req.Method == http.MethodGet && strings.Contains(req.URL.Path, "/generation") {
		return true
	}

	return false
}

func (c *CachingRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	if c.db == nil || !shouldCache(req) {
		return c.next.RoundTrip(req)
	}

	var body []byte
	if req.Body != nil {
		var err error
		body, err = io.ReadAll(req.Body)
		if err != nil {
			return c.next.RoundTrip(req)
		}
		req.Body = io.NopCloser(bytes.NewReader(body))
	}

	cacheKey, err := computeHTTPCacheKey(req.Method, req.URL.String(), body)
	if err != nil {
		req.Body = io.NopCloser(bytes.NewReader(body))
		return c.next.RoundTrip(req)
	}

	result, err, _ := c.group.Do(cacheKey, func() (any, error) {
		if cached := c.checkCache(cacheKey); cached != nil {
			return cached, nil
		}

		reqCopy := req.Clone(req.Context())
		reqCopy.Body = io.NopCloser(bytes.NewReader(body))

		resp, err := c.next.RoundTrip(reqCopy)
		if err != nil {
			return nil, err
		}

		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			serialized, serErr := serializeResponse(resp)
			if serErr == nil {
				c.writeCache(cacheKey, serialized)
				deserialized, desErr := deserializeResponse(serialized)
				if desErr == nil {
					return deserialized, nil
				}
			}
		}

		return resp, nil
	})

	if err != nil {
		return nil, err
	}
	return result.(*http.Response), nil
}

func serializeResponse(resp *http.Response) ([]byte, error) {
	return httputil.DumpResponse(resp, true)
}

func deserializeResponse(data []byte) (*http.Response, error) {
	buf := bufio.NewReader(bytes.NewReader(data))
	return http.ReadResponse(buf, nil)
}

func (c *CachingRoundTripper) checkCache(cacheKey string) *http.Response {
	var cached *http.Response
	c.db.View(func(txn *badger.Txn) error {
		item, err := txn.Get([]byte(cacheKey))
		if err != nil {
			return err
		}
		return item.Value(func(val []byte) error {
			resp, err := deserializeResponse(val)
			if err != nil {
				return err
			}
			cached = resp
			return nil
		})
	})
	return cached
}

func (c *CachingRoundTripper) writeCache(cacheKey string, data []byte) {
	c.db.Update(func(txn *badger.Txn) error {
		return txn.Set([]byte(cacheKey), data)
	})
}

type CachingHTTPClient struct {
	*http.Client
	transport *CachingRoundTripper
}

func NewCachingHTTPClient(cfg CacheConfig) (*CachingHTTPClient, error) {
	baseTransport := http.DefaultTransport

	cachingTransport, err := NewCachingRoundTripper(baseTransport, cfg)
	if err != nil {
		return nil, err
	}

	return &CachingHTTPClient{
		Client: &http.Client{
			Transport: cachingTransport,
		},
		transport: cachingTransport,
	}, nil
}

func (c *CachingHTTPClient) Close() error {
	if c.transport != nil {
		return c.transport.Close()
	}
	return nil
}

func (c *CachingHTTPClient) CacheDir() string {
	if c.transport != nil {
		return c.transport.CacheDir()
	}
	return ""
}
