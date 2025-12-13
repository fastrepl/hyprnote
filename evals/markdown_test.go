package evals

import (
	"context"
	"testing"
)

func TestHasHeaderStructure(t *testing.T) {
	tests := []struct {
		name     string
		output   string
		inputs   map[string]any
		wantPass bool
		wantMsg  string
	}{
		{
			name:     "missing headers input",
			output:   "## A\n\n## B",
			inputs:   map[string]any{},
			wantPass: false,
			wantMsg:  ErrInvalidHeadersInput.Error(),
		},
		{
			name:   "invalid headers type",
			output: "## A\n\n## B",
			inputs: map[string]any{
				"headers": "invalid",
			},
			wantPass: false,
			wantMsg:  ErrInvalidHeadersInput.Error(),
		},
		{
			name:   "exact match",
			output: "## A\n\nSomething\n\n## B\n\nSomething\n\n## C\n\nSomething",
			inputs: map[string]any{
				"headers": []HeaderSpec{
					{H: 2, Text: "A"},
					{H: 2, Text: "B"},
					{H: 2, Text: "C"},
				},
			},
			wantPass: true,
			wantMsg:  "header structure matches",
		},
		{
			name:   "wrong number of headers",
			output: "## A\n\n## B",
			inputs: map[string]any{
				"headers": []HeaderSpec{
					{H: 2, Text: "A"},
					{H: 2, Text: "B"},
					{H: 2, Text: "C"},
				},
			},
			wantPass: false,
			wantMsg:  "expected 3 headers, got 2",
		},
		{
			name:   "wrong header level",
			output: "# A\n\n## B\n\n## C",
			inputs: map[string]any{
				"headers": []HeaderSpec{
					{H: 2, Text: "A"},
					{H: 2, Text: "B"},
					{H: 2, Text: "C"},
				},
			},
			wantPass: false,
			wantMsg:  "header 1: expected level 2, got 1",
		},
		{
			name:   "wrong header text",
			output: "## X\n\n## B\n\n## C",
			inputs: map[string]any{
				"headers": []HeaderSpec{
					{H: 2, Text: "A"},
					{H: 2, Text: "B"},
					{H: 2, Text: "C"},
				},
			},
			wantPass: false,
			wantMsg:  `header 1: expected text "A", got "X"`,
		},
		{
			name:   "empty output",
			output: "",
			inputs: map[string]any{
				"headers": []HeaderSpec{
					{H: 2, Text: "A"},
				},
			},
			wantPass: false,
			wantMsg:  ErrEmptyInput.Error(),
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			passed, msg := HasHeaderStructure(tt.output, tt.inputs)
			if passed != tt.wantPass {
				t.Errorf("HasHeaderStructure() passed = %v, want %v", passed, tt.wantPass)
			}
			if msg != tt.wantMsg {
				t.Errorf("HasHeaderStructure() msg = %q, want %q", msg, tt.wantMsg)
			}
		})
	}
}

func TestHeaderStructureGrader(t *testing.T) {
	rubric := Rubric{
		Name:        "header_structure",
		Description: "Check header structure",
		Grader:      HeaderStructureGrader,
	}

	inputs := map[string]any{
		"headers": []HeaderSpec{
			{H: 2, Text: "A"},
			{H: 2, Text: "B"},
			{H: 2, Text: "C"},
		},
	}

	output := "## A\n\nSomething\n\n## B\n\nSomething\n\n## C\n\nSomething"

	score := HeaderStructureGrader.GradeWithInputs(context.Background(), nil, "", rubric, output, inputs)

	if !score.Passed {
		t.Errorf("HeaderStructureGrader.GradeWithInputs() passed = false, want true")
	}
	if score.Value != 1 {
		t.Errorf("HeaderStructureGrader.GradeWithInputs() value = %d, want 1", score.Value)
	}
	if score.RubricName != "header_structure" {
		t.Errorf("HeaderStructureGrader.GradeWithInputs() rubricName = %q, want %q", score.RubricName, "header_structure")
	}
}

func TestPreBuiltGraders(t *testing.T) {
	rubric := Rubric{Name: "test", Description: "test"}

	t.Run("NonEmptyGrader passes", func(t *testing.T) {
		score := NonEmptyGrader.Grade(context.Background(), nil, "", rubric, "hello")
		if !score.Passed {
			t.Error("NonEmptyGrader should pass for non-empty input")
		}
	})

	t.Run("NonEmptyGrader fails", func(t *testing.T) {
		score := NonEmptyGrader.Grade(context.Background(), nil, "", rubric, "")
		if score.Passed {
			t.Error("NonEmptyGrader should fail for empty input")
		}
	})

	t.Run("HasHeadingGrader passes", func(t *testing.T) {
		score := HasHeadingGrader.Grade(context.Background(), nil, "", rubric, "# Title")
		if !score.Passed {
			t.Error("HasHeadingGrader should pass for markdown with heading")
		}
	})

	t.Run("HasListGrader passes", func(t *testing.T) {
		score := HasListGrader.Grade(context.Background(), nil, "", rubric, "- item")
		if !score.Passed {
			t.Error("HasListGrader should pass for markdown with list")
		}
	})

	t.Run("HasCodeGrader passes", func(t *testing.T) {
		score := HasCodeGrader.Grade(context.Background(), nil, "", rubric, "```\ncode\n```")
		if !score.Passed {
			t.Error("HasCodeGrader should pass for markdown with code block")
		}
	})
}
