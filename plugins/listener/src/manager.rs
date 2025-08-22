use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct TranscriptManager {
    id: uuid::Uuid,
    partial_words_by_channel: HashMap<usize, Vec<owhisper_interface::Word>>,
}

impl Default for TranscriptManager {
    fn default() -> Self {
        Self {
            id: uuid::Uuid::new_v4(),
            partial_words_by_channel: HashMap::new(),
        }
    }
}
#[derive(Debug, Default, Clone)]
pub struct Diff {
    pub partial_words: Vec<owhisper_interface::Word>,
    pub final_words: Vec<owhisper_interface::Word>,
}

impl Diff {
    #[allow(dead_code)]
    pub fn partial_content(&self) -> String {
        self.partial_words
            .iter()
            .map(|w| w.word.clone())
            .collect::<Vec<String>>()
            .join(" ")
    }

    #[allow(dead_code)]
    pub fn final_content(&self) -> String {
        self.final_words
            .iter()
            .map(|w| w.word.clone())
            .collect::<Vec<String>>()
            .join(" ")
    }
}

impl TranscriptManager {
    pub fn append<T>(&mut self, response: T) -> Diff
    where
        T: Into<owhisper_interface::StreamResponse>,
    {
        let response = response.into();

        #[cfg(debug_assertions)]
        Self::log(self.id, &response);

        if let owhisper_interface::StreamResponse::TranscriptResponse {
            is_final,
            channel,
            channel_index,
            ..
        } = response
        {
            let data = &channel.alternatives[0];

            let channel_idx = *channel_index.first().unwrap() as usize;

            let words = {
                let mut ws = data
                    .words
                    .clone()
                    .into_iter()
                    .filter_map(|mut w| {
                        w.word = w.word.trim().to_string();
                        if w.word.is_empty() {
                            None
                        } else {
                            Some(w)
                        }
                    })
                    .map(|mut w| {
                        if w.speaker.is_none() {
                            let speaker = channel_index.first().unwrap().clone();
                            w.speaker = Some(speaker);
                        }

                        w
                    })
                    .collect::<Vec<_>>();

                let mut i = 1;
                while i < ws.len() {
                    if ws[i].word.starts_with('\'') {
                        let current_word = ws[i].word.clone();
                        let current_end = ws[i].end;
                        ws[i - 1].word.push_str(&current_word);
                        ws[i - 1].end = current_end;
                        ws.remove(i);
                    } else {
                        i += 1;
                    }
                }

                ws
            };

            if is_final {
                let last_final_word_end = words.last().unwrap().end;

                let channel_partial_words = self
                    .partial_words_by_channel
                    .entry(channel_idx)
                    .or_insert_with(Vec::new);

                *channel_partial_words = channel_partial_words
                    .iter()
                    .filter(|w| w.end > last_final_word_end)
                    .cloned()
                    .collect::<Vec<_>>();

                return Diff {
                    final_words: words,
                    partial_words: self.partial_words(),
                };
            } else if data.confidence > 0.6 {
                let channel_partial_words = self
                    .partial_words_by_channel
                    .entry(channel_idx)
                    .or_insert_with(Vec::new);

                *channel_partial_words = {
                    let mut merged = Vec::new();
                    if let Some(first_start) = words.first().map(|w| w.start) {
                        merged.extend(
                            channel_partial_words
                                .iter()
                                .filter(|w| w.end <= first_start)
                                .cloned(),
                        );
                    }
                    merged.extend(words.clone());
                    merged
                };

                return Diff {
                    final_words: vec![],
                    partial_words: self.partial_words(),
                };
            }
        }

        Diff {
            final_words: vec![],
            partial_words: self.partial_words(),
        }
    }

    fn partial_words(&self) -> Vec<owhisper_interface::Word> {
        let mut words = self
            .partial_words_by_channel
            .values()
            .flatten()
            .cloned()
            .collect::<Vec<_>>();

        words.sort_by(|a, b| {
            a.start
                .partial_cmp(&b.start)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        words
    }

    fn log(id: uuid::Uuid, response: &owhisper_interface::StreamResponse) {
        use std::fs::OpenOptions;
        use std::io::Write;

        if let Ok(mut file) = OpenOptions::new().create(true).append(true).open(
            dirs::home_dir()
                .unwrap()
                .join(format!("transcript_{}.jsonl", id)),
        ) {
            if let Ok(json) = serde_json::to_string(response) {
                let _ = writeln!(file, "{}", json);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn get_items(path: &std::path::Path) -> Vec<owhisper_interface::StreamResponse> {
        let content = std::fs::read_to_string(path).unwrap();
        content
            .split('\n')
            .filter(|line| !line.is_empty())
            .map(|line| serde_json::from_str(line).unwrap())
            .collect()
    }

    #[test]
    fn test_f7952672_5d18_4f75_8aa0_74ab8b02dac3() {
        let mut manager = TranscriptManager::default();
        let items = get_items(
            &std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
                .join("assets")
                .join("f7952672-5d18-4f75-8aa0-74ab8b02dac3.jsonl"),
        );

        let mut final_diffs = vec![];
        let mut partial_diffs = vec![];

        for item in items {
            let diff = manager.append(item);
            partial_diffs.push(diff.partial_content());
            final_diffs.push(diff.final_content());
        }

        insta::assert_debug_snapshot!(final_diffs.iter().zip(partial_diffs.iter()).map(|(p, f)| format!("{} | {}", p, f)).collect::<Vec<_>>(), @r#"
        [
            " | I just learned a few",
            "I just | learned a few",
            " | learned a few basic tricks from",
            " | learned a few basic tricks from people like my grandfather.",
            "learned a few basic tricks from people | like my grandfather.",
            " | like my grandfather.",
            " | like my grandfather.",
            " | like my grandfather.",
            " | like my grandfather. - Now everybody's reading him.",
            "like my grandfather. - Now | everybody's reading him.",
            " | everybody's reading him on the note.",
            " | everybody's reading him on the note. It's too late for you old guys.",
            "everybody's reading | him on the note. It's too late for you old guys.",
            " | him on the phone. It's too late for you old guys.",
            " | him on the note. It's too late for you old guys.",
            "him on the note. It's too late for | you old guys.",
            " | you old guys.",
            " | you old guys.",
            " | you you old guys.",
            " | you old guys.",
            " | you you old guys. The, uh, no.",
        ]
        "#);
    }
}
