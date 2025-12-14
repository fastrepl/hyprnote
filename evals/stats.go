package evals

import (
	"math"
)

// AggregatedGraderResponse holds aggregated statistics from multiple grader responses.
type AggregatedGraderResponse struct {
	PassRate           float64
	Passed             bool
	Reasoning          string
	Samples            int
	StandardDeviation  float64
	Variance           float64
	ConfidenceInterval ConfidenceInterval
	PassCount          int
	FailCount          int
}

// calculateBinaryStatistics computes standard deviation and variance for binary outcomes.
func calculateBinaryStatistics(passCount, totalCount int) (stdDev, variance float64) {
	if totalCount == 0 {
		return 0, 0
	}

	p := float64(passCount) / float64(totalCount)
	variance = p * (1 - p)
	stdDev = math.Sqrt(variance)
	return stdDev, variance
}

// calculateWilsonConfidenceInterval computes the Wilson score confidence interval
// for a binomial proportion. This provides better coverage than the normal approximation,
// especially for small sample sizes or extreme proportions.
func calculateWilsonConfidenceInterval(passCount, totalCount int, confidenceLevel float64) (lower, upper float64) {
	if totalCount == 0 {
		return 0, 0
	}

	z := 1.96
	if confidenceLevel == 0.99 {
		z = 2.576
	}

	p := float64(passCount) / float64(totalCount)
	n := float64(totalCount)

	denominator := 1 + z*z/n
	center := (p + z*z/(2*n)) / denominator
	margin := (z * math.Sqrt(p*(1-p)/n+z*z/(4*n*n))) / denominator

	lower = center - margin
	upper = center + margin

	if lower < 0 {
		lower = 0
	}
	if upper > 1 {
		upper = 1
	}

	return lower, upper
}

// aggregateGraderResponses combines multiple grader responses into a single aggregated result.
// It calculates pass rate, statistical measures, and confidence intervals.
func aggregateGraderResponses(responses []GraderResponse) AggregatedGraderResponse {
	if len(responses) == 0 {
		return AggregatedGraderResponse{}
	}

	passCount := 0
	var reasonings []string
	for _, r := range responses {
		if r.Verdict == "PASS" {
			passCount++
		}
		reasonings = append(reasonings, r.Reasoning)
	}

	totalCount := len(responses)
	failCount := totalCount - passCount
	passRate := float64(passCount) / float64(totalCount)

	stdDev, variance := calculateBinaryStatistics(passCount, totalCount)
	ciLower, ciUpper := calculateWilsonConfidenceInterval(passCount, totalCount, 0.95)

	return AggregatedGraderResponse{
		PassRate:          passRate,
		Passed:            passRate >= 0.5,
		Reasoning:         reasonings[0],
		Samples:           totalCount,
		StandardDeviation: stdDev,
		Variance:          variance,
		ConfidenceInterval: ConfidenceInterval{
			Lower: ciLower,
			Upper: ciUpper,
			Level: 0.95,
		},
		PassCount: passCount,
		FailCount: failCount,
	}
}
