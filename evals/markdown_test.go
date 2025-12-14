package evals

import (
	"context"
	"testing"
)

func TestMatchFormat(t *testing.T) {
	tests := []struct {
		name     string
		md       string
		spec     FormatSpec
		wantPass bool
		wantMsg  string
	}{
		{
			name: "empty input",
			md:   "",
			spec: FormatSpec{
				Sections: []SectionSpec{
					{Header: HeaderSpec{Level: 1, Text: "Header"}, ListOnly: true},
				},
			},
			wantPass: false,
			wantMsg:  ErrEmptyInput.Error(),
		},
		{
			name: "valid single section",
			md:   "# Header first\n\n- Point 1\n- Point 2\n- Point 3",
			spec: FormatSpec{
				Sections: []SectionSpec{
					{Header: HeaderSpec{Level: 1, Text: "Header first"}, ListOnly: true},
				},
			},
			wantPass: true,
			wantMsg:  "format matches",
		},
		{
			name: "valid two sections",
			md:   "# Header first\n\n- Point 1\n- Point 2\n- Point 3\n\n# Header Second\n\n- Point 1\n- Point 2",
			spec: FormatSpec{
				Sections: []SectionSpec{
					{Header: HeaderSpec{Level: 1, Text: "Header first"}, ListOnly: true},
					{Header: HeaderSpec{Level: 1, Text: "Header Second"}, ListOnly: true},
				},
			},
			wantPass: true,
			wantMsg:  "format matches",
		},
		{
			name: "wrong header level",
			md:   "## Header first\n\n- Point 1",
			spec: FormatSpec{
				Sections: []SectionSpec{
					{Header: HeaderSpec{Level: 1, Text: "Header first"}, ListOnly: true},
				},
			},
			wantPass: false,
			wantMsg:  "section 1: expected h1, got h2",
		},
		{
			name: "paragraph not allowed",
			md:   "# Header first\n\nSome paragraph text\n\n- Point 1",
			spec: FormatSpec{
				Sections: []SectionSpec{
					{Header: HeaderSpec{Level: 1, Text: "Header first"}, ListOnly: true},
				},
			},
			wantPass: false,
			wantMsg:  `paragraph found under header "Header first", only lists allowed`,
		},
		{
			name: "ordered list not allowed",
			md:   "# Header first\n\n1. Point 1\n2. Point 2",
			spec: FormatSpec{
				Sections: []SectionSpec{
					{Header: HeaderSpec{Level: 1, Text: "Header first"}, ListOnly: true},
				},
			},
			wantPass: false,
			wantMsg:  `ordered list found under header "Header first", expected unordered`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			passed, msg := MatchFormat(tt.md, tt.spec)
			if passed != tt.wantPass {
				t.Errorf("MatchFormat() passed = %v, want %v", passed, tt.wantPass)
			}
			if msg != tt.wantMsg {
				t.Errorf("MatchFormat() msg = %q, want %q", msg, tt.wantMsg)
			}
		})
	}
}

func TestFormatMatcherGrader(t *testing.T) {
	spec := FormatSpec{
		Sections: []SectionSpec{
			{Header: HeaderSpec{Level: 1, Text: "Header first"}, ListOnly: true},
			{Header: HeaderSpec{Level: 1, Text: "Header Second"}, ListOnly: true},
		},
	}

	rubric := Rubric{
		Name:        "format_check",
		Description: "Check markdown format",
		Grader:      FormatMatcherGrader(spec),
	}

	validMd := "# Header first\n\n- Point 1\n- Point 2\n\n# Header Second\n\n- Point 1"
	score := rubric.Grader.Grade(context.Background(), nil, "", rubric, validMd)

	if !score.Passed {
		t.Errorf("FormatMatcherGrader() passed = false, want true")
	}
	if score.Value != 1 {
		t.Errorf("FormatMatcherGrader() value = %d, want 1", score.Value)
	}
}

func TestNonEmptyGrader(t *testing.T) {
	rubric := Rubric{Name: "test", Description: "test"}

	t.Run("passes for non-empty", func(t *testing.T) {
		score := NonEmptyGrader.Grade(context.Background(), nil, "", rubric, "hello")
		if !score.Passed {
			t.Error("NonEmptyGrader should pass for non-empty input")
		}
	})

	t.Run("fails for empty", func(t *testing.T) {
		score := NonEmptyGrader.Grade(context.Background(), nil, "", rubric, "")
		if score.Passed {
			t.Error("NonEmptyGrader should fail for empty input")
		}
	})
}
