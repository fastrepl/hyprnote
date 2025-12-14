package evals

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"sort"
	"strings"
	"sync"
	"time"
)

// OpenRouterModel represents a model available on OpenRouter.
type OpenRouterModel struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

// OpenRouterModelsResponse is the API response for listing models.
type OpenRouterModelsResponse struct {
	Data []OpenRouterModel `json:"data"`
}

// modelCache holds the cached models list with thread-safe access.
var modelCache struct {
	sync.RWMutex
	models    []string
	fetchedAt time.Time
}

const modelCacheDuration = 5 * time.Minute

// FetchOpenRouterModels fetches the list of available models from OpenRouter.
// Results are cached for 5 minutes to reduce API calls.
func FetchOpenRouterModels(ctx context.Context) ([]string, error) {
	modelCache.RLock()
	if len(modelCache.models) > 0 && time.Since(modelCache.fetchedAt) < modelCacheDuration {
		models := modelCache.models
		modelCache.RUnlock()
		return models, nil
	}
	modelCache.RUnlock()

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

	modelCache.Lock()
	modelCache.models = models
	modelCache.fetchedAt = time.Now()
	modelCache.Unlock()

	return models, nil
}

// FilterModels returns models that start with the given prefix.
// If prefix is empty, all models are returned.
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
