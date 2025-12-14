package evals

import (
	"context"
	"embed"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/kluctl/kluctl/lib/go-jinja2"
)

//go:embed templates/*.jinja
var templatesFS embed.FS

const cratesTemplatePrefix = "crates_templates/"

// getCratesTemplateDir returns the path to crates/template/assets directory.
func getCratesTemplateDir() string {
	_, currentFile, _, ok := runtime.Caller(0)
	if !ok {
		return ""
	}
	evalsDir := filepath.Dir(currentFile)
	return filepath.Join(evalsDir, "..", "crates", "template", "assets")
}

// Inputs defines the interface for typed task input variables.
type Inputs interface {
	ToMap() map[string]any
}

// Task represents an evaluation task with a prompt template and rubrics.
type Task struct {
	Name         string
	TemplatePath string
	Inputs       Inputs
	Rubrics      []Rubric
	Samples      int
}

// readTemplate reads a template from either the embedded filesystem or the crates templates directory.
func readTemplate(templatePath string) ([]byte, error) {
	if strings.HasPrefix(templatePath, cratesTemplatePrefix) {
		templateName := strings.TrimPrefix(templatePath, cratesTemplatePrefix)
		cratesDir := getCratesTemplateDir()
		if cratesDir == "" {
			return nil, fmt.Errorf("could not determine crates template directory")
		}
		fullPath := filepath.Join(cratesDir, templateName)
		return os.ReadFile(fullPath)
	}
	return templatesFS.ReadFile(templatePath)
}

// RenderPrompt renders the task's Jinja template with inputs.
func (t *Task) RenderPrompt() (string, error) {
	content, err := readTemplate(t.TemplatePath)
	if err != nil {
		return "", fmt.Errorf("read template %s: %w", t.TemplatePath, err)
	}

	var jinja2Opts []jinja2.Jinja2Opt
	if strings.HasPrefix(t.TemplatePath, cratesTemplatePrefix) {
		cratesDir := getCratesTemplateDir()
		if cratesDir != "" {
			jinja2Opts = append(jinja2Opts, jinja2.WithSearchDir(cratesDir))
		}
	}

	r, err := jinja2.NewJinja2("", 1, jinja2Opts...)
	if err != nil {
		return "", fmt.Errorf("jinja2: init: %w", err)
	}
	defer r.Close()

	var globals map[string]any
	if t.Inputs != nil {
		globals = t.Inputs.ToMap()
	}
	out, err := r.RenderString(string(content), jinja2.WithGlobals(globals))
	if err != nil {
		return "", fmt.Errorf("jinja2: render: %w", err)
	}
	return out, nil
}

// Execute renders the prompt and sends it to the model.
func (t *Task) Execute(ctx context.Context, client ChatCompleter, model string) (string, error) {
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
func (t *Task) ExecuteMulti(ctx context.Context, client ChatCompleter, model string) ([]string, error) {
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
func (t *Task) Grade(ctx context.Context, client ChatCompleter, model, output string) []Score {
	scores := make([]Score, 0, len(t.Rubrics))
	var inputMap map[string]any
	if t.Inputs != nil {
		inputMap = t.Inputs.ToMap()
	}
	for _, rubric := range t.Rubrics {
		var s Score
		if graderWithInputs, ok := rubric.Grader.(GraderWithInputs); ok {
			s = graderWithInputs.GradeWithInputs(ctx, client, model, rubric, output, inputMap)
		} else {
			s = rubric.Grader.Grade(ctx, client, model, rubric, output)
		}
		scores = append(scores, s)
	}
	return scores
}

// GradeMulti evaluates multiple outputs against all rubrics and aggregates the results.
// For each rubric, it calculates the mean pass rate across all outputs.
func (t *Task) GradeMulti(ctx context.Context, client ChatCompleter, model string, outputs []string) []Score {
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

		totalCount := len(outputs)
		failCount := totalCount - passCount
		passRate := float64(passCount) / float64(totalCount)

		stdDev, variance := calculateBinaryStatistics(passCount, totalCount)
		ciLower, ciUpper := calculateWilsonConfidenceInterval(passCount, totalCount, 0.95)

		aggregated[rubricIdx] = Score{
			RubricName:        t.Rubrics[rubricIdx].Name,
			Passed:            passRate >= 0.5,
			Value:             0,
			Reasoning:         firstReasoning,
			GraderType:        graderType,
			GraderModel:       graderModel,
			PassRate:          passRate,
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
		if aggregated[rubricIdx].Passed {
			aggregated[rubricIdx].Value = 1
		}
	}

	return aggregated
}

// NewTask creates a task with the given name, inputs, and rubrics.
// The template is loaded from the embedded templates directory (evals/templates/).
func NewTask(name string, inputs Inputs, rubrics []Rubric) Task {
	return Task{
		Name:         name,
		TemplatePath: filepath.Join("templates", name+".jinja"),
		Inputs:       inputs,
		Rubrics:      rubrics,
	}
}

// NewTaskWithCratesTemplate creates a task that uses a template from crates/template/assets.
// The templateName should be the filename without the .jinja extension (e.g., "enhance.system").
func NewTaskWithCratesTemplate(name, templateName string, inputs Inputs, rubrics []Rubric) Task {
	return Task{
		Name:         name,
		TemplatePath: cratesTemplatePrefix + templateName + ".jinja",
		Inputs:       inputs,
		Rubrics:      rubrics,
	}
}
