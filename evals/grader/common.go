package grader

import (
	"strings"
)

func IsNonEmpty(output string) (bool, string) {
	if strings.TrimSpace(output) == "" {
		return false, "output is empty"
	}
	return true, "output is non-empty"
}
