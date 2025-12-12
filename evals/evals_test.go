package evals_test

import (
	"testing"

	"hyprnote/evals"
	"hyprnote/evals/tasks"
)

func TestEvals(t *testing.T) {
	evals.RunTest(t, tasks.All)
}
