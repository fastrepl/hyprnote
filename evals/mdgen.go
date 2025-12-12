package evals

const mdgenPrompt = "You are a careful technical writer.\n\n" +
	"Write a short Markdown document about \"{{ topic }}\".\n\n" +
	"Requirements:\n" +
	"- Must start with a level-2 heading (## ...)\n" +
	"- Must include a bullet list (at least 3 items)\n" +
	"- Must include a fenced code block (``` ... ```)\n" +
	"- Keep it under 120 words.\n\n" +
	"Only output Markdown. No surrounding explanations.\n"

func MDGen(e *Eval) {
	prompt, err := RenderPrompt(mdgenPrompt, map[string]any{
		"topic": "Go tests for LLM evaluation",
	})
	if err != nil {
		e.Fatalf("render prompt: %v", err)
	}

	out, err := GenerateText(e.Ctx(), e.Client(), e.Model(), prompt)
	if err != nil {
		e.Fatalf("generate: %v", err)
	}

	e.SetOutput(out)
}

var MDGenRubrics = []Rubric{
	{
		Name:        "non_empty",
		Description: "Output is non-empty",
		Grader:      GraderParser,
		GraderFunc:  IsNonEmpty,
	},
	{
		Name:        "has_heading",
		Description: "Output contains a markdown heading",
		Grader:      GraderParser,
		GraderFunc:  HasMarkdownHeading,
	},
	{
		Name:        "has_list",
		Description: "Output contains a bullet list",
		Grader:      GraderParser,
		GraderFunc:  HasMarkdownList,
	},
	{
		Name:        "has_code",
		Description: "Output contains a fenced code block",
		Grader:      GraderParser,
		GraderFunc:  HasMarkdownCode,
	},
	{
		Name:        "concise",
		Description: "Output is concise and under 150 words, staying focused on the topic",
		Grader:      GraderLLM,
	},
	{
		Name:        "technically_accurate",
		Description: "Output is technically accurate about Go testing and LLM evaluation",
		Grader:      GraderLLM,
	},
}

var AllEvals = []EvalCase{
	{Name: "mdgen", Func: MDGen, Rubrics: MDGenRubrics},
}
