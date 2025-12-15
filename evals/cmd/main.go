package main

import (
	"context"
	"errors"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"hyprnote/evals"
	"hyprnote/evals/tasks"

	"fortio.org/progressbar"
	"github.com/spf13/cobra"
)

var defaultModels = []string{
	"openai/gpt-4.1-nano",
	"anthropic/claude-haiku-4.5",
	"liquid/lfm-2.2-6b",
}

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
	rootCmd.AddCommand(runCmd)
	rootCmd.AddCommand(listCmd)
	rootCmd.AddCommand(completionCmd)

	runCmd.Flags().StringSliceP("tasks", "t", nil, "tasks to run (comma-separated)")
	runCmd.Flags().StringP("output", "o", "table", "output format: table or json")
	runCmd.Flags().StringSliceP("models", "m", nil, "models to use (comma-separated)")
	runCmd.Flags().Bool("no-cache", false, "disable response caching")
	runCmd.Flags().String("cache-dir", "", "custom cache directory (default: XDG cache dir)")

	runCmd.RegisterFlagCompletionFunc("models", completeModels)
}

func completeModels(cmd *cobra.Command, args []string, toComplete string) ([]string, cobra.ShellCompDirective) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	models, err := evals.FetchOpenRouterModels(ctx)
	if err != nil {
		return append(defaultModels, cobra.AppendActiveHelp(nil, fmt.Sprintf("Failed to fetch models: %v", err))...), cobra.ShellCompDirectiveNoFileComp
	}

	filtered := evals.FilterModels(models, toComplete)
	if len(filtered) == 0 {
		return defaultModels, cobra.ShellCompDirectiveNoFileComp
	}

	return filtered, cobra.ShellCompDirectiveNoFileComp
}

var completionCmd = &cobra.Command{
	Use:   "completion [bash|zsh|fish|powershell]",
	Short: "Generate completion script",
	Long: `To load completions:

Bash:
  $ source <(evals completion bash)
  # To load completions for each session, execute once:
  # Linux:
  $ evals completion bash > /etc/bash_completion.d/evals
  # macOS:
  $ evals completion bash > $(brew --prefix)/etc/bash_completion.d/evals

Zsh:
  # If shell completion is not already enabled in your environment,
  # you will need to enable it. You can execute the following once:
  $ echo "autoload -U compinit; compinit" >> ~/.zshrc
  # To load completions for each session, execute once:
  $ evals completion zsh > "${fpath[1]}/_evals"
  # You will need to start a new shell for this setup to take effect.

Fish:
  $ evals completion fish | source
  # To load completions for each session, execute once:
  $ evals completion fish > ~/.config/fish/completions/evals.fish

PowerShell:
  PS> evals completion powershell | Out-String | Invoke-Expression
  # To load completions for every new session, run:
  PS> evals completion powershell > evals.ps1
  # and source this file from your PowerShell profile.
`,
	DisableFlagsInUseLine: true,
	ValidArgs:             []string{"bash", "zsh", "fish", "powershell"},
	Args:                  cobra.MatchAll(cobra.ExactArgs(1), cobra.OnlyValidArgs),
	Run: func(cmd *cobra.Command, args []string) {
		switch args[0] {
		case "bash":
			cmd.Root().GenBashCompletion(os.Stdout)
		case "zsh":
			cmd.Root().GenZshCompletion(os.Stdout)
		case "fish":
			cmd.Root().GenFishCompletion(os.Stdout, true)
		case "powershell":
			cmd.Root().GenPowerShellCompletionWithDesc(os.Stdout)
		}
	},
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
			runner.ResolveUsage(ctx, results)
			return renderJSON(results)
		}

		genTotal := runner.TotalGenerations(selectedTasks)
		evalTotal := runner.TotalEvaluations(selectedTasks)

		pbCfg := progressbar.DefaultConfig()
		pbCfg.Width = 30
		pbCfg.ScreenWriter = os.Stderr
		mbar := pbCfg.NewMultiBarPrefixes("Generations", "Evaluations")

		genBar := mbar.Bars[0]
		evalBar := mbar.Bars[1]

		var genComplete, evalComplete int
		genBar.Extra = func(_ *progressbar.Bar, _ float64) string {
			return fmt.Sprintf(" %d/%d", genComplete, genTotal)
		}
		evalBar.Extra = func(_ *progressbar.Bar, _ float64) string {
			return fmt.Sprintf(" %d/%d", evalComplete, evalTotal)
		}

		runner.OnProgress = func(info evals.ProgressInfo) {
			genComplete = info.GenerationsComplete
			evalComplete = info.EvaluationsComplete

			var genPercent, evalPercent float64
			if genTotal > 0 {
				genPercent = 100.0 * float64(info.GenerationsComplete) / float64(genTotal)
			}
			if evalTotal > 0 {
				evalPercent = 100.0 * float64(info.EvaluationsComplete) / float64(evalTotal)
			}
			genBar.Progress(genPercent)
			evalBar.Progress(evalPercent)
		}
		results := runner.Run(ctx, selectedTasks)
		mbar.End()

		fmt.Fprintln(os.Stderr, "Fetching cost information...")
		runner.ResolveUsage(ctx, results)

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
