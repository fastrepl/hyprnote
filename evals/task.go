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

// Grade evaluates output against all rubrics using the provided grader model.
func (t *Task) Grade(ctx context.Context, client *openai.Client, model, output string) []Score {
	scores := make([]Score, 0, len(t.Rubrics))
	for _, rubric := range t.Rubrics {
		s := rubric.Grader.Grade(ctx, client, model, rubric, output)
		scores = append(scores, s)
	}
	return scores
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
