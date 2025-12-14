package evals

import (
	"context"
	"embed"
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strings"

	"github.com/nikolalohinski/gonja/v2"
	"github.com/nikolalohinski/gonja/v2/exec"
	"github.com/nikolalohinski/gonja/v2/loaders"
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

	var loader loaders.Loader
	if strings.HasPrefix(t.TemplatePath, cratesTemplatePrefix) {
		cratesDir := getCratesTemplateDir()
		if cratesDir != "" {
			fsLoader, err := loaders.NewFileSystemLoader(cratesDir)
			if err != nil {
				return "", fmt.Errorf("jinja2: loader: %w", err)
			}
			loader, err = loaders.NewShiftedLoader("/template", strings.NewReader(string(content)), fsLoader)
			if err != nil {
				return "", fmt.Errorf("jinja2: shifted loader: %w", err)
			}
		}
	}

	if loader == nil {
		loader, err = loaders.NewMemoryLoader(map[string]string{"/template": string(content)})
		if err != nil {
			return "", fmt.Errorf("jinja2: memory loader: %w", err)
		}
	}

	template, err := exec.NewTemplate("/template", gonja.DefaultConfig, loader, gonja.DefaultEnvironment)
	if err != nil {
		return "", fmt.Errorf("jinja2: parse: %w", err)
	}

	var data map[string]any
	if t.Inputs != nil {
		data = t.Inputs.ToMap()
	}

	out, err := template.ExecuteToString(exec.NewContext(data))
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
	return t.GradeWithProgress(ctx, client, model, output, nil)
}

// GradeWithProgress evaluates output against all rubrics with progress callback.
func (t *Task) GradeWithProgress(ctx context.Context, client ChatCompleter, model, output string, onEvaluation func()) []Score {
	scores := make([]Score, 0, len(t.Rubrics))
	var inputMap map[string]any
	if t.Inputs != nil {
		inputMap = t.Inputs.ToMap()
	}
	for _, rubric := range t.Rubrics {
		var s Score
		if graderWithProgress, ok := rubric.Grader.(GraderWithProgress); ok {
			s = graderWithProgress.GradeWithProgress(ctx, client, model, rubric, output, onEvaluation)
		} else if graderWithInputs, ok := rubric.Grader.(GraderWithInputs); ok {
			s = graderWithInputs.GradeWithInputs(ctx, client, model, rubric, output, inputMap)
			if onEvaluation != nil {
				onEvaluation()
			}
		} else {
			s = rubric.Grader.Grade(ctx, client, model, rubric, output)
			if onEvaluation != nil {
				onEvaluation()
			}
		}
		scores = append(scores, s)
	}
	return scores
}

// GradeMulti evaluates multiple outputs against all rubrics and aggregates the results.
// For each rubric, it calculates the mean pass rate across all outputs.
func (t *Task) GradeMulti(ctx context.Context, client ChatCompleter, model string, outputs []string) []Score {
	return t.GradeMultiWithProgress(ctx, client, model, outputs, nil)
}

// GradeMultiWithProgress evaluates multiple outputs against all rubrics with progress callback.
func (t *Task) GradeMultiWithProgress(ctx context.Context, client ChatCompleter, model string, outputs []string, onEvaluation func()) []Score {
	if len(outputs) == 0 {
		return nil
	}

	if len(outputs) == 1 {
		return t.GradeWithProgress(ctx, client, model, outputs[0], onEvaluation)
	}

	allScores := make([][]Score, len(outputs))
	for i, output := range outputs {
		allScores[i] = t.GradeWithProgress(ctx, client, model, output, onEvaluation)
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
