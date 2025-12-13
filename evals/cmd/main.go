package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"

	"hyprnote/evals"
	"hyprnote/evals/tasks"

	"github.com/jedib0t/go-pretty/v6/table"
	"github.com/jedib0t/go-pretty/v6/text"
	"github.com/schollz/progressbar/v3"
	"github.com/spf13/cobra"
)

var errEvalFailed = errors.New("evaluation failed")

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
	rootCmd.AddCommand(listCmd)

	runCmd.Flags().StringSliceP("tasks", "t", nil, "tasks to run (comma-separated)")
	runCmd.Flags().StringP("output", "o", "table", "output format: table or json")
	runCmd.Flags().StringSliceP("models", "m", nil, "models to use (comma-separated)")
	runCmd.Flags().Bool("no-cache", false, "disable response caching")
	runCmd.Flags().String("cache-dir", "", "custom cache directory (default: XDG cache dir)")
}

var listCmd = &cobra.Command{
	Use:   "list",
	Short: "List available tasks",
	Run: func(cmd *cobra.Command, args []string) {
		for _, task := range tasks.All {
			fmt.Printf("%s\n", task.Name)
			for _, rubric := range task.Rubrics {
				fmt.Printf("  - %s: %s\n", rubric.Name, rubric.Description)
			}
		}
	},
}

var runCmd = &cobra.Command{
	Use:           "run",
	Short:         "Run evaluations",
	SilenceUsage:  true,
	SilenceErrors: true,
	RunE: func(cmd *cobra.Command, args []string) error {
		cfg, err := evals.ParseConfig()
		if err != nil {
			return fmt.Errorf("parse config: %w", err)
		}

		if cfg.OpenRouterAPIKey == "" {
			return errors.New("OPENROUTER_API_KEY environment variable is not set")
		}

		taskFilter, err := cmd.Flags().GetStringSlice("tasks")
		if err != nil {
			return fmt.Errorf("get tasks flag: %w", err)
		}
		outputFormat, err := cmd.Flags().GetString("output")
		if err != nil {
			return fmt.Errorf("get output flag: %w", err)
		}
		modelOverride, err := cmd.Flags().GetStringSlice("models")
		if err != nil {
			return fmt.Errorf("get models flag: %w", err)
		}
		noCache, err := cmd.Flags().GetBool("no-cache")
		if err != nil {
			return fmt.Errorf("get no-cache flag: %w", err)
		}
		cacheDir, err := cmd.Flags().GetString("cache-dir")
		if err != nil {
			return fmt.Errorf("get cache-dir flag: %w", err)
		}

		selectedTasks := filterTasks(tasks.All, taskFilter)
		if len(selectedTasks) == 0 {
			return errors.New("no tasks matched the filter")
		}

		baseClient := evals.NewOpenRouterClient(cfg.OpenRouterAPIKey)
		cachingClient, err := evals.NewCachingChatCompleter(baseClient, evals.CacheConfig{
			Enabled:  !noCache,
			CacheDir: cacheDir,
		})
		if err != nil {
			return fmt.Errorf("create caching client: %w", err)
		}
		defer cachingClient.Close()

		var opts []evals.Option
		if len(modelOverride) > 0 {
			opts = append(opts, evals.WithModels(modelOverride...))
		}
		opts = append(opts, evals.WithClient(cachingClient))

		ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
		defer cancel()

		runner := evals.New(opts...)

		if outputFormat == "json" {
			results := runner.Run(ctx, selectedTasks)
			return renderJSON(results)
		}

		bar := progressbar.Default(int64(runner.TotalCount(selectedTasks)), "evaluating")
		runner.OnProgress = func() { bar.Add(1) }
		results := runner.Run(ctx, selectedTasks)
		bar.Finish()

		return renderResults(results)
	},
}

func filterTasks(allTasks []evals.Task, filter []string) []evals.Task {
	if len(filter) == 0 {
		return allTasks
	}

	filterSet := make(map[string]bool)
	for _, f := range filter {
		filterSet[strings.ToLower(f)] = true
	}

	var filtered []evals.Task
	for _, task := range allTasks {
		if filterSet[strings.ToLower(task.Name)] {
			filtered = append(filtered, task)
		}
	}
	return filtered
}

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
