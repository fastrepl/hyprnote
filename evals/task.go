package evals

import (
	"context"
	"embed"
	"fmt"
	"path/filepath"

	"github.com/kluctl/kluctl/lib/go-jinja2"
	"github.com/openai/openai-go/v3"
)

//go:embed templates/*.jinja
var templatesFS embed.FS

// Task represents an evaluation task with a prompt template and rubrics.
type Task struct {
	Name         string
	TemplatePath string
	Inputs       map[string]any
	Rubrics      []Rubric
	Samples      int
}

// RenderPrompt renders the task's Jinja template with inputs.
func (t *Task) RenderPrompt() (string, error) {
	content, err := templatesFS.ReadFile(t.TemplatePath)
	if err != nil {
		return "", fmt.Errorf("read template %s: %w", t.TemplatePath, err)
	}

	r, err := jinja2.NewJinja2("", 1)
	if err != nil {
		return "", fmt.Errorf("jinja2: init: %w", err)
	}
	defer r.Close()

	out, err := r.RenderString(string(content), jinja2.WithGlobals(t.Inputs))
	if err != nil {
		return "", fmt.Errorf("jinja2: render: %w", err)
	}
	return out, nil
}

// Execute renders the prompt and sends it to the model.
func (t *Task) Execute(ctx context.Context, client *openai.Client, model string) (string, error) {
	prompt, err := t.RenderPrompt()
	if err != nil {
		return "", err
	}
	output, err := generateText(ctx, client, model, prompt)
	if err != nil {
		return "", fmt.Errorf("execute task %s: %w", t.Name, err)
	}
	return output, nil
}

// ExecuteMulti renders the prompt and generates multiple outputs using the n parameter.
// Returns multiple outputs for evaluation with aggregation.
func (t *Task) ExecuteMulti(ctx context.Context, client *openai.Client, model string) ([]string, error) {
	prompt, err := t.RenderPrompt()
	if err != nil {
		return nil, err
	}

	n := t.Samples
	if n <= 1 {
		output, err := generateText(ctx, client, model, prompt)
		if err != nil {
			return nil, fmt.Errorf("execute task %s: %w", t.Name, err)
		}
		return []string{output}, nil
	}

	outputs, err := generateTextMulti(ctx, client, model, prompt, n)
	if err != nil {
		return nil, fmt.Errorf("execute task %s: %w", t.Name, err)
	}
	return outputs, nil
}

// Grade evaluates output against all rubrics using the provided grader model.
func (t *Task) Grade(ctx context.Context, client *openai.Client, model, output string) []Score {
	scores := make([]Score, 0, len(t.Rubrics))
	for _, rubric := range t.Rubrics {
		var s Score
		if graderWithInputs, ok := rubric.Grader.(GraderWithInputs); ok {
			s = graderWithInputs.GradeWithInputs(ctx, client, model, rubric, output, t.Inputs)
		} else {
			s = rubric.Grader.Grade(ctx, client, model, rubric, output)
		}
		scores = append(scores, s)
	}
	return scores
}

// GradeMulti evaluates multiple outputs against all rubrics and aggregates the results.
// For each rubric, it calculates the mean pass rate across all outputs.
func (t *Task) GradeMulti(ctx context.Context, client *openai.Client, model string, outputs []string) []Score {
	if len(outputs) == 0 {
		return nil
	}

	if len(outputs) == 1 {
		return t.Grade(ctx, client, model, outputs[0])
	}

	allScores := make([][]Score, len(outputs))
	for i, output := range outputs {
		allScores[i] = t.Grade(ctx, client, model, output)
	}

	aggregated := make([]Score, len(t.Rubrics))
	for rubricIdx := range t.Rubrics {
		passCount := 0
		var firstReasoning string
		var graderType, graderModel string

		for outputIdx := range outputs {
			if rubricIdx < len(allScores[outputIdx]) {
				s := allScores[outputIdx][rubricIdx]
				if s.Passed {
					passCount++
				}
				if outputIdx == 0 {
					firstReasoning = s.Reasoning
					graderType = s.GraderType
					graderModel = s.GraderModel
				}
			}
		}

		passRate := float64(passCount) / float64(len(outputs))
		aggregated[rubricIdx] = Score{
			RubricName:  t.Rubrics[rubricIdx].Name,
			Passed:      passRate >= 0.5,
			Value:       0,
			Reasoning:   firstReasoning,
			GraderType:  graderType,
			GraderModel: graderModel,
			PassRate:    passRate,
			Samples:     len(outputs),
		}
		if aggregated[rubricIdx].Passed {
			aggregated[rubricIdx].Value = 1
		}
	}

	return aggregated
}

// NewTask creates a task with the given name, inputs, and rubrics.
func NewTask(name string, inputs map[string]any, rubrics []Rubric) Task {
	return Task{
		Name:         name,
		TemplatePath: filepath.Join("templates", name+".jinja"),
		Inputs:       inputs,
		Rubrics:      rubrics,
	}
}
