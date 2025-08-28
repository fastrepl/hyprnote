use trie_rs::map::{Trie, TrieBuilder};
use whisper_rs::{WhisperContext, WhisperTokenId};

#[derive(Clone)]
pub struct BiasTrie {
    trie: Trie<WhisperTokenId, f32>,
}

impl BiasTrie {
    pub fn new(ctx: &WhisperContext, custom_vocab: &[&str]) -> Result<Self, crate::Error> {
        let sequences = custom_vocab
            .iter()
            .map(|s| ctx.tokenize(s, 99))
            .collect::<Result<Vec<_>, _>>()?;

        let mut builder = TrieBuilder::new();

        for sequence in sequences {
            for i in 1..=sequence.len() {
                let progress = i as f32 / sequence.len() as f32;
                let prefix_bias = 1.0 + 10.0 * progress.powi(2);
                let prefix = &sequence[..i];
                builder.push(prefix, prefix_bias);
            }
        }
        let trie = builder.build();

        Ok(BiasTrie { trie })
    }

    pub unsafe fn apply_bias_to_logits(
        &self,
        tokens: *const whisper_rs::whisper_rs_sys::whisper_token_data,
        n_tokens: std::os::raw::c_int,
        logits: *mut f32,
    ) {
        if tokens.is_null() || n_tokens <= 0 {
            return;
        }

        let current_tokens: Vec<WhisperTokenId> =
            std::slice::from_raw_parts(tokens, n_tokens as usize)
                .iter()
                .map(|t| t.id)
                .collect();

        for suffix_len in 1..=std::cmp::min(5, current_tokens.len()) {
            let suffix = &current_tokens[current_tokens.len() - suffix_len..];

            let mut found_continuations = false;

            for (full_sequence, bias_value_ref) in self.trie.predictive_search(suffix) {
                found_continuations = true;

                let bias_value = *bias_value_ref;
                let full_sequence: Vec<WhisperTokenId> = full_sequence;

                if full_sequence.len() > suffix.len() {
                    let next_token = full_sequence[suffix.len()];
                    let current_logit = *logits.offset(next_token as isize);
                    let new_logit = current_logit + bias_value.ln();

                    *logits.offset(next_token as isize) = new_logit;
                }
            }

            if found_continuations {
                break;
            }
        }
    }
}
