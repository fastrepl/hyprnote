#[derive(Debug, Clone)]
pub struct TranscriptManager {
    id: uuid::Uuid,
    partial_words: Vec<owhisper_interface::Word>,
}

impl Default for TranscriptManager {
    fn default() -> Self {
        Self {
            id: uuid::Uuid::new_v4(),
            partial_words: Vec::new(),
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
    pub fn append(&mut self, response: owhisper_interface::StreamResponse) -> Diff {
        #[cfg(debug_assertions)]
        Self::log(self.id, &response);

        if let owhisper_interface::StreamResponse::TranscriptResponse {
            is_final, channel, ..
        } = response
        {
            let data = &channel.alternatives[0];

            let words = data
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
                .collect::<Vec<_>>();

            if is_final {
                let last_final_word_end = words.last().unwrap().end;
                self.partial_words = self
                    .partial_words
                    .iter()
                    .filter(|w| w.start > last_final_word_end)
                    .cloned()
                    .collect::<Vec<_>>();

                return Diff {
                    final_words: words.clone(),
                    partial_words: self.partial_words.clone(),
                };
            } else if data.confidence > 0.6 {
                self.partial_words = {
                    let mut merged = Vec::new();
                    if let Some(first_start) = words.first().map(|w| w.start) {
                        merged.extend(
                            self.partial_words
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
                    partial_words: self.partial_words.clone(),
                };
            }
        }

        Diff {
            final_words: vec![],
            partial_words: self.partial_words.clone(),
        }
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

        let mut partial_history = vec![];
        let mut final_history = vec![];

        for item in items {
            let diff = manager.append(item);
            partial_history.push(diff.partial_content());
            final_history.push(diff.final_content());
        }

        insta::assert_debug_snapshot!(partial_history, @r#"
        [
            "I just learned a few",
            "",
            "learned a few basic tricks from",
            "learned a few basic tricks from people like my grandfather.",
            "",
            "like my grandfather.",
            "like my grandfather.",
            "like my grandfather.",
            "like my grandfather. - Now everybody's reading him.",
            "",
            "everybody's reading him on the note.",
            "everybody's reading him on the note. It's too late for you old guys.",
            "",
            "him on the phone. It's too late for you old guys.",
            "him on the note. It's too late for you old guys.",
            "",
            "you old guys.",
            "you old guys.",
            "you old guys.",
            "you old guys.",
            "you old guys. The, uh, no.",
        ]
        "#);
        insta::assert_debug_snapshot!(final_history, @r#"
        [
            "",
            "I just",
            "",
            "",
            "learned a few basic tricks from people",
            "",
            "",
            "",
            "",
            "like my grandfather. - Now",
            "",
            "",
            "everybody's reading",
            "",
            "",
            "him on the note. It's too late for",
            "",
            "",
            "",
            "",
            "",
        ]
        "#);

        insta::assert_debug_snapshot!(partial_history.iter().zip(final_history.iter()).map(|(p, f)| (p, f)).collect::<Vec<_>>(), @r#"
        [
            (
                "I just learned a few",
                "",
            ),
            (
                "",
                "I just",
            ),
            (
                "learned a few basic tricks from",
                "",
            ),
            (
                "learned a few basic tricks from people like my grandfather.",
                "",
            ),
            (
                "",
                "learned a few basic tricks from people",
            ),
            (
                "like my grandfather.",
                "",
            ),
            (
                "like my grandfather.",
                "",
            ),
            (
                "like my grandfather.",
                "",
            ),
            (
                "like my grandfather. - Now everybody's reading him.",
                "",
            ),
            (
                "",
                "like my grandfather. - Now",
            ),
            (
                "everybody's reading him on the note.",
                "",
            ),
            (
                "everybody's reading him on the note. It's too late for you old guys.",
                "",
            ),
            (
                "",
                "everybody's reading",
            ),
            (
                "him on the phone. It's too late for you old guys.",
                "",
            ),
            (
                "him on the note. It's too late for you old guys.",
                "",
            ),
            (
                "",
                "him on the note. It's too late for",
            ),
            (
                "you old guys.",
                "",
            ),
            (
                "you old guys.",
                "",
            ),
            (
                "you old guys.",
                "",
            ),
            (
                "you old guys.",
                "",
            ),
            (
                "you old guys. The, uh, no.",
                "",
            ),
        ]
        "#);
    }

    #[test]
    fn test_4096() {
        let mut manager = TranscriptManager::default();
        let items = get_items(
            &std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
                .join("assets")
                .join("4096.jsonl"),
        );

        let mut partial_history = vec![];
        let mut final_history = vec![];

        for item in items {
            let diff = manager.append(item);
            partial_history.push(diff.partial_content());
            final_history.push(diff.final_content());
        }

        insta::assert_debug_snapshot!(partial_history, @r#"
        [
            "Two",
            "So we",
            "So, what is it",
            "So, what do you think about?",
            "So, what do you think about this?",
            "So, what do you think about this the rat?",
            "So, what do you think about this derivative?",
            "So, what do you think about this the rapid home?",
            "So what do you think about this the Rattle River?",
            "So, what do you think about this the rap development developer?",
            "So, what do you think about this the rap development of Elements?",
            "So what do you think about just the rap development of Valence?",
            "So what do you think about just the rapid development valence if we just",
            "So, what do you think about just the rap development valve? If you just like",
            "So, what do you think about just the rap development volumes? If you just like",
            "So, what do you think about just the rat development of LMS? If you just like",
            "So what do you think about just the rat development of LMS if you just like stick",
            "So, what do you think about just the rap development of Alums? If we just like stick on",
            "So, what do you think about just the rap development volumes if you just like stick on that?",
            "So, what do you think about just the rap development of LMS? If you just like stick on that, it 's still",
            "So, what do you think about just the right development of LMS? If you just like stick on that, it 's still",
            "So, what do you think about just the rap development of LMs? If you just like stick on that, it 's still incredible.",
            "So, what do you think about just the rap development of Valms? If we just stick on that, it 's still incredibly brand.",
            "So, what do you think about just the rap development volumes? If you just like stick on that, it 's still incredibly impressive.",
            "So, what do you think about just the rap development of VLMs? If you just like stick on that, it 's still incredibly impressive.",
            "So, what do you think about just the rap development of LMS? If you just stick on that, it 's still incredibly impressive like a channel.",
            "So what do you think about just the rap development of LMS? If you just like stick on that, it 's still incredibly impressive like a JAGP.",
            "So, what do you think about just the rap development of Valms? If we just stick on that, it 's still incredibly impressive, like Jaggy PT.",
            "So, what do you think about just the rap development volumes? If you just like stick on that, it 's still incredibly impressive like a Jaggie PT. Just you.",
            "So, what do you think about just the rap development of Valms? If you just like stick on that, it 's still incredibly impressive, like Jaggy PT. Just even chat.",
            "So, what do you think about just the rap development of alums? If we just like stick on that, it 's still incredibly impressive. Like, Jaggie PT, just even Jaggie P.",
            "So, what do you think about just the rap development volumes? If we just like stick on that, it 's still incredibly impressive, like Jaggy Pete , just even Jaggy P waiting.",
            "So, what do you think about just the rap development of Valms? If we just stick on that, it 's still incredibly impressive, like Jaggy P. Just even Jaguar , what are your thoughts?",
            "So, what do you think about just the rap development valums? If we just like stick on that, it 's still incredibly impressive. Like, Jaggy P. Just even Jaguar , what are your thoughts on?",
            "So, what do you think about just the rap development of Valums? If we just stick on that, it 's still incredibly impressive. Like, Jaggy P. Just even Chatti , what are your thoughts about?",
            "So, what do you think about just the rap development volumes? If you just like stick on that, it 's still incredibly impressive. Like, Jaggit P. Just even Jaguar , what are your thoughts about?",
            "So, what do you think about just the rad development of LMs? If you just like stick on that, it 's still incredibly impressive like Rachel GP. Just the unit. What are your thoughts about?",
            "So, what do you think about just the rap development elements? If you just like stick on that, it 's still incredibly impressive like the Jaggit P. Jeffy and Chattyby. What are your thoughts about?",
            "So, what do you think about just the rap development of LMs? If you just like stick on that, it 's still incredibly impressive like the Chatti P. Just human chatty. What are your thoughts about Versus?",
            "So, what do you think about just the right development vellums? If we just like stick on that, it 's still incredibly impressive like a tragedy.",
            "So, what do you think about just the rap development volume? If you just like stick on that, it 's still incredibly impressive. Like Jati PP , just even Jatipi , what are your thoughts about reflexiving language?",
            "So, what do you think about just the rap development volume? If you just like stick on that, it 's still incredibly impressive. Like, Jaggy P. Just even JatP. What do you thought about reflecting learning to community?",
            "So, what do you think about just the rad development volumes? If you just like stick on that, it 's still incredibly impressive like Rachel GP. Just the unattributed, what are your thoughts about reflex of learning human feedback?",
            "So, what do you think about just the rap development developments? If you just like stick on that, it 's still incredibly impressive like Jaggit P. Jeffy and Chatty , what are your thoughts about before?",
            "So what do you think about just the rap development volumes? If we just stick on that, it 's still incredibly impressive like the Chateau GPT. Just human chatty. What are your thoughts about reflex of learning with human feedback and is low?",
            "So what do you think about just the rap development volumes? If you just like stick on that, it 's still incredibly impressive like the Chateau P. Just human chatty. What are your thoughts about uh reflex one of the human feedback comes lards?",
            "So, what do you think about just the rap development valums? If we just stick on that, it 's still incredibly impressive like the Chatti P. Just human chatty. What are your thoughts about reflex learning with human feedback on these large language?",
            "So, what do you think about just the radi development vellums? If we just like stick on that, it 's still incredibly impressive like Rachip. Jason Attribute , what are your thoughts about? We first only learned to human feedback on these large language models.",
            "So, what do you think about just the rat development vellums? If we just stick on that, it 's still incredibly impressive like Rachip. Justinian attributes, what are your thoughts about? We first only learned resume feedback on these large language models.",
            "So, what do you think about just the rap development valve? If you just stick on that, it 's still incredibly impressive. Like Jaggit , just human Jatjib. What do you think about the first learning human feedback on these large language models?",
            "So, what do you think about just the rabbit development volumes? If we just stick on that, it 's still incredibly impressive like Rachel GP. Just the union attribute , what are your thoughts about refers to learning to human feedback on these large language models?",
            "So, what do you think about just the rap development developments? If you just like stick on that, it 's still incredibly impressive like the Jagg P. Jeffy and Jatibi. What are your thoughts about the first one learning feedback on these large language models?",
            "So, what do you think about just the rap development of Valms? If we just stick on that, it 's still incredibly impressive like the Chatti P. Just human Chateau. What are your thoughts about reference language human feedback on these large language models?",
            "So, what do you think about just the radio development vellums? If we just like stick on that, it 's still incredibly impressive. Just the attribute , what do you think about reflecting language human feedback on these large language models? I 'd like.",
            "So, what do you think about just the rap development volumes? If you just like stick on that, it 's still incredibly impressive. Like JagP , just human Jatipit. What are your thoughts about reflection language human feedback on these large language models? I 'd like to go.",
            "So, what do you think about just the rabbit development of LMs? If you just like stick on that, it 's still incredibly impressive like Rachel GP. Just the unique attribute. What do you thought about uh reference language human feedback on these large language models? I 'd like to go back.",
            "So, what do you think about just the rapid development of LMS? If you just like stick on that, it 's still incredibly impressive. Like, Jaggy P. Just even Jaguar P. What are your thoughts about reference learning and human feedback on these large language models? I 'd like to go back.",
            "So, what do you think about just the rapid development of LMs? If you just like stick on that, it 's still incredibly impressive. Like, Jaggy P. Just even Jaguar P. What are your thoughts about reference learning and human feedback on these large language models? I 'd like to go back.",
            "So, what do you think about just the rapid development developments? If you just like stick on that, it 's still incredibly impressive. Like, Jaggy P. Just even Jagger P. What are your thoughts about reference learning and human feedback on these large language models? I 'd like to go back to when",
            "So, what do you think about just the rapid development of LMS? If you just like stick on that, it 's still incredibly impressive. Like, Jaggy P. Just even Jaguar , what are your thoughts about reference learning and human feedback on these large language models? I 'd like to go back to when Cal",
            "So what do you think about just the rapid development developments? If you just like stick on that, it 's still incredibly impressive. Like with Jaggy P. Just even Jaguar P. What are your thoughts about reference to learning and human feedback on these large language models? I 'd like to go back to uncalculated",
            "So, what do you think about just the rapid development of LMS? If you just like stick on that, it 's still incredibly impressive. Like, Jaggy P. Just even Jagger P. What are your thoughts about reference learning and human feedback on these large language models? I 'd like to go back to when calculators",
            "So, what do you think about just the rapid development of LMS? If you just like stick on that, it 's still incredibly impressive. Like, Jaggy P. Just even Jaguar , what are your thoughts about reference learning and human feedback on these large language models? I 'd like to go back to when calculators first",
            "So, what do you think about just the rapid development of LMS? If you just like stick on that, it 's still incredibly impressive. Like, Jaggy P. Just even Jagger P. What are your thoughts about reference learning and human feedback on these large language models? I 'd like to go back to when calculators first came out.",
            "",
            "Just even Jagger P. What are your thoughts about reference learning and human feedback on these large language models? I 'd like to go back to when calculators first came out.",
            "What are your thoughts about reflex of learning to human feedback on these large language models? I 'd like to go back to when calculators first came out. It just",
            "Just even chatty, what are your thoughts about reflex of learning to human feedback on these large language models? I 'd like to go back to when calculators first came out.",
            "Just even Chadibi , what are your thoughts about before you feedback on these large language models? I 'd like to go back to when calculators first came out, and",
            "Just even Chadby , what are your thoughts about before you feedback coming these large language models? I 'd like to go back to when calculators first came out, and.",
            "What are your thoughts about these large language models? I 'd like to go back to when calculators first came out and or",
            "Just even attribute , what are your thoughts about uh reflect on learning this human feedback on these large language models? I 'd like to go back to when calculators first came out, and or comp",
            "Just even attribute , what are your thoughts about reflex of learning to human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computer.",
            "Just even Jadu , what are your thoughts about before you feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers.",
            "Just even chatty, what are your thoughts about reflex of learning this human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. You just",
            "J What are your thoughts about learning to human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers.",
            "Just even Chadby , what are your thoughts about reflecting on learning this human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And just",
            "What are your thoughts about reflex of learning to human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And like I just",
            "Just even Jadib , what are your thoughts about me before learning so human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And like, I wasn 't.",
            "Just even Chadby , what are your thoughts about reflex of learning to human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And like I wasn 't para. Just",
            "Just even chatty, what are your thoughts about learning soon feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And like I wasn 't brown.",
            "Just even Chadby , what are your thoughts about these first learnings human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And like I wasn 't around.",
            "J What are your thoughts about reflex of learning to human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And like I wasn 't around, look at them.",
            "Just even Chadby , what are your thoughts about these first learnings human feedback on these large language models? I 'd like to go back to when calculators first came out and or computers. And like I wasn 't around, like I 'm just",
            "What are your thoughts about uh reflex of learning to human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And like I wasn 't around, look like I 'm very",
            "Just even Jadu , what are your thoughts about me first of learning so human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And like I wasn 't around, like I 'm 33 years.",
            "Just even Chadiby , what are your thoughts about reflex of learning with human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And like, I wasn 't around. Like, I 'm 33 years old. Just",
            "Just even Jeju , what are your thoughts about reference learning and human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And I wasn 't around. Look , I 'm 33 years old.",
            "Just even Jeju , what are your thoughts about reference learning and human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And I wasn 't around. Look , I 'm 33 years old.",
            "Just even Jeju , what are your thoughts about reference learning and human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And I wasn 't around. Look , I 'm 33 years old.",
            "Just even Jeffrey, what are your thoughts about reference learning and human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And I wasn 't around. Look, I 'm 33 years old. And.",
            "Just even Jeffrey, what are your thoughts about reference learning and human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And I wasn 't around. Look, I 'm 33 years old. And.",
            "Just even Jeffrey, what are your thoughts about reference learning and human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And I wasn 't around. Look, I 'm 33 years old. And to like.",
            "Just even Jeffrey, what are your thoughts about research on learning this human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And I wasn 't around. Look, I 'm 33 years old. And to like.",
            "Just even Jeffrey, what are your thoughts about research on learning this human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And I wasn 't around. Look, I 'm 33 years old. And to like.",
            "Just even Jeffrey, what are your thoughts about reference to learning this human feedback on these large language models? I 'd like to go back to when calculators first came out and or computers. And I wasn 't around. Look, I 'm 33 years old. And to like.",
            "Just even Jeffrey, what are your thoughts about these first learnings human feedback on these large language models? I 'd like to go back to when calculators first came out and or computers. And I wasn 't around. Look, I 'm 33 years old. And to like see.",
            "Just even Jeffrey, what are your thoughts about these first learnings human feedback on these large language models? I 'd like to go back to when calculators first came out and or computers. And I wasn 't around. Look, I 'm 33 years old. And to like see how.",
            "Just even Jeffrey, what are your thoughts about these first learnings human feedback on these large language models? I 'd like to go back to when calculators first came out and or computers. And I wasn 't around. Look, I 'm 33 years old. And to see how.",
            "",
            "And to see how that",
            "And to like, see how that",
            "and to like see how that affect",
            "And to like see how that affected",
            "And to like see how that affected",
            "And to like see how that affected.",
            "And to like see how that affected.",
            "and to like see how that affected.",
            "and to like see how that affected.",
            "And to like see how that affected.",
            "And to like see how that affected.",
            "And to like see how that affected",
            "And to like see how that affected. Like ,",
            "And to like see how that affected. Like ,",
            "and to like see how that affected. Like",
            "And to like see how that affected. Like ,",
            "And to like see how that affected like society",
            "And to like see how that affected like society",
            "And to like see how that affected like society",
            "And to like see how that affected like society",
            "and to like see how that affected like society",
            "and to like see how that affected like society. Maybe you 're",
            "And to like see how that affected like society. Maybe right",
            "And to like see how that affected. Like society. Maybe right though.",
            "and to like see how that affected like society. Maybe right the owner",
            "and to like see how that affected like society. Maybe you 're right vote owner",
            "and to like see how that affected like society. Maybe you 're right thou owner put on",
            "and to like see how that affected like society. Maybe right tha owner put on the",
            "And to like see how that affected like society. Maybe you 're right though on a put on the",
            "And to like see how that affected like society. Maybe you 're right, though, I want to put on the",
            "And to like see how that affected like society. Maybe you 're right though, on a put on the",
            "and to like see how that affected like society. Maybe you 're right though put on the",
            "And to like see how that affected like society. Maybe right though I wanna put on the the uh",
            "And to like see how that affected. Like society. Maybe you 're right though I wanna put on the the uh",
            "and to like see how that affected like society. Maybe you 're right, so I wanna put on the the uh the",
            "And to like see how that affected like society. Maybe you 're right about put on the the uh the big",
            "And to like see how that affected like society. Maybe you 're right about put on the the uh the big picture",
            "And to like see how that affected like society. Maybe you 're right, so I want to put on the big picture hat",
            "And to like see how that affected like society. Maybe right though I wanna put on the the uh the big picture hat here",
            "and to like see how that affected like society. Maybe right though I wanna put on the the uh the big picture hat here.",
            "And to like see how that affected. Like society. Maybe you 're right, though. I wanna put on the the uh the big picture hat here.",
            "And to like see how that affected like society. Maybe right though, I wanna put on the the uh the big picture hat here.",
            "And to like see how that affected like society. Maybe you 're right, so I wanna put on the the uh the big picture hat here",
            "And to like see how that affected like society. Maybe you 're right though, I want to put on the big picture hat here. Got the refrigerator",
            "And to like see how that affected like society. Maybe you 're right, though. I want to put on the big picture hat here. I got the refrigerator.",
            "and to like see how that affected like society. Maybe right though I wanna put on the the uh the big picture hat here. I got the refrigerator",
            "And to like see how that affected like society. Maybe you 're right, but I wanna put on the the uh the big picture hat here. I got the refrigerator.",
            "and to like see how that affected like society. Maybe you 're right, but I wanna put on the the uh the big picture hat here. I got the refrigerator",
            "and to like see how that affected like society. Maybe you 're right, but I wanna put on the the uh the big picture hat here. I got the refrigerator. Wow.",
            "",
            "Got the fridge well , the fridge rate",
            "Got the fridge well , the fridge",
            "Got it for dragon pelt , refrigerator electricity",
            "The frigid electricity elect",
            "Got the refrigerator well. Refrigerator electricity electrons",
            "Refrigerator electricity all like a stop",
            "Here got it for dragon mail. Refrigerator electricity electronic stuff",
            "Got the frigid well , refrigerator electricity alleged stuff",
            "Got the frigid well. Refrigerator electricity all the time",
            "Refrigerator electricity, all that kind of stuff. But",
            "Refrigerator electricity, all that kind of stuff. But",
            "Refrigerator electricity, all that kind of stuff. But",
            "Refrigerator electricity, all that kind of stuff. But",
            "Refrigerator electricity, all that kind of stuff. But",
        ]
        "#);

        insta::assert_debug_snapshot!(final_history, @r#"
        [
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "So, what do you think about just the rapid development of LMS? If you just like stick on that, it 's still incredibly impressive. Like, Jaggy P.",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "Just even Jeffrey, what are your thoughts about these first learnings human feedback on these large language models? I 'd like to go back to when calculators first came out and or computers. And I wasn 't around. Look, I 'm 33 years old.",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "and to like see how that affected like society. Maybe you 're right, but I wanna put on the the uh the big picture hat here.",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
        ]
        "#);

        insta::assert_debug_snapshot!(partial_history.iter().zip(final_history.iter()).map(|(p, f)| (p, f)).collect::<Vec<_>>(), @r#"
        [
            (
                "Two",
                "",
            ),
            (
                "So we",
                "",
            ),
            (
                "So, what is it",
                "",
            ),
            (
                "So, what do you think about?",
                "",
            ),
            (
                "So, what do you think about this?",
                "",
            ),
            (
                "So, what do you think about this the rat?",
                "",
            ),
            (
                "So, what do you think about this derivative?",
                "",
            ),
            (
                "So, what do you think about this the rapid home?",
                "",
            ),
            (
                "So what do you think about this the Rattle River?",
                "",
            ),
            (
                "So, what do you think about this the rap development developer?",
                "",
            ),
            (
                "So, what do you think about this the rap development of Elements?",
                "",
            ),
            (
                "So what do you think about just the rap development of Valence?",
                "",
            ),
            (
                "So what do you think about just the rapid development valence if we just",
                "",
            ),
            (
                "So, what do you think about just the rap development valve? If you just like",
                "",
            ),
            (
                "So, what do you think about just the rap development volumes? If you just like",
                "",
            ),
            (
                "So, what do you think about just the rat development of LMS? If you just like",
                "",
            ),
            (
                "So what do you think about just the rat development of LMS if you just like stick",
                "",
            ),
            (
                "So, what do you think about just the rap development of Alums? If we just like stick on",
                "",
            ),
            (
                "So, what do you think about just the rap development volumes if you just like stick on that?",
                "",
            ),
            (
                "So, what do you think about just the rap development of LMS? If you just like stick on that, it 's still",
                "",
            ),
            (
                "So, what do you think about just the right development of LMS? If you just like stick on that, it 's still",
                "",
            ),
            (
                "So, what do you think about just the rap development of LMs? If you just like stick on that, it 's still incredible.",
                "",
            ),
            (
                "So, what do you think about just the rap development of Valms? If we just stick on that, it 's still incredibly brand.",
                "",
            ),
            (
                "So, what do you think about just the rap development volumes? If you just like stick on that, it 's still incredibly impressive.",
                "",
            ),
            (
                "So, what do you think about just the rap development of VLMs? If you just like stick on that, it 's still incredibly impressive.",
                "",
            ),
            (
                "So, what do you think about just the rap development of LMS? If you just stick on that, it 's still incredibly impressive like a channel.",
                "",
            ),
            (
                "So what do you think about just the rap development of LMS? If you just like stick on that, it 's still incredibly impressive like a JAGP.",
                "",
            ),
            (
                "So, what do you think about just the rap development of Valms? If we just stick on that, it 's still incredibly impressive, like Jaggy PT.",
                "",
            ),
            (
                "So, what do you think about just the rap development volumes? If you just like stick on that, it 's still incredibly impressive like a Jaggie PT. Just you.",
                "",
            ),
            (
                "So, what do you think about just the rap development of Valms? If you just like stick on that, it 's still incredibly impressive, like Jaggy PT. Just even chat.",
                "",
            ),
            (
                "So, what do you think about just the rap development of alums? If we just like stick on that, it 's still incredibly impressive. Like, Jaggie PT, just even Jaggie P.",
                "",
            ),
            (
                "So, what do you think about just the rap development volumes? If we just like stick on that, it 's still incredibly impressive, like Jaggy Pete , just even Jaggy P waiting.",
                "",
            ),
            (
                "So, what do you think about just the rap development of Valms? If we just stick on that, it 's still incredibly impressive, like Jaggy P. Just even Jaguar , what are your thoughts?",
                "",
            ),
            (
                "So, what do you think about just the rap development valums? If we just like stick on that, it 's still incredibly impressive. Like, Jaggy P. Just even Jaguar , what are your thoughts on?",
                "",
            ),
            (
                "So, what do you think about just the rap development of Valums? If we just stick on that, it 's still incredibly impressive. Like, Jaggy P. Just even Chatti , what are your thoughts about?",
                "",
            ),
            (
                "So, what do you think about just the rap development volumes? If you just like stick on that, it 's still incredibly impressive. Like, Jaggit P. Just even Jaguar , what are your thoughts about?",
                "",
            ),
            (
                "So, what do you think about just the rad development of LMs? If you just like stick on that, it 's still incredibly impressive like Rachel GP. Just the unit. What are your thoughts about?",
                "",
            ),
            (
                "So, what do you think about just the rap development elements? If you just like stick on that, it 's still incredibly impressive like the Jaggit P. Jeffy and Chattyby. What are your thoughts about?",
                "",
            ),
            (
                "So, what do you think about just the rap development of LMs? If you just like stick on that, it 's still incredibly impressive like the Chatti P. Just human chatty. What are your thoughts about Versus?",
                "",
            ),
            (
                "So, what do you think about just the right development vellums? If we just like stick on that, it 's still incredibly impressive like a tragedy.",
                "",
            ),
            (
                "So, what do you think about just the rap development volume? If you just like stick on that, it 's still incredibly impressive. Like Jati PP , just even Jatipi , what are your thoughts about reflexiving language?",
                "",
            ),
            (
                "So, what do you think about just the rap development volume? If you just like stick on that, it 's still incredibly impressive. Like, Jaggy P. Just even JatP. What do you thought about reflecting learning to community?",
                "",
            ),
            (
                "So, what do you think about just the rad development volumes? If you just like stick on that, it 's still incredibly impressive like Rachel GP. Just the unattributed, what are your thoughts about reflex of learning human feedback?",
                "",
            ),
            (
                "So, what do you think about just the rap development developments? If you just like stick on that, it 's still incredibly impressive like Jaggit P. Jeffy and Chatty , what are your thoughts about before?",
                "",
            ),
            (
                "So what do you think about just the rap development volumes? If we just stick on that, it 's still incredibly impressive like the Chateau GPT. Just human chatty. What are your thoughts about reflex of learning with human feedback and is low?",
                "",
            ),
            (
                "So what do you think about just the rap development volumes? If you just like stick on that, it 's still incredibly impressive like the Chateau P. Just human chatty. What are your thoughts about uh reflex one of the human feedback comes lards?",
                "",
            ),
            (
                "So, what do you think about just the rap development valums? If we just stick on that, it 's still incredibly impressive like the Chatti P. Just human chatty. What are your thoughts about reflex learning with human feedback on these large language?",
                "",
            ),
            (
                "So, what do you think about just the radi development vellums? If we just like stick on that, it 's still incredibly impressive like Rachip. Jason Attribute , what are your thoughts about? We first only learned to human feedback on these large language models.",
                "",
            ),
            (
                "So, what do you think about just the rat development vellums? If we just stick on that, it 's still incredibly impressive like Rachip. Justinian attributes, what are your thoughts about? We first only learned resume feedback on these large language models.",
                "",
            ),
            (
                "So, what do you think about just the rap development valve? If you just stick on that, it 's still incredibly impressive. Like Jaggit , just human Jatjib. What do you think about the first learning human feedback on these large language models?",
                "",
            ),
            (
                "So, what do you think about just the rabbit development volumes? If we just stick on that, it 's still incredibly impressive like Rachel GP. Just the union attribute , what are your thoughts about refers to learning to human feedback on these large language models?",
                "",
            ),
            (
                "So, what do you think about just the rap development developments? If you just like stick on that, it 's still incredibly impressive like the Jagg P. Jeffy and Jatibi. What are your thoughts about the first one learning feedback on these large language models?",
                "",
            ),
            (
                "So, what do you think about just the rap development of Valms? If we just stick on that, it 's still incredibly impressive like the Chatti P. Just human Chateau. What are your thoughts about reference language human feedback on these large language models?",
                "",
            ),
            (
                "So, what do you think about just the radio development vellums? If we just like stick on that, it 's still incredibly impressive. Just the attribute , what do you think about reflecting language human feedback on these large language models? I 'd like.",
                "",
            ),
            (
                "So, what do you think about just the rap development volumes? If you just like stick on that, it 's still incredibly impressive. Like JagP , just human Jatipit. What are your thoughts about reflection language human feedback on these large language models? I 'd like to go.",
                "",
            ),
            (
                "So, what do you think about just the rabbit development of LMs? If you just like stick on that, it 's still incredibly impressive like Rachel GP. Just the unique attribute. What do you thought about uh reference language human feedback on these large language models? I 'd like to go back.",
                "",
            ),
            (
                "So, what do you think about just the rapid development of LMS? If you just like stick on that, it 's still incredibly impressive. Like, Jaggy P. Just even Jaguar P. What are your thoughts about reference learning and human feedback on these large language models? I 'd like to go back.",
                "",
            ),
            (
                "So, what do you think about just the rapid development of LMs? If you just like stick on that, it 's still incredibly impressive. Like, Jaggy P. Just even Jaguar P. What are your thoughts about reference learning and human feedback on these large language models? I 'd like to go back.",
                "",
            ),
            (
                "So, what do you think about just the rapid development developments? If you just like stick on that, it 's still incredibly impressive. Like, Jaggy P. Just even Jagger P. What are your thoughts about reference learning and human feedback on these large language models? I 'd like to go back to when",
                "",
            ),
            (
                "So, what do you think about just the rapid development of LMS? If you just like stick on that, it 's still incredibly impressive. Like, Jaggy P. Just even Jaguar , what are your thoughts about reference learning and human feedback on these large language models? I 'd like to go back to when Cal",
                "",
            ),
            (
                "So what do you think about just the rapid development developments? If you just like stick on that, it 's still incredibly impressive. Like with Jaggy P. Just even Jaguar P. What are your thoughts about reference to learning and human feedback on these large language models? I 'd like to go back to uncalculated",
                "",
            ),
            (
                "So, what do you think about just the rapid development of LMS? If you just like stick on that, it 's still incredibly impressive. Like, Jaggy P. Just even Jagger P. What are your thoughts about reference learning and human feedback on these large language models? I 'd like to go back to when calculators",
                "",
            ),
            (
                "So, what do you think about just the rapid development of LMS? If you just like stick on that, it 's still incredibly impressive. Like, Jaggy P. Just even Jaguar , what are your thoughts about reference learning and human feedback on these large language models? I 'd like to go back to when calculators first",
                "",
            ),
            (
                "So, what do you think about just the rapid development of LMS? If you just like stick on that, it 's still incredibly impressive. Like, Jaggy P. Just even Jagger P. What are your thoughts about reference learning and human feedback on these large language models? I 'd like to go back to when calculators first came out.",
                "",
            ),
            (
                "",
                "So, what do you think about just the rapid development of LMS? If you just like stick on that, it 's still incredibly impressive. Like, Jaggy P.",
            ),
            (
                "Just even Jagger P. What are your thoughts about reference learning and human feedback on these large language models? I 'd like to go back to when calculators first came out.",
                "",
            ),
            (
                "What are your thoughts about reflex of learning to human feedback on these large language models? I 'd like to go back to when calculators first came out. It just",
                "",
            ),
            (
                "Just even chatty, what are your thoughts about reflex of learning to human feedback on these large language models? I 'd like to go back to when calculators first came out.",
                "",
            ),
            (
                "Just even Chadibi , what are your thoughts about before you feedback on these large language models? I 'd like to go back to when calculators first came out, and",
                "",
            ),
            (
                "Just even Chadby , what are your thoughts about before you feedback coming these large language models? I 'd like to go back to when calculators first came out, and.",
                "",
            ),
            (
                "What are your thoughts about these large language models? I 'd like to go back to when calculators first came out and or",
                "",
            ),
            (
                "Just even attribute , what are your thoughts about uh reflect on learning this human feedback on these large language models? I 'd like to go back to when calculators first came out, and or comp",
                "",
            ),
            (
                "Just even attribute , what are your thoughts about reflex of learning to human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computer.",
                "",
            ),
            (
                "Just even Jadu , what are your thoughts about before you feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers.",
                "",
            ),
            (
                "Just even chatty, what are your thoughts about reflex of learning this human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. You just",
                "",
            ),
            (
                "J What are your thoughts about learning to human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers.",
                "",
            ),
            (
                "Just even Chadby , what are your thoughts about reflecting on learning this human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And just",
                "",
            ),
            (
                "What are your thoughts about reflex of learning to human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And like I just",
                "",
            ),
            (
                "Just even Jadib , what are your thoughts about me before learning so human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And like, I wasn 't.",
                "",
            ),
            (
                "Just even Chadby , what are your thoughts about reflex of learning to human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And like I wasn 't para. Just",
                "",
            ),
            (
                "Just even chatty, what are your thoughts about learning soon feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And like I wasn 't brown.",
                "",
            ),
            (
                "Just even Chadby , what are your thoughts about these first learnings human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And like I wasn 't around.",
                "",
            ),
            (
                "J What are your thoughts about reflex of learning to human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And like I wasn 't around, look at them.",
                "",
            ),
            (
                "Just even Chadby , what are your thoughts about these first learnings human feedback on these large language models? I 'd like to go back to when calculators first came out and or computers. And like I wasn 't around, like I 'm just",
                "",
            ),
            (
                "What are your thoughts about uh reflex of learning to human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And like I wasn 't around, look like I 'm very",
                "",
            ),
            (
                "Just even Jadu , what are your thoughts about me first of learning so human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And like I wasn 't around, like I 'm 33 years.",
                "",
            ),
            (
                "Just even Chadiby , what are your thoughts about reflex of learning with human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And like, I wasn 't around. Like, I 'm 33 years old. Just",
                "",
            ),
            (
                "Just even Jeju , what are your thoughts about reference learning and human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And I wasn 't around. Look , I 'm 33 years old.",
                "",
            ),
            (
                "Just even Jeju , what are your thoughts about reference learning and human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And I wasn 't around. Look , I 'm 33 years old.",
                "",
            ),
            (
                "Just even Jeju , what are your thoughts about reference learning and human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And I wasn 't around. Look , I 'm 33 years old.",
                "",
            ),
            (
                "Just even Jeffrey, what are your thoughts about reference learning and human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And I wasn 't around. Look, I 'm 33 years old. And.",
                "",
            ),
            (
                "Just even Jeffrey, what are your thoughts about reference learning and human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And I wasn 't around. Look, I 'm 33 years old. And.",
                "",
            ),
            (
                "Just even Jeffrey, what are your thoughts about reference learning and human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And I wasn 't around. Look, I 'm 33 years old. And to like.",
                "",
            ),
            (
                "Just even Jeffrey, what are your thoughts about research on learning this human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And I wasn 't around. Look, I 'm 33 years old. And to like.",
                "",
            ),
            (
                "Just even Jeffrey, what are your thoughts about research on learning this human feedback on these large language models? I 'd like to go back to when calculators first came out, and or computers. And I wasn 't around. Look, I 'm 33 years old. And to like.",
                "",
            ),
            (
                "Just even Jeffrey, what are your thoughts about reference to learning this human feedback on these large language models? I 'd like to go back to when calculators first came out and or computers. And I wasn 't around. Look, I 'm 33 years old. And to like.",
                "",
            ),
            (
                "Just even Jeffrey, what are your thoughts about these first learnings human feedback on these large language models? I 'd like to go back to when calculators first came out and or computers. And I wasn 't around. Look, I 'm 33 years old. And to like see.",
                "",
            ),
            (
                "Just even Jeffrey, what are your thoughts about these first learnings human feedback on these large language models? I 'd like to go back to when calculators first came out and or computers. And I wasn 't around. Look, I 'm 33 years old. And to like see how.",
                "",
            ),
            (
                "Just even Jeffrey, what are your thoughts about these first learnings human feedback on these large language models? I 'd like to go back to when calculators first came out and or computers. And I wasn 't around. Look, I 'm 33 years old. And to see how.",
                "",
            ),
            (
                "",
                "Just even Jeffrey, what are your thoughts about these first learnings human feedback on these large language models? I 'd like to go back to when calculators first came out and or computers. And I wasn 't around. Look, I 'm 33 years old.",
            ),
            (
                "And to see how that",
                "",
            ),
            (
                "And to like, see how that",
                "",
            ),
            (
                "and to like see how that affect",
                "",
            ),
            (
                "And to like see how that affected",
                "",
            ),
            (
                "And to like see how that affected",
                "",
            ),
            (
                "And to like see how that affected.",
                "",
            ),
            (
                "And to like see how that affected.",
                "",
            ),
            (
                "and to like see how that affected.",
                "",
            ),
            (
                "and to like see how that affected.",
                "",
            ),
            (
                "And to like see how that affected.",
                "",
            ),
            (
                "And to like see how that affected.",
                "",
            ),
            (
                "And to like see how that affected",
                "",
            ),
            (
                "And to like see how that affected. Like ,",
                "",
            ),
            (
                "And to like see how that affected. Like ,",
                "",
            ),
            (
                "and to like see how that affected. Like",
                "",
            ),
            (
                "And to like see how that affected. Like ,",
                "",
            ),
            (
                "And to like see how that affected like society",
                "",
            ),
            (
                "And to like see how that affected like society",
                "",
            ),
            (
                "And to like see how that affected like society",
                "",
            ),
            (
                "And to like see how that affected like society",
                "",
            ),
            (
                "and to like see how that affected like society",
                "",
            ),
            (
                "and to like see how that affected like society. Maybe you 're",
                "",
            ),
            (
                "And to like see how that affected like society. Maybe right",
                "",
            ),
            (
                "And to like see how that affected. Like society. Maybe right though.",
                "",
            ),
            (
                "and to like see how that affected like society. Maybe right the owner",
                "",
            ),
            (
                "and to like see how that affected like society. Maybe you 're right vote owner",
                "",
            ),
            (
                "and to like see how that affected like society. Maybe you 're right thou owner put on",
                "",
            ),
            (
                "and to like see how that affected like society. Maybe right tha owner put on the",
                "",
            ),
            (
                "And to like see how that affected like society. Maybe you 're right though on a put on the",
                "",
            ),
            (
                "And to like see how that affected like society. Maybe you 're right, though, I want to put on the",
                "",
            ),
            (
                "And to like see how that affected like society. Maybe you 're right though, on a put on the",
                "",
            ),
            (
                "and to like see how that affected like society. Maybe you 're right though put on the",
                "",
            ),
            (
                "And to like see how that affected like society. Maybe right though I wanna put on the the uh",
                "",
            ),
            (
                "And to like see how that affected. Like society. Maybe you 're right though I wanna put on the the uh",
                "",
            ),
            (
                "and to like see how that affected like society. Maybe you 're right, so I wanna put on the the uh the",
                "",
            ),
            (
                "And to like see how that affected like society. Maybe you 're right about put on the the uh the big",
                "",
            ),
            (
                "And to like see how that affected like society. Maybe you 're right about put on the the uh the big picture",
                "",
            ),
            (
                "And to like see how that affected like society. Maybe you 're right, so I want to put on the big picture hat",
                "",
            ),
            (
                "And to like see how that affected like society. Maybe right though I wanna put on the the uh the big picture hat here",
                "",
            ),
            (
                "and to like see how that affected like society. Maybe right though I wanna put on the the uh the big picture hat here.",
                "",
            ),
            (
                "And to like see how that affected. Like society. Maybe you 're right, though. I wanna put on the the uh the big picture hat here.",
                "",
            ),
            (
                "And to like see how that affected like society. Maybe right though, I wanna put on the the uh the big picture hat here.",
                "",
            ),
            (
                "And to like see how that affected like society. Maybe you 're right, so I wanna put on the the uh the big picture hat here",
                "",
            ),
            (
                "And to like see how that affected like society. Maybe you 're right though, I want to put on the big picture hat here. Got the refrigerator",
                "",
            ),
            (
                "And to like see how that affected like society. Maybe you 're right, though. I want to put on the big picture hat here. I got the refrigerator.",
                "",
            ),
            (
                "and to like see how that affected like society. Maybe right though I wanna put on the the uh the big picture hat here. I got the refrigerator",
                "",
            ),
            (
                "And to like see how that affected like society. Maybe you 're right, but I wanna put on the the uh the big picture hat here. I got the refrigerator.",
                "",
            ),
            (
                "and to like see how that affected like society. Maybe you 're right, but I wanna put on the the uh the big picture hat here. I got the refrigerator",
                "",
            ),
            (
                "and to like see how that affected like society. Maybe you 're right, but I wanna put on the the uh the big picture hat here. I got the refrigerator. Wow.",
                "",
            ),
            (
                "",
                "and to like see how that affected like society. Maybe you 're right, but I wanna put on the the uh the big picture hat here.",
            ),
            (
                "Got the fridge well , the fridge rate",
                "",
            ),
            (
                "Got the fridge well , the fridge",
                "",
            ),
            (
                "Got it for dragon pelt , refrigerator electricity",
                "",
            ),
            (
                "The frigid electricity elect",
                "",
            ),
            (
                "Got the refrigerator well. Refrigerator electricity electrons",
                "",
            ),
            (
                "Refrigerator electricity all like a stop",
                "",
            ),
            (
                "Here got it for dragon mail. Refrigerator electricity electronic stuff",
                "",
            ),
            (
                "Got the frigid well , refrigerator electricity alleged stuff",
                "",
            ),
            (
                "Got the frigid well. Refrigerator electricity all the time",
                "",
            ),
            (
                "Refrigerator electricity, all that kind of stuff. But",
                "",
            ),
            (
                "Refrigerator electricity, all that kind of stuff. But",
                "",
            ),
            (
                "Refrigerator electricity, all that kind of stuff. But",
                "",
            ),
            (
                "Refrigerator electricity, all that kind of stuff. But",
                "",
            ),
            (
                "Refrigerator electricity, all that kind of stuff. But",
                "",
            ),
        ]
        "#);
    }
}
