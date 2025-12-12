package evals

import (
	"bytes"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/text"
)

type MarkdownShape struct {
	HasHeading bool
	HasList    bool
	HasCode    bool
}

func ParseMarkdownShape(md string) (MarkdownShape, bool) {
	// Goldmark is permissive; we treat successful parse + some structure as "is Markdown".
	var shape MarkdownShape

	parser := goldmark.New()
	doc := parser.Parser().Parse(text.NewReader([]byte(md)))
	if doc == nil {
		return shape, false
	}

	ast.Walk(doc, func(n ast.Node, entering bool) (ast.WalkStatus, error) {
		if !entering {
			return ast.WalkContinue, nil
		}
		switch n.Kind() {
		case ast.KindHeading:
			shape.HasHeading = true
		case ast.KindList:
			shape.HasList = true
		case ast.KindFencedCodeBlock:
			shape.HasCode = true
		}
		return ast.WalkContinue, nil
	})

	// Also reject empty / whitespace-only outputs.
	if len(bytes.TrimSpace([]byte(md))) == 0 {
		return shape, false
	}

	return shape, true
}
