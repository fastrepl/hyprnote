package evals

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"time"

	"github.com/cenkalti/backoff/v5"
	"github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/option"
)

const (
	defaultTemperature     = 0.2
	defaultRetryInterval   = 500 * time.Millisecond
	defaultMaxElapsedTime  = 30 * time.Second
	openRouterBaseURL      = "https://openrouter.ai/api/v1"
	openRouterAPIKeyEnvVar = "OPENROUTER_API_KEY"
)

var ErrNoChoices = errors.New("no choices in response")

func newClient() *openai.Client {
	c := openai.NewClient(
		option.WithAPIKey(os.Getenv(openRouterAPIKeyEnvVar)),
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
