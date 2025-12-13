package evals_test

import (
	"strings"
	"testing"

	"hyprnote/evals"
	"hyprnote/evals/tasks"
)

func TestEvals(t *testing.T) {
	evals.RunTest(t, tasks.All)
}

func TestCratesTemplateAccess(t *testing.T) {
	task := evals.NewTaskWithCratesTemplate(
		"test_crates_template",
		"postprocess_transcript.system",
		nil,
		nil,
	)

	prompt, err := task.RenderPrompt()
	if err != nil {
		t.Fatalf("failed to render crates template: %v", err)
	}

	if !strings.Contains(prompt, "postprocess the transcript") {
		t.Errorf("expected prompt to contain 'postprocess the transcript', got: %s", prompt)
	}
}
