use crate::{DiarizeOutputChunk, TranscribeOutputChunk};

pub trait Interval {
    fn start(&self) -> f32;
    fn end(&self) -> f32;

    fn overlaps<I: Interval>(&self, other: &I) -> Option<f32> {
        if self.start() < other.end() && self.end() > other.start() {
            let overlap_start = f32::max(self.start(), other.start());
            let overlap_end = f32::min(self.end(), other.end());
            Some(overlap_end - overlap_start)
        } else {
            None
        }
    }
}

impl Interval for DiarizeOutputChunk {
    fn start(&self) -> f32 {
        self.start
    }
    fn end(&self) -> f32 {
        self.end
    }
}

impl Interval for TranscribeOutputChunk {
    fn start(&self) -> f32 {
        self.start
    }
    fn end(&self) -> f32 {
        self.end
    }
}

#[derive(Debug, Default)]
pub struct Timeline {
    transcripts: Vec<TranscribeOutputChunk>,
    diarizations: Vec<DiarizeOutputChunk>,
}

#[derive(Debug, PartialEq)]
pub struct TimelineView {
    pub items: Vec<TimelineViewItem>,
}

#[derive(Debug, PartialEq)]
pub struct TimelineViewItem {
    pub label: String,
    pub text: String,
}

impl Timeline {
    pub fn add_transcribe(&mut self, item: TranscribeOutputChunk) {
        self.transcripts.push(item);
    }

    pub fn add_diarize(&mut self, item: DiarizeOutputChunk) {
        self.diarizations.push(item);
    }

    pub fn view(&self) -> TimelineView {
        let mut transcripts = self.transcripts.clone();
        let mut diarizations = self.diarizations.clone();

        transcripts.sort_by(|a, b| {
            a.start
                .partial_cmp(&b.start)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        diarizations.sort_by(|a, b| {
            a.start
                .partial_cmp(&b.start)
                .unwrap_or(std::cmp::Ordering::Equal)
        });

        let mut assigned = Vec::new();
        for t in &transcripts {
            let mut best_speaker = "Unknown".to_string();
            let mut best_overlap = 0.0;

            for d in &diarizations {
                if let Some(ov) = t.overlaps(d) {
                    if ov > best_overlap {
                        best_overlap = ov;
                        best_speaker = d.speaker.clone();
                    }
                }
            }

            assigned.push(TranscriptWithSpeaker {
                start: t.start,
                end: t.end,
                speaker: best_speaker,
                text: t.text.clone(),
            });
        }

        let merged = merge_transcripts(assigned);

        let items = merged
            .into_iter()
            .map(|m| TimelineViewItem {
                label: m.speaker,
                text: m.text,
            })
            .collect();

        TimelineView { items }
    }
}

#[derive(Debug, Clone)]
struct TranscriptWithSpeaker {
    start: f32,
    end: f32,
    speaker: String,
    text: String,
}

fn merge_transcripts(mut tws: Vec<TranscriptWithSpeaker>) -> Vec<TranscriptWithSpeaker> {
    if tws.is_empty() {
        return tws;
    }

    let mut merged = Vec::new();
    merged.push(tws[0].clone());

    for i in 1..tws.len() {
        let current = &tws[i];
        let last = merged.last_mut().unwrap();

        if last.speaker == current.speaker && (last.end - current.start).abs() < f32::EPSILON {
            last.end = current.end;
            last.text = {
                if last.text.ends_with('.') {
                    format!("{} {}", last.text, current.text).to_string()
                } else {
                    format!("{}{}", last.text, current.text).to_string()
                }
            };
        } else {
            merged.push(current.clone());
        }
    }
    merged
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_timeline() {
        let mut timeline = Timeline::default();

        timeline.add_transcribe(TranscribeOutputChunk {
            text: "Hello world".to_string(),
            start: 0.0,
            end: 2.0,
        });

        timeline.add_transcribe(TranscribeOutputChunk {
            text: "Another sentence".to_string(),
            start: 2.0,
            end: 3.0,
        });

        timeline.add_diarize(DiarizeOutputChunk {
            speaker: "Speaker A".to_string(),
            start: 0.0,
            end: 1.5,
        });

        timeline.add_diarize(DiarizeOutputChunk {
            speaker: "Speaker B".to_string(),
            start: 1.5,
            end: 3.0,
        });

        assert_eq!(
            timeline.view(),
            TimelineView {
                items: vec![
                    TimelineViewItem {
                        label: "Speaker A".to_string(),
                        text: "Hello world".to_string()
                    },
                    TimelineViewItem {
                        label: "Speaker B".to_string(),
                        text: "Another sentence".to_string()
                    }
                ]
            }
        );
    }

    #[test]
    fn test_timeline() {
        let mut timeline = Timeline::default();

        timeline.add_diarize(DiarizeOutputChunk {
            speaker: "Speaker A".to_string(),
            start: 0.0,
            end: 1.0,
        });

        timeline.add_transcribe(TranscribeOutputChunk {
            text: "Hello".to_string(),
            start: 0.0,
            end: 1.0,
        });
        timeline.add_transcribe(TranscribeOutputChunk {
            text: "World".to_string(),
            start: 1.0,
            end: 2.0,
        });
        // 2 transcripts, both presumably match Speaker A in [0..2]

        timeline.add_diarize(DiarizeOutputChunk {
            speaker: "Speaker A".to_string(),
            start: 0.0,
            end: 2.0,
        });

        // We expect them to merge into a single item:
        // label = "Speaker A", text = "Hello World"
        let view = timeline.view();
        assert_eq!(
            view,
            TimelineView {
                items: vec![TimelineViewItem {
                    label: "Speaker A".to_string(),
                    text: "Hello World".to_string()
                }]
            }
        );
    }
}
