package evals

import (
	"context"
	"fmt"
	"os"

	"github.com/openai/openai-go/v3"
	"github.com/openai/openai-go/v3/option"
)

func NewClient() openai.Client {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	return openai.NewClient(
		option.WithAPIKey(apiKey),
		option.WithBaseURL("https://openrouter.ai/api/v1"),
	)
}

func Model() string {
	if v := os.Getenv("OPENROUTER_MODEL"); v != "" {
		return v
	}
	return "openai/gpt-4o-mini"
}

func GenerateText(ctx context.Context, client openai.Client, model string, prompt string) (string, error) {
	resp, err := client.Chat.Completions.New(ctx, openai.ChatCompletionNewParams{
		Model: model,
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.UserMessage(prompt),
		},
		Temperature: openai.Float(0.2),
	})
	if err != nil {
		return "", fmt.Errorf("chat completion: %w", err)
	}
	if len(resp.Choices) == 0 {
		return "", fmt.Errorf("chat completion: no choices")
	}
	return resp.Choices[0].Message.Content, nil
}
