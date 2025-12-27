use crate::GraderResponse;

#[derive(Debug, Clone, Default)]
pub struct ConfidenceInterval {
    pub lower: f64,
    pub upper: f64,
    pub level: f64,
}

#[derive(Debug, Clone, Default)]
pub struct PassStats {
    pub pass_rate: f64,
    pub samples: i32,
    pub standard_deviation: f64,
    pub variance: f64,
    pub confidence_interval: ConfidenceInterval,
    pub pass_count: i32,
    pub fail_count: i32,
}

pub fn calc_pass_stats(pass_count: i32, total_count: i32) -> PassStats {
    if total_count == 0 {
        return PassStats::default();
    }

    let fail_count = total_count - pass_count;
    let pass_rate = pass_count as f64 / total_count as f64;
    let (std_dev, variance) = calculate_binary_statistics(pass_count, total_count);
    let (ci_lower, ci_upper) = calculate_wilson_confidence_interval(pass_count, total_count, 0.95);

    PassStats {
        pass_rate,
        samples: total_count,
        standard_deviation: std_dev,
        variance,
        confidence_interval: ConfidenceInterval {
            lower: ci_lower,
            upper: ci_upper,
            level: 0.95,
        },
        pass_count,
        fail_count,
    }
}

#[derive(Debug, Clone)]
pub struct AggregatedGraderResponse {
    pub pass_stats: PassStats,
    pub passed: bool,
    pub reasoning: String,
}

fn calculate_binary_statistics(pass_count: i32, total_count: i32) -> (f64, f64) {
    if total_count == 0 {
        return (0.0, 0.0);
    }

    let p = pass_count as f64 / total_count as f64;
    let variance = p * (1.0 - p);
    let std_dev = variance.sqrt();
    (std_dev, variance)
}

fn calculate_wilson_confidence_interval(
    pass_count: i32,
    total_count: i32,
    confidence_level: f64,
) -> (f64, f64) {
    if total_count == 0 {
        return (0.0, 0.0);
    }

    let z = if confidence_level == 0.99 {
        2.576
    } else {
        1.96
    };

    let p = pass_count as f64 / total_count as f64;
    let n = total_count as f64;

    let denominator = 1.0 + z * z / n;
    let center = (p + z * z / (2.0 * n)) / denominator;
    let margin = (z * (p * (1.0 - p) / n + z * z / (4.0 * n * n)).sqrt()) / denominator;

    let mut lower = center - margin;
    let mut upper = center + margin;

    if lower < 0.0 {
        lower = 0.0;
    }
    if upper > 1.0 {
        upper = 1.0;
    }

    (lower, upper)
}

pub fn aggregate_grader_responses(responses: &[GraderResponse]) -> AggregatedGraderResponse {
    if responses.is_empty() {
        return AggregatedGraderResponse {
            pass_stats: PassStats::default(),
            passed: false,
            reasoning: String::new(),
        };
    }

    let mut pass_count = 0;
    let mut first_reasoning = String::new();

    for (i, r) in responses.iter().enumerate() {
        if r.verdict == "PASS" {
            pass_count += 1;
        }
        if i == 0 {
            first_reasoning = r.reasoning.clone();
        }
    }

    let stats = calc_pass_stats(pass_count, responses.len() as i32);
    AggregatedGraderResponse {
        passed: stats.pass_rate >= 0.5,
        reasoning: first_reasoning,
        pass_stats: stats,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_calc_pass_stats_empty() {
        let stats = calc_pass_stats(0, 0);
        assert_eq!(stats.pass_rate, 0.0);
        assert_eq!(stats.samples, 0);
    }

    #[test]
    fn test_calc_pass_stats_all_pass() {
        let stats = calc_pass_stats(10, 10);
        assert_eq!(stats.pass_rate, 1.0);
        assert_eq!(stats.pass_count, 10);
        assert_eq!(stats.fail_count, 0);
    }

    #[test]
    fn test_calc_pass_stats_half() {
        let stats = calc_pass_stats(5, 10);
        assert_eq!(stats.pass_rate, 0.5);
        assert_eq!(stats.pass_count, 5);
        assert_eq!(stats.fail_count, 5);
    }

    #[test]
    fn test_wilson_confidence_interval() {
        let (lower, upper) = calculate_wilson_confidence_interval(50, 100, 0.95);
        assert!(lower > 0.0 && lower < 0.5);
        assert!(upper > 0.5 && upper < 1.0);
    }
}
