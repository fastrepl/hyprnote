package evals

import (
	"hyprnote/evals/grader"
)

var (
	ErrEmptyInput          = grader.ErrEmptyInput
	ErrParseFailed         = grader.ErrParseFailed
	ErrInvalidHeadersInput = grader.ErrInvalidHeadersInput
)

type HeaderSpec = grader.HeaderSpec

var (
	NonEmptyGrader   = FuncGrader(grader.IsNonEmpty)
	HasHeadingGrader = FuncGrader(grader.HasMarkdownHeading)
	HasListGrader    = FuncGrader(grader.HasMarkdownList)
	HasCodeGrader    = FuncGrader(grader.HasMarkdownCode)
)

func HasHeaderStructure(output string, inputs map[string]any) (bool, string) {
	return grader.HasHeaderStructure(output, inputs)
}

var HeaderStructureGrader = FuncGraderWithInputs(HasHeaderStructure)
