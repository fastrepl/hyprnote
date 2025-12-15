package evals

import (
	"context"
	"strconv"
	"sync"
	"testing"
	"time"

	"golang.org/x/sync/errgroup"
)

// Result holds the outcome of a single evaluation run.
type Result struct {
	Name         string
	Model        string
	RunNum       int
	Output       string
	Scores       []Score
	Error        string
	GenerationID string
	Usage        Usage
}

// AllPassed returns true if the run completed without error and all rubrics passed.
func (r Result) AllPassed() bool {
	if r.Error != "" {
		return false
	}
	for _, s := range r.Scores {
		if !s.Passed {
			return false
		}
	}
	return true
}

// TallyScore returns the number of passed rubrics and total rubrics.
func (r Result) TallyScore() (passed, total int) {
	for _, s := range r.Scores {
		total++
		if s.Passed {
			passed++
		}
	}
	return passed, total
}

var defaultModels = []string{
	"openai/gpt-4.1-nano",
	"anthropic/claude-haiku-4.5",
	"liquid/lfm-2.2-6b",
}

const defaultGraderModel = "openai/gpt-4.1-nano"

// ProgressInfo holds detailed progress information for tracking.
type ProgressInfo struct {
	GenerationsComplete int
	GenerationsTotal    int
	EvaluationsComplete int
	EvaluationsTotal    int
}

// ProgressCallback is called when progress is made during evaluation.
type ProgressCallback func(ProgressInfo)

// Runner executes evaluation tasks across multiple models.
type Runner struct {
	client       ChatCompleter
	targetModels []string
	graderModel  string
	numEvals     int
	timeout      time.Duration
	concurrency  int
	OnProgress   ProgressCallback

	generationsTotal int
	evaluationsTotal int
}

// Option configures a Runner.
type Option func(*Runner)

// WithModels sets the target models to evaluate.
func WithModels(models ...string) Option {
	return func(r *Runner) {
		r.targetModels = models
	}
}

// WithGraderModel sets the model used for LLM-based grading.
func WithGraderModel(model string) Option {
	return func(r *Runner) {
		r.graderModel = model
	}
}

// WithNumEvals sets the number of evaluation runs per task/model combination.
func WithNumEvals(n int) Option {
	return func(r *Runner) {
		if n > 0 {
			r.numEvals = n
		}
	}
}

// WithTimeout sets the overall timeout for the evaluation run.
func WithTimeout(d time.Duration) Option {
	return func(r *Runner) {
		if d > 0 {
			r.timeout = d
		}
	}
}

// WithConcurrency sets the maximum number of concurrent evaluations.
func WithConcurrency(n int) Option {
	return func(r *Runner) {
		if n > 0 {
			r.concurrency = n
		}
	}
}

// WithClient sets the client for the runner.
func WithClient(client ChatCompleter) Option {
	return func(r *Runner) {
		r.client = client
	}
}

// New creates a Runner with the provided options.
func New(opts ...Option) *Runner {
	cfg, err := ParseConfig()
	if err != nil {
		cfg = Config{
			NumEvals:       1,
			TimeoutSeconds: 60,
			Concurrency:    4,
		}
	}

	numEvals := cfg.NumEvals
	if numEvals <= 0 {
		numEvals = 1
	}

	r := &Runner{
		client:       NewOpenRouterClient(cfg.OpenRouterAPIKey),
		targetModels: defaultModels,
		graderModel:  defaultGraderModel,
		numEvals:     numEvals,
		timeout:      cfg.Timeout(),
		concurrency:  cfg.Concurrency,
	}

	for _, opt := range opts {
		opt(r)
	}

	return r
}

// TotalCount returns the total number of evaluation runs.
func (r *Runner) TotalCount(tasks []Task) int {
	return len(r.targetModels) * len(tasks) * r.numEvals
}

// TotalGenerations returns the total number of API calls that will be made for generation.
func (r *Runner) TotalGenerations(tasks []Task) int {
	return len(tasks) * len(r.targetModels) * r.numEvals
}

// TotalEvaluations returns the total number of evaluations that will be performed.
func (r *Runner) TotalEvaluations(tasks []Task) int {
	total := 0
	for _, task := range tasks {
		taskSamples := task.Samples
		if taskSamples <= 1 {
			taskSamples = 1
		}

		for _, rubric := range task.Rubrics {
			evalCount := taskSamples
			if llmGrader, ok := rubric.Grader.(LLMGrader); ok {
				graderSamples := llmGrader.Samples
				if graderSamples <= 1 {
					graderSamples = 1
				}
				evalCount = taskSamples * graderSamples
			}
			total += evalCount
		}
	}
	return total * len(r.targetModels) * r.numEvals
}

func (r *Runner) runSingleWithProgress(ctx context.Context, model string, runNum int, task Task, onGeneration, onEvaluation func()) Result {
	result := Result{
		Name:   task.Name,
		Model:  model,
		RunNum: runNum,
	}

	if task.Samples > 1 {
		outputs, generationID, err := task.ExecuteMultiWithGenerationID(ctx, r.client, model)
		if err != nil {
			result.Error = err.Error()
			return result
		}
		result.GenerationID = generationID

		if onGeneration != nil {
			onGeneration()
		}

		if len(outputs) > 0 {
			result.Output = outputs[0]
		}
		result.Scores = task.GradeMultiWithProgress(ctx, r.client, r.graderModel, outputs, onEvaluation)
		return result
	}

	output, generationID, err := task.ExecuteWithGenerationID(ctx, r.client, model)
	if err != nil {
		result.Error = err.Error()
		return result
	}
	result.GenerationID = generationID

	if onGeneration != nil {
		onGeneration()
	}

	result.Output = output
	result.Scores = task.GradeWithProgress(ctx, r.client, r.graderModel, output, onEvaluation)

	return result
}

// Run executes all tasks across all target models.
func (r *Runner) Run(ctx context.Context, tasks []Task) []Result {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	r.generationsTotal = r.TotalGenerations(tasks)
	r.evaluationsTotal = r.TotalEvaluations(tasks)

	var mu sync.Mutex
	var results []Result
	var generationsDone, evaluationsDone int

	reportProgress := func() {
		if r.OnProgress != nil {
			r.OnProgress(ProgressInfo{
				GenerationsComplete: generationsDone,
				GenerationsTotal:    r.generationsTotal,
				EvaluationsComplete: evaluationsDone,
				EvaluationsTotal:    r.evaluationsTotal,
			})
		}
	}

	g, ctx := errgroup.WithContext(ctx)
	g.SetLimit(r.concurrency)

	for _, model := range r.targetModels {
		for _, task := range tasks {
			for i := range r.numEvals {
				g.Go(func() error {
					onGeneration := func() {
						mu.Lock()
						generationsDone++
						reportProgress()
						mu.Unlock()
					}

					onEvaluation := func() {
						mu.Lock()
						evaluationsDone++
						reportProgress()
						mu.Unlock()
					}

					result := r.runSingleWithProgress(ctx, model, i, task, onGeneration, onEvaluation)

					mu.Lock()
					results = append(results, result)
					mu.Unlock()

					return nil
				})
			}
		}
	}

	g.Wait()

	return results
}

// ResolveUsage fetches usage information for all results with generation IDs.
// This should be called after Run() to populate the Usage field in results.
func (r *Runner) ResolveUsage(ctx context.Context, results []Result) {
	resolver, ok := r.client.(UsageResolver)
	if !ok {
		return
	}

	var wg sync.WaitGroup
	sem := make(chan struct{}, r.concurrency)

	for i := range results {
		if results[i].GenerationID == "" || results[i].Error != "" {
			continue
		}

		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			usage, err := resolver.GetGenerationUsage(ctx, results[idx].GenerationID)
			if err == nil {
				results[idx].Usage = usage
			}
		}(i)
	}

	wg.Wait()
}

// RunTest executes tasks as Go test subtests.
func (r *Runner) RunTest(t *testing.T, tasks []Task) {
	t.Helper()

	ctx, cancel := context.WithTimeout(context.Background(), r.timeout)
	defer cancel()

	for _, model := range r.targetModels {
		t.Run(model, func(t *testing.T) {
			for _, task := range tasks {
				t.Run(task.Name, func(t *testing.T) {
					for i := range r.numEvals {
						r.runTestIteration(ctx, t, model, i, task)
					}
				})
			}
		})
	}
}

func (r *Runner) runTestIteration(ctx context.Context, t *testing.T, model string, runNum int, task Task) {
	t.Attr("eval_run_number", strconv.Itoa(runNum))
	t.Attr("model", model)

	output, err := task.Execute(ctx, r.client, model)
	if err != nil {
		t.Fatalf("task execution failed: %v", err)
	}

	for _, s := range task.Grade(ctx, r.client, r.graderModel, output) {
		t.Attr("rubric_"+s.RubricName, "passed="+strconv.FormatBool(s.Passed)+" score="+strconv.Itoa(s.Value))
		if !s.Passed {
			t.Errorf("rubric %q failed: %s", s.RubricName, s.Reasoning)
		}
	}
}

// RunTest creates a default runner and executes tasks as test subtests.
// It skips if EVALS env is not set or OPENROUTER_API_KEY is missing.
func RunTest(t *testing.T, tasks []Task) {
	t.Helper()

	cfg, err := ParseConfig()
	if err != nil {
		t.Fatalf("failed to parse config: %v", err)
	}

	if !cfg.Enabled() {
		t.Skip("skipping LLM evals (set EVALS=1 to enable)")
	}

	if cfg.OpenRouterAPIKey == "" {
		t.Skip("skipping LLM evals (OPENROUTER_API_KEY is not set)")
	}

	New().RunTest(t, tasks)
}
