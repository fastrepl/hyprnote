package tasks

import (
	"hyprnote/evals"
)

type MDGenInputs struct {
	Topic string
}

func (in MDGenInputs) ToMap() map[string]any {
	return map[string]any{
		"topic": in.Topic,
	}
}

var MDGen = evals.NewTask(
	"mdgen",
	MDGenInputs{
		Topic: "Go tests for LLM evaluation",
	},
	[]evals.Rubric{
		{
			Name:        "non_empty",
			Description: "Output is non-empty",
			Grader:      evals.NonEmptyGrader,
		},
		{
			Name:        "format",
			Description: "Output follows h1 headers with unordered lists format",
			Grader: evals.FormatMatcherGrader(evals.FormatSpec{
				Sections: []evals.SectionSpec{
					{Header: evals.HeaderSpec{Level: 1}, ListOnly: true},
					{Header: evals.HeaderSpec{Level: 1}, ListOnly: true},
				},
			}),
		},
		{
			Name:        "concise",
			Description: "Output is concise and under 150 words, staying focused on the topic",
			Grader:      evals.LLMGrader{Samples: 3},
		},
		{
			Name:        "technically_accurate",
			Description: "Output is technically accurate about Go testing and LLM evaluation",
			Grader:      evals.LLMGrader{Samples: 3},
		},
	},
)
