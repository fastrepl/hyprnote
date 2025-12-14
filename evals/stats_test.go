package evals

import (
	"math"
	"testing"
)

func TestCalculateBinaryStatistics(t *testing.T) {
	tests := []struct {
		name       string
		passCount  int
		totalCount int
		wantStdDev float64
		wantVar    float64
	}{
		{
			name:       "all pass",
			passCount:  10,
			totalCount: 10,
			wantStdDev: 0,
			wantVar:    0,
		},
		{
			name:       "all fail",
			passCount:  0,
			totalCount: 10,
			wantStdDev: 0,
			wantVar:    0,
		},
		{
			name:       "50/50 split",
			passCount:  5,
			totalCount: 10,
			wantStdDev: 0.5,
			wantVar:    0.25,
		},
		{
			name:       "90% pass rate",
			passCount:  9,
			totalCount: 10,
			wantStdDev: 0.3,
			wantVar:    0.09,
		},
		{
			name:       "empty",
			passCount:  0,
			totalCount: 0,
			wantStdDev: 0,
			wantVar:    0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			stdDev, variance := calculateBinaryStatistics(tt.passCount, tt.totalCount)
			if !floatEquals(stdDev, tt.wantStdDev, 0.001) {
				t.Errorf("calculateBinaryStatistics() stdDev = %v, want %v", stdDev, tt.wantStdDev)
			}
			if !floatEquals(variance, tt.wantVar, 0.001) {
				t.Errorf("calculateBinaryStatistics() variance = %v, want %v", variance, tt.wantVar)
			}
		})
	}
}

func TestCalculateWilsonConfidenceInterval(t *testing.T) {
	tests := []struct {
		name            string
		passCount       int
		totalCount      int
		confidenceLevel float64
		wantLower       float64
		wantUpper       float64
	}{
		{
			name:            "all pass n=10",
			passCount:       10,
			totalCount:      10,
			confidenceLevel: 0.95,
			wantLower:       0.722,
			wantUpper:       1.0,
		},
		{
			name:            "all fail n=10",
			passCount:       0,
			totalCount:      10,
			confidenceLevel: 0.95,
			wantLower:       0.0,
			wantUpper:       0.278,
		},
		{
			name:            "50/50 split n=10",
			passCount:       5,
			totalCount:      10,
			confidenceLevel: 0.95,
			wantLower:       0.236,
			wantUpper:       0.764,
		},
		{
			name:            "90% pass rate n=10",
			passCount:       9,
			totalCount:      10,
			confidenceLevel: 0.95,
			wantLower:       0.596,
			wantUpper:       0.984,
		},
		{
			name:            "empty",
			passCount:       0,
			totalCount:      0,
			confidenceLevel: 0.95,
			wantLower:       0,
			wantUpper:       0,
		},
		{
			name:            "single sample pass",
			passCount:       1,
			totalCount:      1,
			confidenceLevel: 0.95,
			wantLower:       0.206,
			wantUpper:       1.0,
		},
		{
			name:            "single sample fail",
			passCount:       0,
			totalCount:      1,
			confidenceLevel: 0.95,
			wantLower:       0.0,
			wantUpper:       0.794,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			lower, upper := calculateWilsonConfidenceInterval(tt.passCount, tt.totalCount, tt.confidenceLevel)
			if !floatEquals(lower, tt.wantLower, 0.01) {
				t.Errorf("calculateWilsonConfidenceInterval() lower = %v, want %v", lower, tt.wantLower)
			}
			if !floatEquals(upper, tt.wantUpper, 0.01) {
				t.Errorf("calculateWilsonConfidenceInterval() upper = %v, want %v", upper, tt.wantUpper)
			}
		})
	}
}

func TestAggregateGraderResponses(t *testing.T) {
	tests := []struct {
		name      string
		responses []GraderResponse
		wantAgg   AggregatedGraderResponse
	}{
		{
			name:      "empty responses",
			responses: []GraderResponse{},
			wantAgg:   AggregatedGraderResponse{},
		},
		{
			name: "all pass",
			responses: []GraderResponse{
				{Verdict: "PASS", Reasoning: "good"},
				{Verdict: "PASS", Reasoning: "great"},
				{Verdict: "PASS", Reasoning: "excellent"},
			},
			wantAgg: AggregatedGraderResponse{
				PassStats: PassStats{
					PassRate:          1.0,
					Samples:           3,
					StandardDeviation: 0,
					Variance:          0,
					PassCount:         3,
					FailCount:         0,
				},
				Passed:    true,
				Reasoning: "good",
			},
		},
		{
			name: "all fail",
			responses: []GraderResponse{
				{Verdict: "FAIL", Reasoning: "bad"},
				{Verdict: "FAIL", Reasoning: "poor"},
				{Verdict: "FAIL", Reasoning: "wrong"},
			},
			wantAgg: AggregatedGraderResponse{
				PassStats: PassStats{
					PassRate:          0,
					Samples:           3,
					StandardDeviation: 0,
					Variance:          0,
					PassCount:         0,
					FailCount:         3,
				},
				Passed:    false,
				Reasoning: "bad",
			},
		},
		{
			name: "mixed results 2/3 pass",
			responses: []GraderResponse{
				{Verdict: "PASS", Reasoning: "good"},
				{Verdict: "PASS", Reasoning: "great"},
				{Verdict: "FAIL", Reasoning: "bad"},
			},
			wantAgg: AggregatedGraderResponse{
				PassStats: PassStats{
					PassRate:          0.667,
					Samples:           3,
					StandardDeviation: 0.471,
					Variance:          0.222,
					PassCount:         2,
					FailCount:         1,
				},
				Passed:    true,
				Reasoning: "good",
			},
		},
		{
			name: "mixed results 1/3 pass",
			responses: []GraderResponse{
				{Verdict: "PASS", Reasoning: "good"},
				{Verdict: "FAIL", Reasoning: "bad"},
				{Verdict: "FAIL", Reasoning: "poor"},
			},
			wantAgg: AggregatedGraderResponse{
				PassStats: PassStats{
					PassRate:          0.333,
					Samples:           3,
					StandardDeviation: 0.471,
					Variance:          0.222,
					PassCount:         1,
					FailCount:         2,
				},
				Passed:    false,
				Reasoning: "good",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			agg := aggregateGraderResponses(tt.responses)

			if !floatEquals(agg.PassRate, tt.wantAgg.PassRate, 0.01) {
				t.Errorf("PassRate = %v, want %v", agg.PassRate, tt.wantAgg.PassRate)
			}
			if agg.Passed != tt.wantAgg.Passed {
				t.Errorf("Passed = %v, want %v", agg.Passed, tt.wantAgg.Passed)
			}
			if agg.Reasoning != tt.wantAgg.Reasoning {
				t.Errorf("Reasoning = %v, want %v", agg.Reasoning, tt.wantAgg.Reasoning)
			}
			if agg.Samples != tt.wantAgg.Samples {
				t.Errorf("Samples = %v, want %v", agg.Samples, tt.wantAgg.Samples)
			}
			if !floatEquals(agg.StandardDeviation, tt.wantAgg.StandardDeviation, 0.01) {
				t.Errorf("StandardDeviation = %v, want %v", agg.StandardDeviation, tt.wantAgg.StandardDeviation)
			}
			if !floatEquals(agg.Variance, tt.wantAgg.Variance, 0.01) {
				t.Errorf("Variance = %v, want %v", agg.Variance, tt.wantAgg.Variance)
			}
			if agg.PassCount != tt.wantAgg.PassCount {
				t.Errorf("PassCount = %v, want %v", agg.PassCount, tt.wantAgg.PassCount)
			}
			if agg.FailCount != tt.wantAgg.FailCount {
				t.Errorf("FailCount = %v, want %v", agg.FailCount, tt.wantAgg.FailCount)
			}
		})
	}
}

func TestAggregateGraderResponsesConfidenceInterval(t *testing.T) {
	responses := []GraderResponse{
		{Verdict: "PASS", Reasoning: "good"},
		{Verdict: "PASS", Reasoning: "great"},
		{Verdict: "FAIL", Reasoning: "bad"},
	}

	agg := aggregateGraderResponses(responses)

	if agg.ConfidenceInterval.Level != 0.95 {
		t.Errorf("ConfidenceInterval.Level = %v, want 0.95", agg.ConfidenceInterval.Level)
	}
	if agg.ConfidenceInterval.Lower < 0 || agg.ConfidenceInterval.Lower > 1 {
		t.Errorf("ConfidenceInterval.Lower = %v, should be in [0, 1]", agg.ConfidenceInterval.Lower)
	}
	if agg.ConfidenceInterval.Upper < 0 || agg.ConfidenceInterval.Upper > 1 {
		t.Errorf("ConfidenceInterval.Upper = %v, should be in [0, 1]", agg.ConfidenceInterval.Upper)
	}
	if agg.ConfidenceInterval.Lower > agg.ConfidenceInterval.Upper {
		t.Errorf("ConfidenceInterval.Lower (%v) > Upper (%v)", agg.ConfidenceInterval.Lower, agg.ConfidenceInterval.Upper)
	}
	if agg.PassRate < agg.ConfidenceInterval.Lower || agg.PassRate > agg.ConfidenceInterval.Upper {
		t.Errorf("PassRate (%v) not within CI [%v, %v]", agg.PassRate, agg.ConfidenceInterval.Lower, agg.ConfidenceInterval.Upper)
	}
}

func floatEquals(a, b, tolerance float64) bool {
	return math.Abs(a-b) <= tolerance
}
