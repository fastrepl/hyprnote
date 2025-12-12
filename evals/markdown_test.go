package evals

import (
	"context"
	"testing"
)

func TestIsNonEmpty(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		wantPass bool
	}{
		{"non-empty string", "hello", true},
		{"empty string", "", false},
		{"whitespace only", "   ", false},
		{"newlines only", "\n\n", false},
		{"tabs only", "\t\t", false},
		{"mixed whitespace", " \t\n ", false},
		{"content with whitespace", "  hello  ", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			passed, _ := isNonEmpty(tt.input)
			if passed != tt.wantPass {
				t.Errorf("isNonEmpty(%q) = %v, want %v", tt.input, passed, tt.wantPass)
			}
		})
	}
}

func TestHasMarkdownHeading(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		wantPass bool
	}{
		{"h1 heading", "# Title", true},
		{"h2 heading", "## Subtitle", true},
		{"h3 heading", "### Section", true},
		{"no heading", "Just some text", false},
		{"empty", "", false},
		{"heading with content", "# Title\n\nSome content", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			passed, _ := hasMarkdownHeading(tt.input)
			if passed != tt.wantPass {
				t.Errorf("hasMarkdownHeading(%q) = %v, want %v", tt.input, passed, tt.wantPass)
			}
		})
	}
}

func TestHasMarkdownList(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		wantPass bool
	}{
		{"unordered list", "- item 1\n- item 2", true},
		{"ordered list", "1. item 1\n2. item 2", true},
		{"no list", "Just some text", false},
		{"empty", "", false},
		{"list with content", "Some text\n\n- item 1\n- item 2", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			passed, _ := hasMarkdownList(tt.input)
			if passed != tt.wantPass {
				t.Errorf("hasMarkdownList(%q) = %v, want %v", tt.input, passed, tt.wantPass)
			}
		})
	}
}

func TestHasMarkdownCode(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		wantPass bool
	}{
		{"fenced code block", "```\ncode\n```", true},
		{"fenced code with language", "```go\nfunc main() {}\n```", true},
		{"no code block", "Just some text", false},
		{"empty", "", false},
		{"inline code only", "`code`", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			passed, _ := hasMarkdownCode(tt.input)
			if passed != tt.wantPass {
				t.Errorf("hasMarkdownCode(%q) = %v, want %v", tt.input, passed, tt.wantPass)
			}
		})
	}
}

func TestExtractHeaders(t *testing.T) {
	tests := []struct {
		name        string
		input       string
		wantHeaders []HeaderSpec
		wantErr     bool
	}{
		{
			name:        "empty input",
			input:       "",
			wantHeaders: nil,
			wantErr:     true,
		},
		{
			name:        "no headers",
			input:       "Just some text",
			wantHeaders: []HeaderSpec{},
			wantErr:     false,
		},
		{
			name:  "single h1",
			input: "# Title",
			wantHeaders: []HeaderSpec{
				{H: 1, Text: "Title"},
			},
			wantErr: false,
		},
		{
			name:  "multiple h2 headers",
			input: "## A\n\nSomething\n\n## B\n\nSomething\n\n## C\n\nSomething",
			wantHeaders: []HeaderSpec{
				{H: 2, Text: "A"},
				{H: 2, Text: "B"},
				{H: 2, Text: "C"},
			},
			wantErr: false,
		},
		{
			name:  "mixed header levels",
			input: "# Title\n\n## Section 1\n\n### Subsection\n\n## Section 2",
			wantHeaders: []HeaderSpec{
				{H: 1, Text: "Title"},
				{H: 2, Text: "Section 1"},
				{H: 3, Text: "Subsection"},
				{H: 2, Text: "Section 2"},
			},
			wantErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			headers, err := extractHeaders(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("extractHeaders() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if tt.wantErr {
				return
			}
			if len(headers) != len(tt.wantHeaders) {
				t.Errorf("extractHeaders() got %d headers, want %d", len(headers), len(tt.wantHeaders))
				return
			}
			for i, h := range headers {
				if h.H != tt.wantHeaders[i].H || h.Text != tt.wantHeaders[i].Text {
					t.Errorf("extractHeaders()[%d] = {H: %d, Text: %q}, want {H: %d, Text: %q}",
						i, h.H, h.Text, tt.wantHeaders[i].H, tt.wantHeaders[i].Text)
				}
			}
		})
	}
}

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
