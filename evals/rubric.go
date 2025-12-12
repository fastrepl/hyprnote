package evals

import (
	"context"
	"fmt"

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
	PassRate    float64
	Samples     int
}

// Grader evaluates output against a rubric criterion.
type Grader interface {
	Grade(ctx context.Context, client *openai.Client, model string, rubric Rubric, output string) Score
}

// LLMGrader uses a language model to evaluate output.
// Set Samples > 1 to run multiple grading samples and aggregate results for better stability.
type LLMGrader struct {
	Samples int
}

// Grade evaluates the output using an LLM judge with structured output.
// When Samples > 1, it generates multiple grading responses and aggregates them using mean pass rate.
func (g LLMGrader) Grade(ctx context.Context, client *openai.Client, model string, rubric Rubric, output string) Score {
	score := Score{
		RubricName:  rubric.Name,
		GraderType:  "llm",
		GraderModel: model,
		Samples:     1,
	}

	prompt := fmt.Sprintf(`You are an evaluation judge. Score the following output against this rubric.

Rubric: %s
Description: %s

Output to evaluate:
---
%s
---`, rubric.Name, rubric.Description, output)

	n := g.Samples
	if n <= 1 {
		graderResp, err := generateStructuredGraderResponse(ctx, client, model, prompt)
		if err != nil {
			score.Reasoning = fmt.Sprintf("grader error: %v", err)
			return score
		}

		score.Passed = graderResp.Verdict == "PASS"
		if score.Passed {
			score.Value = 1
		}
		score.Reasoning = graderResp.Reasoning
		score.PassRate = 1.0
		if !score.Passed {
			score.PassRate = 0.0
		}
		return score
	}

	responses, err := generateStructuredGraderResponseMulti(ctx, client, model, prompt, n)
	if err != nil {
		score.Reasoning = fmt.Sprintf("grader error: %v", err)
		return score
	}

	agg := aggregateGraderResponses(responses)
	score.Passed = agg.Passed
	if score.Passed {
		score.Value = 1
	}
	score.Reasoning = agg.Reasoning
	score.PassRate = agg.PassRate
	score.Samples = agg.Samples

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
