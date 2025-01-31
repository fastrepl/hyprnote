use intervaltree::IntervalTree;

use crate::{DiarizeOutputChunk, TranscribeOutputChunk};

pub trait Interval {
    fn start(&self) -> u64;
    fn end(&self) -> u64;

    fn overlaps<I: Interval>(&self, other: &I) -> Option<u64> {
        if self.start() < other.end() && self.end() > other.start() {
            let overlap_start = std::cmp::max(self.start(), other.start());
            let overlap_end = std::cmp::min(self.end(), other.end());
            Some(overlap_end - overlap_start)
        } else {
            None
        }
    }
}

impl Interval for DiarizeOutputChunk {
    fn start(&self) -> u64 {
        self.start
    }
    fn end(&self) -> u64 {
        self.end
    }
}

impl Interval for TranscribeOutputChunk {
    fn start(&self) -> u64 {
        self.start
    }
    fn end(&self) -> u64 {
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
    start: u64,
    end: u64,
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
        let tree: IntervalTree<u64, String> = IntervalTree::from_iter(
            self.diarizations
                .iter()
                .map(|d| (d.start..d.end, d.speaker.clone())),
        );

        let mut items: Vec<TimelineViewItem> = vec![];

        for transcript in self.transcripts.iter() {
            let range = transcript.start - 100..transcript.end + 100;
            let speaker: Vec<_> = tree.query(range).collect();

            if speaker.is_empty() {
                continue;
            }

            let speaker = speaker
                .iter()
                .max_by(|a, b| {
                    let a_overlap = {
                        let overlap_start = std::cmp::max(a.range.start, transcript.start);
                        let overlap_end = std::cmp::min(a.range.end, transcript.end);
                        overlap_end - overlap_start
                    };
                    let b_overlap = {
                        let overlap_start = std::cmp::max(b.range.start, transcript.start);
                        let overlap_end = std::cmp::min(b.range.end, transcript.end);
                        overlap_end - overlap_start
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
            start: 0,
            end: 2000,
        });

        timeline.add_transcribe(TranscribeOutputChunk {
            text: "Another sentence".to_string(),
            start: 2000,
            end: 3000,
        });

        timeline.add_diarize(DiarizeOutputChunk {
            speaker: "Speaker A".to_string(),
            start: 0,
            end: 1500,
        });

        timeline.add_diarize(DiarizeOutputChunk {
            speaker: "Speaker B".to_string(),
            start: 1500,
            end: 3000,
        });

        assert_eq!(
            timeline.view(),
            TimelineView {
                items: vec![
                    TimelineViewItem {
                        start: 0,
                        end: 2000,
                        speaker: "Speaker A".to_string(),
                        text: "Hello world".to_string()
                    },
                    TimelineViewItem {
                        start: 2000,
                        end: 3000,
                        speaker: "Speaker B".to_string(),
                        text: "Another sentence".to_string()
                    }
                ]
            }
        );
    }
}
