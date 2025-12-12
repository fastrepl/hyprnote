package evals

import (
	"context"
	"fmt"
	"strings"

	"github.com/openai/openai-go/v3"
)

type GraderType string

const (
	GraderLLM    GraderType = "llm"
	GraderParser GraderType = "parser"
)

type Rubric struct {
	Name        string
	Description string
	Grader      GraderType
	GraderFunc  func(output string) (bool, string)
}

type RubricResult struct {
	RubricName  string
	Passed      bool
	Score       int
	Reasoning   string
	GraderType  GraderType
	GraderModel string
}

type GraderConfig struct {
	Client openai.Client
	Model  string
}

func GradeLLM(ctx context.Context, cfg GraderConfig, rubric Rubric, output string) RubricResult {
	prompt := fmt.Sprintf(`You are an evaluation judge. Score the following output against this rubric.

Rubric: %s
Description: %s

Output to evaluate:
---
%s
---

Respond with ONLY "PASS" or "FAIL" on the first line, followed by a brief explanation on the next line.`, rubric.Name, rubric.Description, output)

	resp, err := cfg.Client.Chat.Completions.New(ctx, openai.ChatCompletionNewParams{
		Model: cfg.Model,
		Messages: []openai.ChatCompletionMessageParamUnion{
			openai.UserMessage(prompt),
		},
		Temperature: openai.Float(0.0),
	})

	result := RubricResult{
		RubricName:  rubric.Name,
		GraderType:  GraderLLM,
		GraderModel: cfg.Model,
	}

	if err != nil {
		result.Passed = false
		result.Score = 0
		result.Reasoning = fmt.Sprintf("grader error: %v", err)
		return result
	}

	if len(resp.Choices) == 0 {
		result.Passed = false
		result.Score = 0
		result.Reasoning = "grader returned no choices"
		return result
	}

	content := resp.Choices[0].Message.Content
	lines := strings.SplitN(content, "\n", 2)

	verdict := strings.TrimSpace(strings.ToUpper(lines[0]))
	result.Passed = verdict == "PASS"
	if result.Passed {
		result.Score = 1
	}

	if len(lines) > 1 {
		result.Reasoning = strings.TrimSpace(lines[1])
	}

	return result
}

func GradeParser(rubric Rubric, output string) RubricResult {
	result := RubricResult{
		RubricName: rubric.Name,
		GraderType: GraderParser,
	}

	if rubric.GraderFunc == nil {
		result.Passed = false
		result.Reasoning = "no grader function provided"
		return result
	}

	passed, reasoning := rubric.GraderFunc(output)
	result.Passed = passed
	if passed {
		result.Score = 1
	}
	result.Reasoning = reasoning

	return result
}

func HasMarkdownHeading(output string) (bool, string) {
	shape, ok := ParseMarkdownShape(output)
	if !ok {
		return false, "failed to parse as markdown"
	}
	if shape.HasHeading {
		return true, "contains heading"
	}
	return false, "missing heading"
}

func HasMarkdownList(output string) (bool, string) {
	shape, ok := ParseMarkdownShape(output)
	if !ok {
		return false, "failed to parse as markdown"
	}
	if shape.HasList {
		return true, "contains list"
	}
	return false, "missing list"
}

func HasMarkdownCode(output string) (bool, string) {
	shape, ok := ParseMarkdownShape(output)
	if !ok {
		return false, "failed to parse as markdown"
	}
	if shape.HasCode {
		return true, "contains code block"
	}
	return false, "missing code block"
}

func IsNonEmpty(output string) (bool, string) {
	if strings.TrimSpace(output) == "" {
		return false, "output is empty"
	}
	return true, "output is non-empty"
}
