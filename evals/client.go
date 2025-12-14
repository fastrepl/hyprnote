package evals

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/cenkalti/backoff/v5"
	"github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/option"
)

const (
	openRouterBaseURL     = "https://openrouter.ai/api/v1"
	defaultTemperature    = 0.2
	defaultRetryInterval  = 500 * time.Millisecond
	defaultMaxElapsedTime = 30 * time.Second
)

// ErrNoChoices is returned when the API response contains no choices.
var ErrNoChoices = errors.New("no choices in response")

// Usage holds token usage and cost information from an API call.
type Usage struct {
	PromptTokens     int64   `json:"prompt_tokens"`
	CompletionTokens int64   `json:"completion_tokens"`
	TotalTokens      int64   `json:"total_tokens"`
	Cost             float64 `json:"cost"`
}

// Add adds another Usage to this one.
func (u *Usage) Add(other Usage) {
	u.PromptTokens += other.PromptTokens
	u.CompletionTokens += other.CompletionTokens
	u.TotalTokens += other.TotalTokens
	u.Cost += other.Cost
}

// GenerationResponse represents the response from the OpenRouter generation API.
type GenerationResponse struct {
	Data struct {
		NativeTokensPrompt     int64   `json:"native_tokens_prompt"`
		NativeTokensCompletion int64   `json:"native_tokens_completion"`
		TotalCost              float64 `json:"total_cost"`
	} `json:"data"`
}

// ChatCompleter is the interface for chat completion clients.
type ChatCompleter interface {
	CreateChatCompletion(ctx context.Context, params openai.ChatCompletionNewParams) (*openai.ChatCompletion, error)
}

// UsageResolver is the interface for fetching usage information from generation IDs.
type UsageResolver interface {
	GetGenerationUsage(ctx context.Context, generationID string) (Usage, error)
}

// OpenRouterClient wraps the OpenAI client configured for OpenRouter.
type OpenRouterClient struct {
	api        *openai.Client
	apiKey     string
	httpClient *http.Client
}

// NewOpenRouterClient creates a new OpenRouter client with the given API key.
func NewOpenRouterClient(apiKey string) *OpenRouterClient {
	c := openai.NewClient(
		option.WithAPIKey(apiKey),
		option.WithBaseURL(openRouterBaseURL),
	)
	return &OpenRouterClient{
		api:        &c,
		apiKey:     apiKey,
		httpClient: &http.Client{Timeout: 30 * time.Second},
	}
}

// CreateChatCompletion sends a chat completion request to OpenRouter.
func (c *OpenRouterClient) CreateChatCompletion(ctx context.Context, params openai.ChatCompletionNewParams) (*openai.ChatCompletion, error) {
	return c.api.Chat.Completions.New(ctx, params)
}

// GetGenerationUsage fetches usage information for a generation from the OpenRouter API.
func (c *OpenRouterClient) GetGenerationUsage(ctx context.Context, generationID string) (Usage, error) {
	url := fmt.Sprintf("%s/generation?id=%s", openRouterBaseURL, generationID)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return Usage{}, fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return Usage{}, fmt.Errorf("do request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return Usage{}, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var genResp GenerationResponse
	if err := json.NewDecoder(resp.Body).Decode(&genResp); err != nil {
		return Usage{}, fmt.Errorf("decode response: %w", err)
	}

	return Usage{
		PromptTokens:     genResp.Data.NativeTokensPrompt,
		CompletionTokens: genResp.Data.NativeTokensCompletion,
		TotalTokens:      genResp.Data.NativeTokensPrompt + genResp.Data.NativeTokensCompletion,
		Cost:             genResp.Data.TotalCost,
	}, nil
}

// GraderResponse represents the structured response from an LLM grader.
type GraderResponse struct {
	Verdict   string `json:"verdict"`
	Reasoning string `json:"reasoning"`
}

var graderResponseSchema = map[string]any{
	"type": "object",
	"properties": map[string]any{
		"verdict": map[string]any{
			"type":        "string",
			"enum":        []string{"PASS", "FAIL"},
			"description": "Whether the output passes or fails the rubric criterion",
		},
		"reasoning": map[string]any{
			"type":        "string",
			"description": "Brief explanation for the verdict",
		},
	},
	"required":             []string{"verdict", "reasoning"},
	"additionalProperties": false,
}

type textResult struct {
	content      string
	generationID string
}

func generateTextWithGenerationID(ctx context.Context, client ChatCompleter, model, prompt string) (string, string, error) {
	b := backoff.NewExponentialBackOff()
	b.InitialInterval = defaultRetryInterval

	result, err := backoff.Retry(ctx, func() (textResult, error) {
		resp, err := client.CreateChatCompletion(ctx, openai.ChatCompletionNewParams{
			Model: model,
			Messages: []openai.ChatCompletionMessageParamUnion{
				openai.UserMessage(prompt),
			},
			Temperature: openai.Float(defaultTemperature),
		})

		if err != nil {
			if !isRetryable(err) {
				return textResult{}, backoff.Permanent(err)
			}
			return textResult{}, err
		}

		if len(resp.Choices) == 0 {
			return textResult{}, backoff.Permanent(ErrNoChoices)
		}

		return textResult{
			content:      resp.Choices[0].Message.Content,
			generationID: resp.ID,
		}, nil
	}, backoff.WithBackOff(b), backoff.WithMaxElapsedTime(defaultMaxElapsedTime))

	if err != nil {
		return "", "", fmt.Errorf("chat completion: %w", err)
	}

	return result.content, result.generationID, nil
}

func generateStructuredGraderResponse(ctx context.Context, client ChatCompleter, model, prompt string) (GraderResponse, error) {
	b := backoff.NewExponentialBackOff()
	b.InitialInterval = defaultRetryInterval

	result, err := backoff.Retry(ctx, func() (GraderResponse, error) {
		resp, err := client.CreateChatCompletion(ctx, openai.ChatCompletionNewParams{
			Model: model,
			Messages: []openai.ChatCompletionMessageParamUnion{
				openai.UserMessage(prompt),
			},
			Temperature: openai.Float(defaultTemperature),
			ResponseFormat: openai.ChatCompletionNewParamsResponseFormatUnion{
				OfJSONSchema: &openai.ResponseFormatJSONSchemaParam{
					JSONSchema: openai.ResponseFormatJSONSchemaJSONSchemaParam{
						Name:   "grader_response",
						Schema: graderResponseSchema,
						Strict: openai.Bool(true),
					},
				},
			},
		})

		if err != nil {
			if !isRetryable(err) {
				return GraderResponse{}, backoff.Permanent(err)
			}
			return GraderResponse{}, err
		}

		if len(resp.Choices) == 0 {
			return GraderResponse{}, backoff.Permanent(ErrNoChoices)
		}

		var graderResp GraderResponse
		if err := json.Unmarshal([]byte(resp.Choices[0].Message.Content), &graderResp); err != nil {
			return GraderResponse{}, backoff.Permanent(fmt.Errorf("unmarshal grader response: %w", err))
		}

		return graderResp, nil
	}, backoff.WithBackOff(b), backoff.WithMaxElapsedTime(defaultMaxElapsedTime))

	if err != nil {
		return GraderResponse{}, fmt.Errorf("structured chat completion: %w", err)
	}

	return result, nil
}

type textMultiResult struct {
	outputs      []string
	generationID string
}

func generateTextMultiWithGenerationID(ctx context.Context, client ChatCompleter, model, prompt string, n int) ([]string, string, error) {
	if n <= 0 {
		n = 1
	}

	b := backoff.NewExponentialBackOff()
	b.InitialInterval = defaultRetryInterval

	result, err := backoff.Retry(ctx, func() (textMultiResult, error) {
		resp, err := client.CreateChatCompletion(ctx, openai.ChatCompletionNewParams{
			Model: model,
			Messages: []openai.ChatCompletionMessageParamUnion{
				openai.UserMessage(prompt),
			},
			Temperature: openai.Float(defaultTemperature),
			N:           openai.Int(int64(n)),
		})

		if err != nil {
			if !isRetryable(err) {
				return textMultiResult{}, backoff.Permanent(err)
			}
			return textMultiResult{}, err
		}

		if len(resp.Choices) == 0 {
			return textMultiResult{}, backoff.Permanent(ErrNoChoices)
		}

		outputs := make([]string, len(resp.Choices))
		for i, choice := range resp.Choices {
			outputs[i] = choice.Message.Content
		}
		return textMultiResult{
			outputs:      outputs,
			generationID: resp.ID,
		}, nil
	}, backoff.WithBackOff(b), backoff.WithMaxElapsedTime(defaultMaxElapsedTime))

	if err != nil {
		return nil, "", fmt.Errorf("chat completion: %w", err)
	}

	return result.outputs, result.generationID, nil
}

func generateStructuredGraderResponseMulti(ctx context.Context, client ChatCompleter, model, prompt string, n int) ([]GraderResponse, error) {
	if n <= 0 {
		n = 1
	}

	b := backoff.NewExponentialBackOff()
	b.InitialInterval = defaultRetryInterval

	result, err := backoff.Retry(ctx, func() ([]GraderResponse, error) {
		resp, err := client.CreateChatCompletion(ctx, openai.ChatCompletionNewParams{
			Model: model,
			Messages: []openai.ChatCompletionMessageParamUnion{
				openai.UserMessage(prompt),
			},
			Temperature: openai.Float(defaultTemperature),
			N:           openai.Int(int64(n)),
			ResponseFormat: openai.ChatCompletionNewParamsResponseFormatUnion{
				OfJSONSchema: &openai.ResponseFormatJSONSchemaParam{
					JSONSchema: openai.ResponseFormatJSONSchemaJSONSchemaParam{
						Name:   "grader_response",
						Schema: graderResponseSchema,
						Strict: openai.Bool(true),
					},
				},
			},
		})

		if err != nil {
			if !isRetryable(err) {
				return nil, backoff.Permanent(err)
			}
			return nil, err
		}

		if len(resp.Choices) == 0 {
			return nil, backoff.Permanent(ErrNoChoices)
		}

		responses := make([]GraderResponse, len(resp.Choices))
		for i, choice := range resp.Choices {
			var graderResp GraderResponse
			if err := json.Unmarshal([]byte(choice.Message.Content), &graderResp); err != nil {
				return nil, backoff.Permanent(fmt.Errorf("unmarshal grader response %d: %w", i, err))
			}
			responses[i] = graderResp
		}

		return responses, nil
	}, backoff.WithBackOff(b), backoff.WithMaxElapsedTime(defaultMaxElapsedTime))

	if err != nil {
		return nil, fmt.Errorf("structured chat completion: %w", err)
	}

	return result, nil
}

func isRetryable(err error) bool {
	if err == nil {
		return false
	}

	var apiErr *openai.Error
	if errors.As(err, &apiErr) {
		switch apiErr.StatusCode {
		case http.StatusTooManyRequests,
			http.StatusInternalServerError,
			http.StatusBadGateway,
			http.StatusServiceUnavailable,
			http.StatusGatewayTimeout:
			return true
		}
	}

	return false
}
