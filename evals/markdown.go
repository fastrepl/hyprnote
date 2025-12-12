package evals

import (
	"errors"
	"strings"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/text"
)

var (
	ErrEmptyInput  = errors.New("empty input")
	ErrParseFailed = errors.New("failed to parse markdown")
)

// Pre-built graders for common markdown checks.
var (
	NonEmptyGrader   = FuncGrader(isNonEmpty)
	HasHeadingGrader = FuncGrader(hasMarkdownHeading)
	HasListGrader    = FuncGrader(hasMarkdownList)
	HasCodeGrader    = FuncGrader(hasMarkdownCode)
)

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

func hasMarkdownHeading(output string) (bool, string) {
	return checkShape(output, func(s markdownShape) bool { return s.hasHeading }, "contains heading", "missing heading")
}

func hasMarkdownList(output string) (bool, string) {
	return checkShape(output, func(s markdownShape) bool { return s.hasList }, "contains list", "missing list")
}

func hasMarkdownCode(output string) (bool, string) {
	return checkShape(output, func(s markdownShape) bool { return s.hasCode }, "contains code block", "missing code block")
}

func isNonEmpty(output string) (bool, string) {
	if strings.TrimSpace(output) == "" {
		return false, "output is empty"
	}
	return true, "output is non-empty"
}
