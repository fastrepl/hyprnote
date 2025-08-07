use std::collections::VecDeque;
use std::sync::{Arc, Mutex};

const MIN_DB: f32 = -60.0;
const METER_WIDTH: usize = 60;
const UPDATE_RATE_MS: u64 = 50;

struct AudioMeter {
    samples: Arc<Mutex<VecDeque<f32>>>,
    sample_rate: u32,
}

impl AudioMeter {
    fn new(sample_rate: u32) -> Self {
        Self {
            samples: Arc::new(Mutex::new(VecDeque::new())),
            sample_rate,
        }
    }

    fn push_samples(&self, data: &[f32]) {
        let mut samples = self.samples.lock().unwrap();
        samples.extend(data.iter().map(|&s| s.abs()));

        let max_samples = self.sample_rate as usize * 3;
        while samples.len() > max_samples {
            samples.pop_front();
        }
    }

    fn get_db(&self, window_secs: f32) -> f32 {
        let samples = self.samples.lock().unwrap();
        let window_size = (self.sample_rate as f32 * window_secs) as usize;

        if samples.is_empty() {
            return MIN_DB;
        }

        let start = samples.len().saturating_sub(window_size);
        let window: Vec<f32> = samples.iter().skip(start).copied().collect();

        if window.is_empty() {
            return MIN_DB;
        }

        let rms = (window.iter().map(|s| s * s).sum::<f32>() / window.len() as f32).sqrt();
        let db = 20.0 * rms.max(1e-10).log10();
        db.max(MIN_DB)
    }
}

fn color_for_db(db: f32) -> &'static str {
    match db {
        d if d >= -6.0 => "\x1b[91m",  // bright red
        d if d >= -12.0 => "\x1b[31m", // red
        d if d >= -20.0 => "\x1b[93m", // yellow
        d if d >= -40.0 => "\x1b[92m", // green
        _ => "\x1b[90m",               // dark gray
    }
}

fn draw_meter(db: f32, width: usize) -> String {
    let normalized = ((db - MIN_DB) / -MIN_DB).max(0.0).min(1.0);
    let filled = (normalized * width as f32) as usize;
    let color = color_for_db(db);

    let mut bar = String::new();
    bar.push_str(color);
    bar.push_str(&"█".repeat(filled));
    bar.push_str("\x1b[90m");
    bar.push_str(&"░".repeat(width - filled));
    bar.push_str("\x1b[0m");
    bar
}

fn draw_scale(width: usize) -> String {
    let mut scale = vec![' '; width + 1];
    let markers = [
        (0, "0"),
        (width / 6, "-10"),
        (width / 3, "-20"),
        (width / 2, "-30"),
        (width * 2 / 3, "-40"),
        (width * 5 / 6, "-50"),
    ];

    for (pos, label) in markers {
        if pos < width {
            for (i, ch) in label.chars().enumerate() {
                if pos + i < width {
                    scale[pos + i] = ch;
                }
            }
        }
    }

    scale.iter().collect()
}
