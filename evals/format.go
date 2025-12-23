package evals

import (
	"errors"
	"fmt"
	"strings"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/text"
)

var (
	ErrEmptyInput   = errors.New("empty input")
	ErrParseFailed  = errors.New("failed to parse markdown")
	ErrFormatFailed = errors.New("format validation failed")
)

type FormatSpec struct {
	Sections []SectionSpec
}

type SectionSpec struct {
	Header   HeaderSpec
	ListOnly bool
}

type HeaderSpec struct {
	Level int
	Text  string
}

func MatchFormat(md string, spec FormatSpec) (bool, string) {
	if strings.TrimSpace(md) == "" {
		return false, ErrEmptyInput.Error()
	}

	parser := goldmark.New()
	source := []byte(md)
	doc := parser.Parser().Parse(text.NewReader(source))
	if doc == nil {
		return false, ErrParseFailed.Error()
	}

	var sections []parsedSection
	var currentSection *parsedSection

	for child := doc.FirstChild(); child != nil; child = child.NextSibling() {
		switch child.Kind() {
		case ast.KindHeading:
			heading := child.(*ast.Heading)
			headerText := extractText(heading, source)

			if currentSection != nil {
				sections = append(sections, *currentSection)
			}
			currentSection = &parsedSection{
				header: HeaderSpec{
					Level: heading.Level,
					Text:  headerText,
				},
			}

		case ast.KindList:
			if currentSection == nil {
				return false, "list found before any header"
			}
			list := child.(*ast.List)
			if list.IsOrdered() {
				return false, fmt.Sprintf("ordered list found under header %q, expected unordered", currentSection.header.Text)
			}
			currentSection.hasList = true

		case ast.KindParagraph:
			if currentSection == nil {
				return false, "paragraph found before any header"
			}
			return false, fmt.Sprintf("paragraph found under header %q, only lists allowed", currentSection.header.Text)

		case ast.KindFencedCodeBlock, ast.KindCodeBlock:
			if currentSection == nil {
				return false, "code block found before any header"
			}
			return false, fmt.Sprintf("code block found under header %q, only lists allowed", currentSection.header.Text)

		case ast.KindBlockquote:
			if currentSection == nil {
				return false, "blockquote found before any header"
			}
			return false, fmt.Sprintf("blockquote found under header %q, only lists allowed", currentSection.header.Text)

		case ast.KindThematicBreak:
			return false, "thematic break (horizontal rule) not allowed"
		}
	}

	if currentSection != nil {
		sections = append(sections, *currentSection)
	}

	if len(sections) != len(spec.Sections) {
		return false, fmt.Sprintf("expected %d sections, got %d", len(spec.Sections), len(sections))
	}

	for i, expected := range spec.Sections {
		actual := sections[i]

		if expected.Header.Level != 0 && actual.header.Level != expected.Header.Level {
			return false, fmt.Sprintf("section %d: expected h%d, got h%d", i+1, expected.Header.Level, actual.header.Level)
		}

		if expected.Header.Text != "" && actual.header.Text != expected.Header.Text {
			return false, fmt.Sprintf("section %d: expected header %q, got %q", i+1, expected.Header.Text, actual.header.Text)
		}

		if expected.ListOnly && !actual.hasList {
			return false, fmt.Sprintf("section %d (%q): expected list content", i+1, actual.header.Text)
		}
	}

	return true, "format matches"
}

type parsedSection struct {
	header  HeaderSpec
	hasList bool
}

func extractText(node ast.Node, source []byte) string {
	var b strings.Builder
	for child := node.FirstChild(); child != nil; child = child.NextSibling() {
		if child.Kind() == ast.KindText {
			b.Write(child.(*ast.Text).Segment.Value(source))
		}
	}
	return b.String()
}

func IsNonEmpty(output string) (bool, string) {
	if strings.TrimSpace(output) == "" {
		return false, "output is empty"
	}
	return true, "output is non-empty"
}

var NonEmptyGrader = FuncGrader(IsNonEmpty)

func FormatMatcherGrader(spec FormatSpec) FuncGrader {
	return func(output string) (bool, string) {
		return MatchFormat(output, spec)
	}
}
