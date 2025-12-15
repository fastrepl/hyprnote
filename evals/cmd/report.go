package main

import (
	"encoding/json"
	"fmt"
	"os"

	"hyprnote/evals"

	"github.com/jedib0t/go-pretty/v6/table"
	"github.com/jedib0t/go-pretty/v6/text"
)

func renderJSON(results []evals.Result) error {
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	if err := enc.Encode(results); err != nil {
		return fmt.Errorf("encode json: %w", err)
	}

	for _, r := range results {
		if r.Error != "" || !r.AllPassed() {
			return errEvalFailed
		}
	}
	return nil
}

func renderResults(results []evals.Result) error {
	rubricNames := extractRubricNames(results)

	t := table.NewWriter()
	t.SetOutputMirror(os.Stdout)
	t.SetStyle(table.StyleRounded)

	header := table.Row{"Model"}
	for _, name := range rubricNames {
		header = append(header, name)
	}
	header = append(header, "Total", "Cost")
	t.AppendHeader(header)

	totals := make([]int, len(rubricNames))
	var grandTotal, maxTotal, totalFailed int
	var totalCost float64
	var errorDetails []string

	for _, r := range results {
		row := table.Row{r.Model}

		if r.Error != "" {
			totalFailed++
			for range rubricNames {
				row = append(row, "-")
			}
			row = append(row, text.FgRed.Sprint("error"), "-")
			t.AppendRow(row)
			errorDetails = append(errorDetails, fmt.Sprintf("%s: %s", r.Model, r.Error))
			continue
		}

		passed, total := r.TallyScore()
		if passed != total {
			totalFailed++
		}
		maxTotal += total
		totalCost += r.Usage.Cost

		for i, s := range r.Scores {
			if s.Passed {
				totals[i]++
				grandTotal++
				row = append(row, "1")
			} else {
				row = append(row, text.FgRed.Sprint("0"))
			}
		}

		if passed == total {
			row = append(row, fmt.Sprintf("%d/%d", passed, total))
		} else {
			row = append(row, text.FgRed.Sprintf("%d/%d", passed, total))
		}

		row = append(row, formatCost(r.Usage.Cost))
		t.AppendRow(row)
	}

	footer := table.Row{"Total"}
	for _, total := range totals {
		footer = append(footer, fmt.Sprintf("%d", total))
	}
	footer = append(footer, fmt.Sprintf("%d/%d", grandTotal, maxTotal), formatCost(totalCost))
	t.AppendFooter(footer)
	t.Render()

	if len(errorDetails) > 0 {
		fmt.Fprintln(os.Stderr)
		fmt.Fprintln(os.Stderr, text.FgRed.Sprint("Errors:"))
		for _, detail := range errorDetails {
			fmt.Fprintln(os.Stderr, text.FgRed.Sprint("  • "+detail))
		}
	}

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

func formatCost(cost float64) string {
	if cost == 0 {
		return "-"
	}
	if cost < 0.01 {
		return fmt.Sprintf("%.6f", cost)
	}
	return fmt.Sprintf("%.4f", cost)
}
