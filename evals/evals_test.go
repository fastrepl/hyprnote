package evals_test

import (
	"testing"

	"hyprnote/evals"
)

func TestEvals(t *testing.T) {
	evals.RunTest(t, evals.AllEvals)
}
