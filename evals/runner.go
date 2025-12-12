package evals

import (
	"context"
	"errors"
	"strconv"
	"sync"
	"testing"
	"time"

	"github.com/openai/openai-go/v3"
	"golang.org/x/sync/errgroup"
	"golang.org/x/sync/semaphore"
)

// Result holds the outcome of a single evaluation run.
type Result struct {
	Name   string
	Model  string
	RunNum int
	Output string
	Scores []Score
	Error  string
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

// Runner executes evaluation tasks across multiple models.
type Runner struct {
	client       *openai.Client
	targetModels []string
	graderModel  string
	numEvals     int
	timeout      time.Duration
	concurrency  int
	OnProgress   func()
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

// New creates a Runner with the provided options.
func New(opts ...Option) *Runner {
	cfg, _ := ParseConfig()

	numEvals := cfg.NumEvals
	if numEvals <= 0 {
		numEvals = 1
	}

	r := &Runner{
		client:       newClient(cfg.OpenRouterAPIKey),
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

func (r *Runner) runSingle(ctx context.Context, model string, runNum int, task Task) Result {
	result := Result{
		Name:   task.Name,
		Model:  model,
		RunNum: runNum,
	}

	if task.Samples > 1 {
		outputs, err := task.ExecuteMulti(ctx, r.client, model)
		if err != nil {
			result.Error = err.Error()
			return result
		}

		if len(outputs) > 0 {
			result.Output = outputs[0]
		}
		result.Scores = task.GradeMulti(ctx, r.client, r.graderModel, outputs)
		return result
	}

	output, err := task.Execute(ctx, r.client, model)
	if err != nil {
		result.Error = err.Error()
		return result
	}

	result.Output = output
	result.Scores = task.Grade(ctx, r.client, r.graderModel, output)

	return result
}

// Run executes all tasks across all target models.
func (r *Runner) Run(ctx context.Context, tasks []Task) []Result {
	ctx, cancel := context.WithTimeout(ctx, r.timeout)
	defer cancel()

	sem := semaphore.NewWeighted(int64(r.concurrency))
	var mu sync.Mutex
	var results []Result

	g, ctx := errgroup.WithContext(ctx)

	for _, model := range r.targetModels {
		for _, task := range tasks {
			for i := range r.numEvals {
				g.Go(func() error {
					if err := sem.Acquire(ctx, 1); err != nil {
						return err
					}
					defer sem.Release(1)

					result := r.runSingle(ctx, model, i, task)

					mu.Lock()
					results = append(results, result)
					if r.OnProgress != nil {
						r.OnProgress()
					}
					mu.Unlock()

					return nil
				})
			}
		}
	}

	if err := g.Wait(); err != nil && !errors.Is(err, context.Canceled) && !errors.Is(err, context.DeadlineExceeded) {
		return results
	}

	return results
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
// It skips if GOEVALS env is not set or OPENROUTER_API_KEY is missing.
func RunTest(t *testing.T, tasks []Task) {
	t.Helper()

	cfg, _ := ParseConfig()
	if !cfg.Enabled() {
		t.Skip("skipping LLM evals (set GOEVALS=1 to enable)")
	}

	if cfg.OpenRouterAPIKey == "" {
		t.Skip("skipping LLM evals (OPENROUTER_API_KEY is not set)")
	}

	New().RunTest(t, tasks)
}
