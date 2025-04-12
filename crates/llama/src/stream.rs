use futures_util::{Stream, StreamExt};

struct TagFilterState<S> {
    stream: S,
    buffer: Vec<String>,
    acc: String,
    in_tag: bool,
    tag: String,
}

impl<S> TagFilterState<S>
where
    S: Stream<Item = String> + Unpin,
{
    fn new(stream: S, tag: String) -> Self {
        Self {
            stream,
            buffer: Vec::new(),
            acc: String::new(),
            in_tag: false,
            tag,
        }
    }

    fn try_return_token(&mut self) -> Option<String> {
        if self.buffer.len() > 5 && !self.in_tag {
            return Some(self.buffer.remove(0));
        }
        None
    }

    fn try_return_final_token(&mut self) -> Option<String> {
        if !self.buffer.is_empty() && !self.in_tag {
            return Some(self.buffer.remove(0));
        }
        if !self.acc.is_empty() && !self.in_tag {
            let content = self.acc.clone();
            self.acc.clear();
            return Some(content);
        }
        None
    }

    fn process_tags(&mut self) {
        let mut i = 0;

        while i < self.acc.len() {
            if let Some((new_in_tag, new_i, tag_found)) =
                check_tag_boundaries(&self.acc, i, &self.tag, self.in_tag)
            {
                if tag_found && !new_in_tag && self.in_tag {
                    self.in_tag = false;
                    self.acc = self.acc[new_i..].to_string();
                    i = 0;
                    continue;
                } else if tag_found && new_in_tag && !self.in_tag {
                    if i > 0 {
                        self.buffer.push(self.acc[0..i].to_string());
                    }
                    self.in_tag = true;
                    self.acc = self.acc[new_i..].to_string();
                    i = 0;
                    continue;
                }
            }

            i += 1;
        }
    }

    fn manage_buffer(&mut self) -> bool {
        let mut did_update = false;

        if !self.in_tag && self.acc.len() > 20 {
            if !self.acc.contains('<') {
                self.buffer.push(self.acc.clone());
                self.acc.clear();
                did_update = true;
            } else if let Some(last_tag_pos) = self.acc.rfind('<') {
                if last_tag_pos > 0 {
                    self.buffer.push(self.acc[0..last_tag_pos].to_string());
                    self.acc = self.acc[last_tag_pos..].to_string();
                    did_update = true;
                }
            }
        }

        if !self.in_tag && !self.acc.is_empty() {
            if !self.acc.contains('<')
                || (self.acc.contains('<')
                    && self.acc.contains('>')
                    && self.acc.matches('<').count() == self.acc.matches('>').count())
            {
                self.buffer.push(self.acc.clone());
                self.acc.clear();
                did_update = true;
            }
        }

        did_update
    }
}

fn check_tag_boundaries(
    acc: &str,
    i: usize,
    tag: &str,
    in_tag: bool,
) -> Option<(bool, usize, bool)> {
    if !in_tag && acc[i..].starts_with('<') {
        let tag_start = i;

        if let Some(end_pos) = acc[i..].find('>') {
            let tag_end = i + end_pos;
            let tag_content = &acc[tag_start + 1..tag_end];

            if tag_content == tag {
                return Some((true, tag_end + 1, true));
            }
        }
    }

    if in_tag && acc[i..].starts_with("</") {
        if let Some(end_pos) = acc[i..].find('>') {
            let tag_end = i + end_pos;
            let tag_content = &acc[i + 2..tag_end];

            if tag_content == tag {
                return Some((false, tag_end + 1, true));
            }
        }
    }

    None
}

pub fn filter_tag<S>(input_stream: S, tag: impl AsRef<str>) -> impl Stream<Item = String>
where
    S: Stream<Item = String> + Unpin,
{
    let tag_name = tag.as_ref().to_string();

    struct StreamState<S> {
        filter_state: TagFilterState<S>,
        is_exhausted: bool,
    }

    futures_util::stream::unfold(
        StreamState {
            filter_state: TagFilterState::new(input_stream, tag_name),
            is_exhausted: false,
        },
        |mut state| async move {
            // Don't poll an exhausted stream
            if state.is_exhausted {
                return None;
            }

            // First try to return any buffered token
            if let Some(token) = state.filter_state.try_return_token() {
                return Some((token, state));
            }

            loop {
                // Get next token from the stream
                match state.filter_state.stream.next().await {
                    None => {
                        // Force final processing of accumulator if needed
                        if !state.filter_state.acc.is_empty() && !state.filter_state.in_tag {
                            state
                                .filter_state
                                .buffer
                                .push(state.filter_state.acc.clone());
                            state.filter_state.acc.clear();
                        }

                        // Return any remaining buffered tokens
                        if let Some(token) = state.filter_state.try_return_final_token() {
                            if state.filter_state.buffer.is_empty() {
                                state.is_exhausted = true;
                            }
                            return Some((token, state));
                        }

                        // Mark stream as exhausted before returning None
                        state.is_exhausted = true;
                        return None;
                    }
                    Some(token) => {
                        // Process the token
                        state.filter_state.acc.push_str(&token);
                        state.filter_state.process_tags();
                        state.filter_state.manage_buffer();

                        // Check if we have a token to return
                        if let Some(token) = state.filter_state.try_return_token() {
                            return Some((token, state));
                        }
                    }
                }
            }
        },
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use futures_util::stream;

    fn split_with_random_chunks(input: &str, min_len: usize, max_len: usize) -> Vec<String> {
        use rand::Rng;

        let mut rng = rand::rng();
        let mut chunks = Vec::new();
        let mut remaining = input;

        while !remaining.is_empty() {
            let chunk_size = rng.random_range(min_len..=max_len).min(remaining.len());
            let (chunk, rest) = remaining.split_at(chunk_size);
            chunks.push(chunk.to_string());
            remaining = rest;
        }

        chunks
    }

    #[tokio::test]
    async fn test_fuzz_filter_tag() {
        let test_cases = vec![
            ("No tags here", "No tags here"),
            (
                "<test>This should be excluded</test> Goodbye everyone",
                " Goodbye everyone",
            ),
            ("Hello <test>excluded content</test> World", "Hello  World"),
            ("<test>At start</test> visible content", " visible content"),
            (
                "<test>excluded</test> and <otherTag>kept</otherTag> tags",
                " and <otherTag>kept</otherTag> tags",
            ),
        ];

        for (input, expected) in test_cases {
            for _ in 0..5 {
                for i in 1..=5 {
                    let chunks = split_with_random_chunks(input, 1, i);

                    let input_stream = stream::iter(chunks.into_iter());
                    let output_stream = filter_tag(input_stream, "test");

                    let actual: String = output_stream.collect().await;
                    assert_eq!(actual, expected, "failed: '{}'", input);
                }
            }
        }
    }
}
