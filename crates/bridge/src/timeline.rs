use crate::{DiarizeOutputChunk, TranscribeOutputChunk};
use intervaltree::IntervalTree;

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

#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct TimelineView {
    pub items: Vec<TimelineViewItem>,
}

impl std::fmt::Display for TimelineView {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        for item in self.items.iter() {
            writeln!(f, "{}", item)?;
        }
        Ok(())
    }
}

#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct TimelineViewItem {
    start: u64,
    end: u64,
    speaker: String,
    text: String,
}

impl std::fmt::Display for TimelineViewItem {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(
            f,
            "({:5.2}..{:5.2}) {}\n{}\n",
            self.start as f64 / 1000.0,
            self.end as f64 / 1000.0,
            self.speaker,
            self.text
        )
    }
}

impl Timeline {
    pub fn add_transcription(&mut self, item: TranscribeOutputChunk) {
        self.transcripts.push(item);
    }

    pub fn add_diarization(&mut self, item: DiarizeOutputChunk) {
        if let Some(index) = self
            .diarizations
            .iter()
            .position(|x| x.start() == item.start())
        {
            self.diarizations[index] = item;
        } else {
            self.diarizations.push(item);
        }
    }

    pub fn view(&self) -> TimelineView {
        let tree: IntervalTree<u64, String> = IntervalTree::from_iter(
            self.diarizations
                .iter()
                .map(|d| (d.start..d.end, d.speaker.clone())),
        );

        let mut items: Vec<TimelineViewItem> = vec![];

        for transcript in self.transcripts.iter() {
            let range = transcript.start.saturating_sub(100)..transcript.end.saturating_add(100);
            let speakers: Vec<_> = tree.query(range).collect();

            if speakers.is_empty() {
                if let Some(last_item) = items.last_mut() {
                    last_item.end = transcript.end;
                    last_item.text.push_str(&transcript.text);
                }

                continue;
            }

            let speaker = speakers
                .iter()
                .map(|entry| {
                    let diarization_interval = entry.range.start..entry.range.end;
                    let overlap = transcript
                        .overlaps(
                            &(hypr_db::user::DiarizationChunk {
                                start: diarization_interval.start,
                                end: diarization_interval.end,
                                speaker: entry.value.clone(),
                            }),
                        )
                        .unwrap_or(0);
                    (entry.value.clone(), overlap)
                })
                .max_by_key(|(_, overlap)| *overlap)
                .map(|(speaker, _)| speaker)
                .unwrap();

            if let Some(last_item) = items.last_mut() {
                if last_item.speaker == speaker {
                    last_item.end = transcript.end;
                    last_item.text.push_str(&transcript.text);
                    continue;
                }
            }

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
    fn test_korean_1() {
        let transcripts: Vec<TranscribeOutputChunk> =
            serde_json::from_str(hypr_data::korean_1::TRANSCRIPTION_JSON).unwrap();

        let diarizations: Vec<DiarizeOutputChunk> =
            serde_json::from_str(hypr_data::korean_1::DIARIZATION_JSON).unwrap();

        let mut timeline = Timeline::default();

        for t in transcripts {
            timeline.add_transcription(t);
        }

        for d in diarizations {
            timeline.add_diarization(d);
        }

        println!("{}", timeline.view());
        // assert_eq!(timeline.view(), TimelineView { items: vec![] });
    }

    #[test]
    fn test_english_2() {
        let transcripts: Vec<TranscribeOutputChunk> =
            serde_json::from_str(hypr_data::english_2::TRANSCRIPTION_JSON).unwrap();

        let diarizations: Vec<DiarizeOutputChunk> =
            serde_json::from_str(hypr_data::english_2::DIARIZATION_JSON).unwrap();

        let mut timeline = Timeline::default();

        for t in transcripts {
            timeline.add_transcription(t);
        }

        for d in diarizations {
            timeline.add_diarization(d);
        }

        println!("{}", timeline.view());
        // assert_eq!(timeline.view(), TimelineView { items: vec![] });
    }
}
