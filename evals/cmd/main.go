package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"syscall"

	"hyprnote/evals"
	"hyprnote/evals/tasks"

	"github.com/jedib0t/go-pretty/v6/table"
	"github.com/jedib0t/go-pretty/v6/text"
	"github.com/schollz/progressbar/v3"
	"github.com/spf13/cobra"
)

var (
	errEvalFailed    = errors.New("evaluation failed")
	errMissingAPIKey = errors.New("OPENROUTER_API_KEY environment variable is not set")
)

func main() {
	if err := rootCmd.Execute(); err != nil {
		if !errors.Is(err, errEvalFailed) {
			fmt.Fprintln(os.Stderr, "Error:", err)
		}
		os.Exit(1)
	}
}

var rootCmd = &cobra.Command{
	Use:   "evals",
	Short: "LLM evaluation runner",
}

func init() {
	rootCmd.CompletionOptions.DisableDefaultCmd = true
	rootCmd.AddCommand(runCmd)
}

var runCmd = &cobra.Command{
	Use:           "run",
	Short:         "Run all evaluations",
	SilenceUsage:  true,
	SilenceErrors: true,
	RunE: func(cmd *cobra.Command, args []string) error {
		if os.Getenv("OPENROUTER_API_KEY") == "" {
			return errMissingAPIKey
		}

		ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
		defer cancel()

		runner := evals.New()
		bar := progressbar.Default(int64(runner.TotalCount(tasks.All)), "evaluating")
		runner.OnProgress = func() { bar.Add(1) }
		results := runner.Run(ctx, tasks.All)
		bar.Finish()

		return renderResults(results)
	},
}

func renderResults(results []evals.Result) error {
	rubricNames := extractRubricNames(results)

	t := table.NewWriter()
	t.SetOutputMirror(os.Stdout)
	t.SetStyle(table.StyleRounded)
	t.AppendHeader(buildHeader(rubricNames))

	totals := make([]int, len(rubricNames))
	var grandTotal, maxTotal, totalFailed int

	for _, r := range results {
		row := table.Row{r.Model}

		if r.Error != "" {
			totalFailed++
			for range rubricNames {
				row = append(row, "-")
			}
			row = append(row, text.FgRed.Sprint("error"))
			t.AppendRow(row)
			continue
		}

		passed, total := r.TallyScore()
		if passed != total {
			totalFailed++
		}
		maxTotal += total

		for i, s := range r.Scores {
			if s.Passed {
				totals[i]++
				grandTotal++
				row = append(row, text.FgGreen.Sprint("1"))
			} else {
				row = append(row, text.FgRed.Sprint("0"))
			}
		}

		if passed == total {
			row = append(row, text.FgGreen.Sprintf("%d/%d", passed, total))
		} else {
			row = append(row, text.FgRed.Sprintf("%d/%d", passed, total))
		}

		t.AppendRow(row)
	}

	t.AppendFooter(buildFooter(totals, grandTotal, maxTotal))
	t.Render()

	if totalFailed > 0 {
		return errEvalFailed
	}
	return nil
}

func extractRubricNames(results []evals.Result) []string {
	for _, r := range results {
		if r.Error != "" || len(r.Scores) == 0 {
			continue
		}
		names := make([]string, len(r.Scores))
		for i, s := range r.Scores {
			names[i] = s.RubricName
		}
		return names
	}
	return nil
}

func buildHeader(rubricNames []string) table.Row {
	header := table.Row{"Model"}
	for _, name := range rubricNames {
		header = append(header, name)
	}
	header = append(header, "Total")
	return header
}

func buildFooter(totals []int, grandTotal, maxTotal int) table.Row {
	footer := table.Row{"Total"}
	for _, total := range totals {
		footer = append(footer, fmt.Sprintf("%d", total))
	}
	footer = append(footer, fmt.Sprintf("%d/%d", grandTotal, maxTotal))
	return footer
}
