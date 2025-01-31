use intervaltree::IntervalTree;
use ordered_float::OrderedFloat;

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

#[derive(Debug, Clone)]
pub struct Timeline {
    transcripts: Vec<TranscribeOutputChunk>,
    diarizations: Vec<DiarizeOutputChunk>,
}

impl Default for Timeline {
    fn default() -> Self {
        Self {
            transcripts: Vec::new(),
            diarizations: Vec::new(),
        }
    }
}

#[derive(Debug, PartialEq)]
pub struct TimelineView {
    pub items: Vec<TimelineViewItem>,
}

#[derive(Debug, PartialEq)]
pub struct TimelineViewItem {
    start: f32,
    end: f32,
    speaker: String,
    text: String,
}

impl Timeline {
    pub fn add_transcribe(&mut self, item: TranscribeOutputChunk) {
        self.transcripts.push(item);
    }

    pub fn add_diarize(&mut self, item: DiarizeOutputChunk) {
        self.diarizations.push(item);
    }

    pub fn view(&self) -> TimelineView {
        let tree: IntervalTree<OrderedFloat<f32>, String> =
            IntervalTree::from_iter(self.diarizations.iter().map(|d| {
                (
                    OrderedFloat(d.start)..OrderedFloat(d.end),
                    d.speaker.clone(),
                )
            }));

        let mut items: Vec<TimelineViewItem> = vec![];

        for transcript in self.transcripts.iter() {
            let range = OrderedFloat(transcript.start - 0.1)..OrderedFloat(transcript.end + 0.1);
            let speaker: Vec<_> = tree.query(range).collect();

            if speaker.is_empty() {
                continue;
            }

            let speaker = speaker
                .iter()
                .max_by(|a, b| {
                    let a_overlap = {
                        let overlap_start = f32::max(a.range.start.into(), transcript.start);
                        let overlap_end = f32::min(a.range.end.into(), transcript.end);
                        OrderedFloat(overlap_end - overlap_start)
                    };
                    let b_overlap = {
                        let overlap_start = f32::max(b.range.start.into(), transcript.start);
                        let overlap_end = f32::min(b.range.end.into(), transcript.end);
                        OrderedFloat(overlap_end - overlap_start)
                    };

                    a_overlap.cmp(&b_overlap)
                })
                .unwrap()
                .value
                .clone();

            items.push(TimelineViewItem {
                start: transcript.start,
                end: transcript.end,
                speaker,
                text: transcript.text.clone(),
            });
        }

        TimelineView { items }
    }
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
                        start: 0.0,
                        end: 2.0,
                        speaker: "Speaker A".to_string(),
                        text: "Hello world".to_string()
                    },
                    TimelineViewItem {
                        start: 2.0,
                        end: 3.0,
                        speaker: "Speaker B".to_string(),
                        text: "Another sentence".to_string()
                    }
                ]
            }
        );
    }
}
