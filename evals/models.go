package evals

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"sort"
	"strings"
	"time"
)

type OpenRouterModel struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type OpenRouterModelsResponse struct {
	Data []OpenRouterModel `json:"data"`
}

var cachedModels []string
var cacheTime time.Time
var cacheDuration = 5 * time.Minute

func FetchOpenRouterModels(ctx context.Context) ([]string, error) {
	if len(cachedModels) > 0 && time.Since(cacheTime) < cacheDuration {
		return cachedModels, nil
	}

	apiKey := os.Getenv("OPENROUTER_API_KEY")

	req, err := http.NewRequestWithContext(ctx, "GET", "https://openrouter.ai/api/v1/models", nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	if apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+apiKey)
	}

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch models: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status code: %d", resp.StatusCode)
	}

	var modelsResp OpenRouterModelsResponse
	if err := json.NewDecoder(resp.Body).Decode(&modelsResp); err != nil {
		return nil, fmt.Errorf("decode response: %w", err)
	}

	models := make([]string, 0, len(modelsResp.Data))
	for _, m := range modelsResp.Data {
		models = append(models, m.ID)
	}

	sort.Strings(models)

	cachedModels = models
	cacheTime = time.Now()

	return models, nil
}

func FilterModels(models []string, prefix string) []string {
	if prefix == "" {
		return models
	}

	var filtered []string
	for _, m := range models {
		if strings.HasPrefix(m, prefix) {
			filtered = append(filtered, m)
		}
	}
	return filtered
}
