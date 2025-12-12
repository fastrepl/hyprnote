package evals

import (
	"context"
	"fmt"
	"os"
	"strconv"
	"testing"
	"time"

	"github.com/openai/openai-go/v3"
)

type EvalResult struct {
	Name          string
	Model         string
	RunNum        int
	LLMOutput     string
	RubricResults []RubricResult
	Error         string
}

func (r EvalResult) Passed() bool {
	if r.Error != "" {
		return false
	}
	for _, rr := range r.RubricResults {
		if !rr.Passed {
			return false
		}
	}
	return true
}

func (r EvalResult) Score() (passed, total int) {
	for _, rr := range r.RubricResults {
		total++
		if rr.Passed {
			passed++
		}
	}
	return
}

type Eval struct {
	ctx       context.Context
	client    openai.Client
	model     string
	runNumber int
	output    string
	failed    bool
	failMsg   string
}

func (e *Eval) Ctx() context.Context  { return e.ctx }
func (e *Eval) Client() openai.Client { return e.client }
func (e *Eval) Model() string         { return e.model }

func (e *Eval) SetOutput(output string) { e.output = output }

func (e *Eval) Fatalf(format string, args ...any) {
	e.failed = true
	e.failMsg = fmt.Sprintf(format, args...)
	panic(evalFailure{msg: e.failMsg})
}

type evalFailure struct{ msg string }

type EvalFunc func(e *Eval)

type EvalCase struct {
	Name    string
	Func    EvalFunc
	Rubrics []Rubric
}

func getConfig() (numEvals int, timeout time.Duration) {
	numEvals = 1
	if v := os.Getenv("GOEVALS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			numEvals = n
		}
	}

	timeout = 60 * time.Second
	if v := os.Getenv("GOEVALS_TIMEOUT_SECONDS"); v != "" {
		if s, err := strconv.Atoi(v); err == nil && s > 0 {
			timeout = time.Duration(s) * time.Second
		}
	}
	return
}

func runSingleEval(client openai.Client, model string, timeout time.Duration, runNum int, ec EvalCase) EvalResult {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	e := &Eval{
		ctx:       ctx,
		client:    client,
		model:     model,
		runNumber: runNum,
	}

	result := EvalResult{
		Name:   ec.Name,
		Model:  model,
		RunNum: runNum,
	}

	func() {
		defer func() {
			if r := recover(); r != nil {
				if _, ok := r.(evalFailure); !ok {
					e.failed = true
					e.failMsg = fmt.Sprintf("panic: %v", r)
				}
			}
		}()
		ec.Func(e)
	}()

	if e.failed {
		result.Error = e.failMsg
		return result
	}

	result.LLMOutput = e.output

	graderCfg := GraderConfig{
		Client: client,
		Model:  GraderModel,
	}

	for _, rubric := range ec.Rubrics {
		var rr RubricResult
		switch rubric.Grader {
		case GraderLLM:
			rr = GradeLLM(ctx, graderCfg, rubric, e.output)
		case GraderParser:
			rr = GradeParser(rubric, e.output)
		default:
			rr = RubricResult{
				RubricName: rubric.Name,
				Passed:     false,
				Reasoning:  fmt.Sprintf("unknown grader type: %s", rubric.Grader),
			}
		}
		result.RubricResults = append(result.RubricResults, rr)
	}

	return result
}

func RunAll(cases []EvalCase) []EvalResult {
	numEvals, timeout := getConfig()
	client := NewClient()

	var results []EvalResult
	for _, model := range TargetModels {
		for _, c := range cases {
			for i := range numEvals {
				r := runSingleEval(client, model, timeout, i, c)
				results = append(results, r)
			}
		}
	}
	return results
}

type testingEval struct {
	*testing.T
	*Eval
}

func (te *testingEval) Fatalf(format string, args ...any) {
	te.T.Helper()
	te.T.Fatalf(format, args...)
}

func RunTest(t *testing.T, cases []EvalCase) {
	t.Helper()

	v := os.Getenv("GOEVALS")
	if v == "" || v == "0" || v == "false" {
		t.Skip("skipping LLM evals (set GOEVALS=1 to enable)")
	}

	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		t.Skip("skipping LLM evals (OPENROUTER_API_KEY is not set)")
	}

	numEvals, timeout := getConfig()
	client := NewClient()

	for _, model := range TargetModels {
		t.Run(model, func(t *testing.T) {
			for _, c := range cases {
				t.Run(c.Name, func(t *testing.T) {
					for i := range numEvals {
						ctx, cancel := context.WithTimeout(context.Background(), timeout)
						e := &Eval{
							ctx:       ctx,
							client:    client,
							model:     model,
							runNumber: i,
						}
						te := &testingEval{T: t, Eval: e}
						te.T.Attr("eval_run_number", strconv.Itoa(i))
						te.T.Attr("model", model)

						func() {
							defer func() {
								if r := recover(); r != nil {
									if _, ok := r.(evalFailure); ok {
										te.T.Fatalf("%s", e.failMsg)
									} else {
										te.T.Fatalf("panic: %v", r)
									}
								}
							}()
							c.Func(e)
						}()

						graderCfg := GraderConfig{
							Client: client,
							Model:  GraderModel,
						}

						for _, rubric := range c.Rubrics {
							var rr RubricResult
							switch rubric.Grader {
							case GraderLLM:
								rr = GradeLLM(ctx, graderCfg, rubric, e.output)
							case GraderParser:
								rr = GradeParser(rubric, e.output)
							}

							te.T.Attr("rubric_"+rubric.Name, fmt.Sprintf("passed=%v score=%d", rr.Passed, rr.Score))
							if !rr.Passed {
								te.T.Errorf("rubric %q failed: %s", rubric.Name, rr.Reasoning)
							}
						}

						cancel()
					}
				})
			}
		})
	}
}
