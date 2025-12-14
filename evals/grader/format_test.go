package grader

import (
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
			passed, _ := IsNonEmpty(tt.input)
			if passed != tt.wantPass {
				t.Errorf("IsNonEmpty(%q) = %v, want %v", tt.input, passed, tt.wantPass)
			}
		})
	}
}

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
			name: "wrong header text",
			md:   "# Wrong Header\n\n- Point 1",
			spec: FormatSpec{
				Sections: []SectionSpec{
					{Header: HeaderSpec{Level: 1, Text: "Header first"}, ListOnly: true},
				},
			},
			wantPass: false,
			wantMsg:  `section 1: expected header "Header first", got "Wrong Header"`,
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
			name: "code block not allowed",
			md:   "# Header first\n\n```\ncode\n```",
			spec: FormatSpec{
				Sections: []SectionSpec{
					{Header: HeaderSpec{Level: 1, Text: "Header first"}, ListOnly: true},
				},
			},
			wantPass: false,
			wantMsg:  `code block found under header "Header first", only lists allowed`,
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
		{
			name: "wrong number of sections",
			md:   "# Header first\n\n- Point 1",
			spec: FormatSpec{
				Sections: []SectionSpec{
					{Header: HeaderSpec{Level: 1, Text: "Header first"}, ListOnly: true},
					{Header: HeaderSpec{Level: 1, Text: "Header Second"}, ListOnly: true},
				},
			},
			wantPass: false,
			wantMsg:  "expected 2 sections, got 1",
		},
		{
			name: "missing list content",
			md:   "# Header first\n\n# Header Second\n\n- Point 1",
			spec: FormatSpec{
				Sections: []SectionSpec{
					{Header: HeaderSpec{Level: 1, Text: "Header first"}, ListOnly: true},
					{Header: HeaderSpec{Level: 1, Text: "Header Second"}, ListOnly: true},
				},
			},
			wantPass: false,
			wantMsg:  `section 1 ("Header first"): expected list content`,
		},
		{
			name: "flexible header text (empty expected)",
			md:   "# Any Header\n\n- Point 1",
			spec: FormatSpec{
				Sections: []SectionSpec{
					{Header: HeaderSpec{Level: 1}, ListOnly: true},
				},
			},
			wantPass: true,
			wantMsg:  "format matches",
		},
		{
			name: "list before header",
			md:   "- Point 1\n\n# Header",
			spec: FormatSpec{
				Sections: []SectionSpec{
					{Header: HeaderSpec{Level: 1}, ListOnly: true},
				},
			},
			wantPass: false,
			wantMsg:  "list found before any header",
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
