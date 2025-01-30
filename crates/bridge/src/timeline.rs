use crate::{DiarizeOutputChunk, TranscribeOutputChunk};

#[derive(Debug, Default)]
pub struct Timeline {
    transcripts: Vec<TranscribeOutputChunk>,
    diarizations: Vec<DiarizeOutputChunk>,
}

#[derive(Debug)]
pub struct TimelineView {
    items: Vec<TimelineViewItem>,
}

#[derive(Debug)]
pub struct TimelineViewItem {
    label: String,
    text: String,
}

pub trait Interval {
    fn start(&self) -> f32;
    fn end(&self) -> f32;
}

impl Timeline {
    pub fn add_transcribe(&mut self, item: TranscribeOutputChunk) {
        self.transcripts.push(item);
    }

    pub fn add_diarize(&mut self, item: DiarizeOutputChunk) {
        self.diarizations.push(item);
    }

    pub fn view(&self) -> TimelineView {
        TimelineView { items: vec![] }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_timeline() {
        let timeline = Timeline::default();
    }
}
