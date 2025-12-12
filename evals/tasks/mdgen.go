package tasks

import (
	"hyprnote/evals"
)

var MDGen = evals.NewTask(
	"mdgen",
	map[string]any{
		"topic": "Go tests for LLM evaluation",
	},
	[]evals.Rubric{
		{
			Name:        "non_empty",
			Description: "Output is non-empty",
			Grader:      evals.NonEmptyGrader,
		},
		{
			Name:        "has_heading",
			Description: "Output contains a markdown heading",
			Grader:      evals.HasHeadingGrader,
		},
		{
			Name:        "has_list",
			Description: "Output contains a bullet list",
			Grader:      evals.HasListGrader,
		},
		{
			Name:        "has_code",
			Description: "Output contains a fenced code block",
			Grader:      evals.HasCodeGrader,
		},
		{
			Name:        "concise",
			Description: "Output is concise and under 150 words, staying focused on the topic",
			Grader:      evals.LLMGrader{},
		},
		{
			Name:        "technically_accurate",
			Description: "Output is technically accurate about Go testing and LLM evaluation",
			Grader:      evals.LLMGrader{},
		},
	},
)
