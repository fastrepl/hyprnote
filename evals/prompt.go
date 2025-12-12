package evals

import (
	"fmt"

	jinja2 "github.com/kluctl/kluctl/lib/go-jinja2"
)

func RenderPrompt(tpl string, vars map[string]any) (string, error) {
	r, err := jinja2.NewJinja2("", 1)
	if err != nil {
		return "", fmt.Errorf("jinja2: init: %w", err)
	}
	defer r.Close()
	out, err := r.RenderString(tpl, jinja2.WithGlobals(vars))
	if err != nil {
		return "", fmt.Errorf("jinja2: render: %w", err)
	}
	return out, nil
}
