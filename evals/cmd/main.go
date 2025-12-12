package main

import (
	"fmt"
	"os"
	"strings"

	"hyprnote/evals"
)

const (
	reset  = "\033[0m"
	green  = "\033[32m"
	red    = "\033[31m"
	yellow = "\033[33m"
	cyan   = "\033[36m"
	bold   = "\033[1m"
	dim    = "\033[2m"
)

func main() {
	if os.Getenv("OPENROUTER_API_KEY") == "" {
		fmt.Printf("%s%sError:%s OPENROUTER_API_KEY is not set\n", bold, red, reset)
		os.Exit(1)
	}

	fmt.Printf("%s%sRunning evals...%s\n", bold, yellow, reset)
	fmt.Printf("%sModels: %s%s\n", dim, strings.Join(evals.TargetModels, ", "), reset)
	fmt.Printf("%sGrader: %s%s\n\n", dim, evals.GraderModel, reset)

	results := evals.RunAll(evals.AllEvals)

	modelStats := make(map[string]struct{ passed, failed int })

	for _, r := range results {
		stats := modelStats[r.Model]

		if r.Error != "" {
			stats.failed++
			modelStats[r.Model] = stats
			fmt.Printf("%s✗%s %s%s%s / %s", red, reset, cyan, r.Model, reset, r.Name)
			if r.RunNum > 0 {
				fmt.Printf(" %s(run %d)%s", dim, r.RunNum, reset)
			}
			fmt.Printf("\n  %s%serror:%s %s\n", bold, red, reset, r.Error)
			continue
		}

		passed, total := r.Score()
		allPassed := passed == total

		if allPassed {
			stats.passed++
			fmt.Printf("%s✓%s %s%s%s / %s", green, reset, cyan, r.Model, reset, r.Name)
		} else {
			stats.failed++
			fmt.Printf("%s✗%s %s%s%s / %s", red, reset, cyan, r.Model, reset, r.Name)
		}

		modelStats[r.Model] = stats

		if r.RunNum > 0 {
			fmt.Printf(" %s(run %d)%s", dim, r.RunNum, reset)
		}
		fmt.Printf(" %s[%d/%d rubrics]%s\n", dim, passed, total, reset)

		for _, rr := range r.RubricResults {
			if rr.Passed {
				fmt.Printf("  %s✓%s %s", green, reset, rr.RubricName)
			} else {
				fmt.Printf("  %s✗%s %s", red, reset, rr.RubricName)
			}
			if rr.GraderType == evals.GraderLLM {
				fmt.Printf(" %s(llm)%s", dim, reset)
			}
			if !rr.Passed && rr.Reasoning != "" {
				fmt.Printf(" - %s", rr.Reasoning)
			}
			fmt.Println()
		}
	}

	fmt.Printf("\n%s%sSummary by model:%s\n", bold, yellow, reset)
	totalPassed := 0
	totalFailed := 0
	for _, model := range evals.TargetModels {
		stats := modelStats[model]
		totalPassed += stats.passed
		totalFailed += stats.failed
		fmt.Printf("  %s%s%s: ", cyan, model, reset)
		fmt.Printf("%s%d passed%s", green, stats.passed, reset)
		if stats.failed > 0 {
			fmt.Printf(", %s%d failed%s", red, stats.failed, reset)
		}
		fmt.Println()
	}

	fmt.Printf("\n%s%sTotal: %d passed%s", bold, green, totalPassed, reset)
	if totalFailed > 0 {
		fmt.Printf(", %s%s%d failed%s", bold, red, totalFailed, reset)
	}
	fmt.Println()

	if totalFailed > 0 {
		os.Exit(1)
	}
}
