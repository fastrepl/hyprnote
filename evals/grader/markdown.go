package grader

import (
	"errors"
	"fmt"
	"strings"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/text"
)

var (
	ErrEmptyInput          = errors.New("empty input")
	ErrParseFailed         = errors.New("failed to parse markdown")
	ErrInvalidHeadersInput = errors.New("invalid headers input")
)

type HeaderSpec struct {
	H    int    `json:"h"`
	Text string `json:"text"`
}

type markdownShape struct {
	hasHeading bool
	hasList    bool
	hasCode    bool
}

func parseMarkdownShape(md string) (markdownShape, error) {
	if strings.TrimSpace(md) == "" {
		return markdownShape{}, ErrEmptyInput
	}

	var shape markdownShape
	parser := goldmark.New()
	doc := parser.Parser().Parse(text.NewReader([]byte(md)))
	if doc == nil {
		return shape, ErrParseFailed
	}

	ast.Walk(doc, func(n ast.Node, entering bool) (ast.WalkStatus, error) {
		if !entering {
			return ast.WalkContinue, nil
		}
		switch n.Kind() {
		case ast.KindHeading:
			shape.hasHeading = true
		case ast.KindList:
			shape.hasList = true
		case ast.KindFencedCodeBlock:
			shape.hasCode = true
		}
		return ast.WalkContinue, nil
	})

	return shape, nil
}

func checkShape(output string, check func(markdownShape) bool, found, missing string) (bool, string) {
	shape, err := parseMarkdownShape(output)
	if err != nil {
		return false, err.Error()
	}
	if check(shape) {
		return true, found
	}
	return false, missing
}

func HasMarkdownHeading(output string) (bool, string) {
	return checkShape(output, func(s markdownShape) bool { return s.hasHeading }, "contains heading", "missing heading")
}

func HasMarkdownList(output string) (bool, string) {
	return checkShape(output, func(s markdownShape) bool { return s.hasList }, "contains list", "missing list")
}

func HasMarkdownCode(output string) (bool, string) {
	return checkShape(output, func(s markdownShape) bool { return s.hasCode }, "contains code block", "missing code block")
}

func extractHeaders(md string) ([]HeaderSpec, error) {
	if strings.TrimSpace(md) == "" {
		return nil, ErrEmptyInput
	}

	var headers []HeaderSpec
	parser := goldmark.New()
	source := []byte(md)
	doc := parser.Parser().Parse(text.NewReader(source))
	if doc == nil {
		return nil, ErrParseFailed
	}

	ast.Walk(doc, func(n ast.Node, entering bool) (ast.WalkStatus, error) {
		if !entering {
			return ast.WalkContinue, nil
		}
		if n.Kind() == ast.KindHeading {
			heading := n.(*ast.Heading)
			var textContent strings.Builder
			for child := heading.FirstChild(); child != nil; child = child.NextSibling() {
				if child.Kind() == ast.KindText {
					textContent.Write(child.(*ast.Text).Segment.Value(source))
				}
			}
			headers = append(headers, HeaderSpec{
				H:    heading.Level,
				Text: textContent.String(),
			})
		}
		return ast.WalkContinue, nil
	})

	return headers, nil
}

func HasHeaderStructure(output string, inputs map[string]any) (bool, string) {
	headersInput, ok := inputs["headers"]
	if !ok {
		return false, ErrInvalidHeadersInput.Error()
	}

	expectedHeaders, ok := headersInput.([]HeaderSpec)
	if !ok {
		return false, ErrInvalidHeadersInput.Error()
	}

	actualHeaders, err := extractHeaders(output)
	if err != nil {
		return false, err.Error()
	}

	if len(actualHeaders) != len(expectedHeaders) {
		return false, fmt.Sprintf("expected %d headers, got %d", len(expectedHeaders), len(actualHeaders))
	}

	for i, expected := range expectedHeaders {
		actual := actualHeaders[i]
		if actual.H != expected.H {
			return false, fmt.Sprintf("header %d: expected level %d, got %d", i+1, expected.H, actual.H)
		}
		if actual.Text != expected.Text {
			return false, fmt.Sprintf("header %d: expected text %q, got %q", i+1, expected.Text, actual.Text)
		}
	}

	return true, "header structure matches"
}
