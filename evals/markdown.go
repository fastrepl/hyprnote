package evals

import (
	"hyprnote/evals/grader"
)

var (
	ErrEmptyInput   = grader.ErrEmptyInput
	ErrParseFailed  = grader.ErrParseFailed
	ErrFormatFailed = grader.ErrFormatFailed
)

type FormatSpec = grader.FormatSpec
type SectionSpec = grader.SectionSpec
type HeaderSpec = grader.HeaderSpec

var NonEmptyGrader = FuncGrader(grader.IsNonEmpty)

func MatchFormat(md string, spec FormatSpec) (bool, string) {
	return grader.MatchFormat(md, spec)
}

func FormatMatcherGrader(spec FormatSpec) FuncGrader {
	return func(output string) (bool, string) {
		return grader.MatchFormat(output, spec)
	}
}
