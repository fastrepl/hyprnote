use trie_rs::map::{Trie, TrieBuilder};
use whisper_rs::{WhisperContext, WhisperTokenId};

#[derive(Clone)]
pub struct BiasTrie {
    trie: Trie<WhisperTokenId, f32>,
}

impl BiasTrie {
    pub fn new(ctx: &WhisperContext, custom_vocab: &[&str]) -> Result<Self, crate::Error> {
        let mut builder = TrieBuilder::new();

        for word in custom_vocab {
            let variants = Self::generate_tokenization_variants(ctx, word)?;

            for tokens in variants {
                for i in 1..=tokens.len() {
                    let progress = i as f32 / tokens.len() as f32;

                    let prefix_bias = 10.0 + 90.0 * progress.powi(2);

                    let prefix = &tokens[..i];
                    builder.push(prefix, prefix_bias);
                }
            }
        }

        let trie = builder.build();
        Ok(BiasTrie { trie })
    }

    fn generate_tokenization_variants(
        ctx: &WhisperContext,
        word: &str,
    ) -> Result<Vec<Vec<WhisperTokenId>>, crate::Error> {
        let mut variants = Vec::new();

        variants.push(ctx.tokenize(word, 99)?);
        variants.push(ctx.tokenize(&format!(" {}", word), 99)?);

        let lower = word.to_lowercase();
        if lower != word {
            variants.push(ctx.tokenize(&lower, 99)?);
            variants.push(ctx.tokenize(&format!(" {}", lower), 99)?);
        }

        let upper = word.to_uppercase();
        if upper != word {
            variants.push(ctx.tokenize(&upper, 99)?);
        }

        variants.push(ctx.tokenize(&format!("'{}", word), 99)?);
        variants.push(ctx.tokenize(&format!("\"{}", word), 99)?);

        Ok(variants)
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

        for suffix_len in 1..=std::cmp::min(10, current_tokens.len()) {
            let suffix = &current_tokens[current_tokens.len() - suffix_len..];

            for (full_sequence, bias_value_ref) in self.trie.predictive_search(suffix) {
                let bias_value = *bias_value_ref;
                let full_sequence: Vec<WhisperTokenId> = full_sequence;

                if full_sequence.len() > suffix.len() {
                    let next_token = full_sequence[suffix.len()];
                    let current_logit = *logits.offset(next_token as isize);

                    let boost = bias_value.ln() * 2.0;
                    let new_logit = current_logit + boost;

                    *logits.offset(next_token as isize) = new_logit;
                }
            }
        }
    }
}
