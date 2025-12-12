package evals

import (
	"context"
	"fmt"
	"strings"

	"github.com/openai/openai-go/v3"
)

// Rubric defines an evaluation criterion with a name, description, and grader.
type Rubric struct {
	Name        string
	Description string
	Grader      Grader
}

// Score holds the result of evaluating output against a single rubric.
type Score struct {
	RubricName  string
	Passed      bool
	Value       int
	Reasoning   string
	GraderType  string
	GraderModel string
}

// Grader evaluates output against a rubric criterion.
type Grader interface {
	Grade(ctx context.Context, client *openai.Client, model string, rubric Rubric, output string) Score
}

// LLMGrader uses a language model to evaluate output.
type LLMGrader struct{}

// Grade evaluates the output using an LLM judge.
func (g LLMGrader) Grade(ctx context.Context, client *openai.Client, model string, rubric Rubric, output string) Score {
	score := Score{
		RubricName:  rubric.Name,
		GraderType:  "llm",
		GraderModel: model,
	}

	prompt := fmt.Sprintf(`You are an evaluation judge. Score the following output against this rubric.

Rubric: %s
Description: %s

Output to evaluate:
---
%s
---

Respond with ONLY "PASS" or "FAIL" on the first line, followed by a brief explanation on the next line.`, rubric.Name, rubric.Description, output)

	content, err := generateText(ctx, client, model, prompt)
	if err != nil {
		score.Reasoning = fmt.Sprintf("grader error: %v", err)
		return score
	}

	lines := strings.SplitN(content, "\n", 2)
	verdict := strings.TrimSpace(strings.ToUpper(lines[0]))
	score.Passed = verdict == "PASS"
	if score.Passed {
		score.Value = 1
	}

	if len(lines) > 1 {
		score.Reasoning = strings.TrimSpace(lines[1])
	}

	return score
}

// FuncGrader wraps a function to implement the Grader interface.
type FuncGrader func(output string) (passed bool, reason string)

// Grade evaluates the output using the wrapped function.
func (g FuncGrader) Grade(_ context.Context, _ *openai.Client, _ string, rubric Rubric, output string) Score {
	score := Score{
		RubricName: rubric.Name,
		GraderType: "func",
	}

	if g == nil {
		score.Reasoning = "no grader function provided"
		return score
	}

	passed, reasoning := g(output)
	score.Passed = passed
	if passed {
		score.Value = 1
	}
	score.Reasoning = reasoning

	return score
}
