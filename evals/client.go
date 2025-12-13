package evals

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"net/http"
	"time"

	"github.com/cenkalti/backoff/v5"
	"github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/option"
)

const (
	defaultTemperature    = 0.2
	defaultRetryInterval  = 500 * time.Millisecond
	defaultMaxElapsedTime = 30 * time.Second
	openRouterBaseURL     = "https://openrouter.ai/api/v1"
)

var ErrNoChoices = errors.New("no choices in response")

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

func newClient(apiKey string) *openai.Client {
	c := openai.NewClient(
		option.WithAPIKey(apiKey),
		option.WithBaseURL(openRouterBaseURL),
	)
	return &c
}

func generateText(ctx context.Context, client *openai.Client, model, prompt string) (string, error) {
	b := backoff.NewExponentialBackOff()
	b.InitialInterval = defaultRetryInterval

	result, err := backoff.Retry(ctx, func() (string, error) {
		resp, err := client.Chat.Completions.New(ctx, openai.ChatCompletionNewParams{
			Model: model,
			Messages: []openai.ChatCompletionMessageParamUnion{
				openai.UserMessage(prompt),
			},
			Temperature: openai.Float(defaultTemperature),
		})

		if err != nil {
			if !isRetryable(err) {
				return "", backoff.Permanent(err)
			}
			return "", err
		}

		if len(resp.Choices) == 0 {
			return "", backoff.Permanent(ErrNoChoices)
		}

		return resp.Choices[0].Message.Content, nil
	}, backoff.WithBackOff(b), backoff.WithMaxElapsedTime(defaultMaxElapsedTime))

	if err != nil {
		return "", fmt.Errorf("chat completion: %w", err)
	}

	return result, nil
}

func generateStructuredGraderResponse(ctx context.Context, client *openai.Client, model, prompt string) (GraderResponse, error) {
	b := backoff.NewExponentialBackOff()
	b.InitialInterval = defaultRetryInterval

	result, err := backoff.Retry(ctx, func() (GraderResponse, error) {
		resp, err := client.Chat.Completions.New(ctx, openai.ChatCompletionNewParams{
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

func generateTextMulti(ctx context.Context, client *openai.Client, model, prompt string, n int) ([]string, error) {
	if n <= 0 {
		n = 1
	}

	b := backoff.NewExponentialBackOff()
	b.InitialInterval = defaultRetryInterval

	result, err := backoff.Retry(ctx, func() ([]string, error) {
		resp, err := client.Chat.Completions.New(ctx, openai.ChatCompletionNewParams{
			Model: model,
			Messages: []openai.ChatCompletionMessageParamUnion{
				openai.UserMessage(prompt),
			},
			Temperature: openai.Float(defaultTemperature),
			N:           openai.Int(int64(n)),
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

		outputs := make([]string, len(resp.Choices))
		for i, choice := range resp.Choices {
			outputs[i] = choice.Message.Content
		}
		return outputs, nil
	}, backoff.WithBackOff(b), backoff.WithMaxElapsedTime(defaultMaxElapsedTime))

	if err != nil {
		return nil, fmt.Errorf("chat completion: %w", err)
	}

	return result, nil
}

func generateStructuredGraderResponseMulti(ctx context.Context, client *openai.Client, model, prompt string, n int) ([]GraderResponse, error) {
	if n <= 0 {
		n = 1
	}

	b := backoff.NewExponentialBackOff()
	b.InitialInterval = defaultRetryInterval

	result, err := backoff.Retry(ctx, func() ([]GraderResponse, error) {
		resp, err := client.Chat.Completions.New(ctx, openai.ChatCompletionNewParams{
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

type AggregatedGraderResponse struct {
	PassRate           float64
	Passed             bool
	Reasoning          string
	Samples            int
	StandardDeviation  float64
	Variance           float64
	ConfidenceInterval ConfidenceInterval
	PassCount          int
	FailCount          int
}

func calculateBinaryStatistics(passCount, totalCount int) (stdDev, variance float64) {
	if totalCount == 0 {
		return 0, 0
	}

	p := float64(passCount) / float64(totalCount)
	variance = p * (1 - p)
	stdDev = math.Sqrt(variance)
	return stdDev, variance
}

func calculateWilsonConfidenceInterval(passCount, totalCount int, confidenceLevel float64) (lower, upper float64) {
	if totalCount == 0 {
		return 0, 0
	}

	z := 1.96
	if confidenceLevel == 0.99 {
		z = 2.576
	}

	p := float64(passCount) / float64(totalCount)
	n := float64(totalCount)

	denominator := 1 + z*z/n
	center := (p + z*z/(2*n)) / denominator
	margin := (z * math.Sqrt(p*(1-p)/n+z*z/(4*n*n))) / denominator

	lower = center - margin
	upper = center + margin

	if lower < 0 {
		lower = 0
	}
	if upper > 1 {
		upper = 1
	}

	return lower, upper
}

func aggregateGraderResponses(responses []GraderResponse) AggregatedGraderResponse {
	if len(responses) == 0 {
		return AggregatedGraderResponse{}
	}

	passCount := 0
	var reasonings []string
	for _, r := range responses {
		if r.Verdict == "PASS" {
			passCount++
		}
		reasonings = append(reasonings, r.Reasoning)
	}

	totalCount := len(responses)
	failCount := totalCount - passCount
	passRate := float64(passCount) / float64(totalCount)

	stdDev, variance := calculateBinaryStatistics(passCount, totalCount)
	ciLower, ciUpper := calculateWilsonConfidenceInterval(passCount, totalCount, 0.95)

	return AggregatedGraderResponse{
		PassRate:          passRate,
		Passed:            passRate >= 0.5,
		Reasoning:         reasonings[0],
		Samples:           totalCount,
		StandardDeviation: stdDev,
		Variance:          variance,
		ConfidenceInterval: ConfidenceInterval{
			Lower: ciLower,
			Upper: ciUpper,
			Level: 0.95,
		},
		PassCount: passCount,
		FailCount: failCount,
	}
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
