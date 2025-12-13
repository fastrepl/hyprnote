package evals

import (
	"time"

	"github.com/caarlos0/env/v11"
)

type Config struct {
	OpenRouterAPIKey string `env:"OPENROUTER_API_KEY"`
	NumEvals         int    `env:"EVALS"                  envDefault:"0"`
	TimeoutSeconds   int    `env:"EVALS_TIMEOUT_SECONDS"  envDefault:"60"`
	Concurrency      int    `env:"EVALS_CONCURRENCY"      envDefault:"4"`
}

func (c Config) Timeout() time.Duration {
	return time.Duration(c.TimeoutSeconds) * time.Second
}

func (c Config) Enabled() bool {
	return c.NumEvals > 0
}

func ParseConfig() (Config, error) {
	return env.ParseAs[Config]()
}
