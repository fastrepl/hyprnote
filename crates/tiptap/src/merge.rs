//! Three-way merge of TipTap documents at top-level block granularity.
//!
//! Two devices that edited the same note while apart usually touched different
//! paragraphs. Diffing each side against the last synced version and keeping
//! every change that does not overlap turns most of those cases into a clean
//! merge. Only regions both sides rewrote are conflicts; the caller picks which
//! side those regions keep and stores the other.

use serde_json::{Map, Value};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum MergeSide {
    Local,
    Remote,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct BlockConflict {
    pub base: Vec<Value>,
    pub local: Vec<Value>,
    pub remote: Vec<Value>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct MergeOutcome {
    pub doc: Value,
    pub conflicts: Vec<BlockConflict>,
}

/// Merges `local` and `remote`, both derived from `base`. Returns `None` when
/// any input is not a TipTap document, in which case the caller falls back to
/// whole-value ordering. Regions both sides changed differently keep the
/// `prefer` side; blocks both sides inserted at the same spot are kept in
/// chronological order, the non-preferred (earlier) side first.
pub fn merge_documents(
    base: &Value,
    local: &Value,
    remote: &Value,
    prefer: MergeSide,
) -> Option<MergeOutcome> {
    let base_blocks = document_blocks(base)?;
    let local_blocks = document_blocks(local)?;
    let remote_blocks = document_blocks(remote)?;

    let base_keys = block_keys(base_blocks);
    let mut hunks = hunks_against_base(&base_keys, local_blocks, MergeSide::Local);
    hunks.extend(hunks_against_base(
        &base_keys,
        remote_blocks,
        MergeSide::Remote,
    ));
    // Earlier edit first when two sides insert at the same spot.
    hunks.sort_by_key(|hunk| (hunk.base_start, hunk.base_end, hunk.side == prefer));
    let clusters = cluster_hunks(hunks);

    let mut merged = Vec::with_capacity(local_blocks.len().max(remote_blocks.len()));
    let mut conflicts = Vec::new();
    let mut base_cursor = 0;
    for cluster in clusters {
        merged.extend_from_slice(&base_blocks[base_cursor..cluster.base_start]);
        resolve_cluster(&cluster, base_blocks, prefer, &mut merged, &mut conflicts);
        base_cursor = cluster.base_end;
    }
    merged.extend_from_slice(&base_blocks[base_cursor..]);

    let root = match prefer {
        MergeSide::Local => local,
        MergeSide::Remote => remote,
    };
    let mut doc = root.as_object().cloned().unwrap_or_default();
    doc.insert("content".to_string(), Value::Array(merged));
    Some(MergeOutcome {
        doc: Value::Object(doc),
        conflicts,
    })
}

/// One side's change to a base range: the blocks in `base[base_start..base_end)`
/// became `blocks`. An insertion has an empty base range.
#[derive(Clone, Debug)]
struct Hunk {
    side: MergeSide,
    base_start: usize,
    base_end: usize,
    blocks: Vec<Value>,
    keys: Vec<String>,
}

fn hunks_against_base(base_keys: &[String], side_blocks: &[Value], side: MergeSide) -> Vec<Hunk> {
    let side_keys = block_keys(side_blocks);
    let mut matches = longest_common_subsequence(base_keys, &side_keys);
    matches.push((base_keys.len(), side_keys.len()));
    let mut hunks = Vec::new();
    let (mut base_cursor, mut side_cursor) = (0, 0);
    for (base_index, side_index) in matches {
        if base_cursor < base_index || side_cursor < side_index {
            hunks.push(Hunk {
                side,
                base_start: base_cursor,
                base_end: base_index,
                blocks: side_blocks[side_cursor..side_index].to_vec(),
                keys: side_keys[side_cursor..side_index].to_vec(),
            });
        }
        base_cursor = base_index + 1;
        side_cursor = side_index + 1;
    }
    hunks
}

#[derive(Debug)]
struct Cluster {
    base_start: usize,
    base_end: usize,
    hunks: Vec<Hunk>,
}

// Hunks whose base ranges overlap belong to one region and must be resolved
// together. Touching ranges stay separate so a deletion right before an edit
// still merges. Two hunks over exactly the same range are grouped so identical
// insertions collapse to one.
fn cluster_hunks(hunks: Vec<Hunk>) -> Vec<Cluster> {
    let mut clusters: Vec<Cluster> = Vec::new();
    for hunk in hunks {
        if let Some(cluster) = clusters.last_mut()
            && (hunk.base_start < cluster.base_end
                || (hunk.base_start == cluster.base_start && hunk.base_end == cluster.base_end))
        {
            cluster.base_end = cluster.base_end.max(hunk.base_end);
            cluster.hunks.push(hunk);
            continue;
        }
        clusters.push(Cluster {
            base_start: hunk.base_start,
            base_end: hunk.base_end,
            hunks: vec![hunk],
        });
    }
    clusters
}

fn resolve_cluster(
    cluster: &Cluster,
    base_blocks: &[Value],
    prefer: MergeSide,
    merged: &mut Vec<Value>,
    conflicts: &mut Vec<BlockConflict>,
) {
    let local: Vec<&Hunk> = cluster
        .hunks
        .iter()
        .filter(|hunk| hunk.side == MergeSide::Local)
        .collect();
    let remote: Vec<&Hunk> = cluster
        .hunks
        .iter()
        .filter(|hunk| hunk.side == MergeSide::Remote)
        .collect();
    let local_version = side_version(cluster, base_blocks, &local);
    let remote_version = side_version(cluster, base_blocks, &remote);
    match (local.is_empty(), remote.is_empty()) {
        (true, true) => {}
        (false, true) => merged.extend(local_version),
        (true, false) => merged.extend(remote_version),
        (false, false) => {
            let same_change = local.len() == 1
                && remote.len() == 1
                && local[0].base_start == remote[0].base_start
                && local[0].base_end == remote[0].base_end
                && local[0].keys == remote[0].keys;
            let both_inserted_here = cluster.base_start == cluster.base_end;
            if same_change {
                merged.extend(local_version);
            } else if both_inserted_here {
                for hunk in &cluster.hunks {
                    merged.extend_from_slice(&hunk.blocks);
                }
            } else {
                let (kept, base, local_blocks, remote_blocks) = match prefer {
                    MergeSide::Local => (
                        local_version.clone(),
                        base_blocks[cluster.base_start..cluster.base_end].to_vec(),
                        local_version,
                        remote_version,
                    ),
                    MergeSide::Remote => (
                        remote_version.clone(),
                        base_blocks[cluster.base_start..cluster.base_end].to_vec(),
                        local_version,
                        remote_version,
                    ),
                };
                merged.extend(kept);
                conflicts.push(BlockConflict {
                    base,
                    local: local_blocks,
                    remote: remote_blocks,
                });
            }
        }
    }
}

// What one side's document looks like across the cluster's base range: its
// hunks' replacement blocks, with untouched base blocks between them.
fn side_version(cluster: &Cluster, base_blocks: &[Value], hunks: &[&Hunk]) -> Vec<Value> {
    let mut version = Vec::new();
    let mut base_cursor = cluster.base_start;
    for hunk in hunks {
        version.extend_from_slice(&base_blocks[base_cursor..hunk.base_start.max(base_cursor)]);
        version.extend_from_slice(&hunk.blocks);
        base_cursor = hunk.base_end.max(base_cursor);
    }
    version.extend_from_slice(&base_blocks[base_cursor..cluster.base_end.max(base_cursor)]);
    version
}

fn document_blocks(doc: &Value) -> Option<&[Value]> {
    let object = doc.as_object()?;
    if object.get("type").and_then(Value::as_str) != Some("doc") {
        return None;
    }
    match object.get("content") {
        None | Some(Value::Null) => Some(&[]),
        Some(Value::Array(blocks)) => Some(blocks.as_slice()),
        Some(_) => None,
    }
}

fn block_keys(blocks: &[Value]) -> Vec<String> {
    blocks
        .iter()
        .map(|block| canonical(block).to_string())
        .collect()
}

// Object key order is not significant, so sort keys before comparing blocks.
fn canonical(value: &Value) -> Value {
    match value {
        Value::Object(object) => {
            let mut entries = object
                .iter()
                .map(|(key, value)| (key.clone(), canonical(value)))
                .collect::<Vec<_>>();
            entries.sort_by(|left, right| left.0.cmp(&right.0));
            Value::Object(Map::from_iter(entries))
        }
        Value::Array(items) => Value::Array(items.iter().map(canonical).collect()),
        other => other.clone(),
    }
}

fn longest_common_subsequence(left: &[String], right: &[String]) -> Vec<(usize, usize)> {
    let mut lengths = vec![vec![0_usize; right.len() + 1]; left.len() + 1];
    for (i, left_key) in left.iter().enumerate().rev() {
        for (j, right_key) in right.iter().enumerate().rev() {
            lengths[i][j] = if left_key == right_key {
                lengths[i + 1][j + 1] + 1
            } else {
                lengths[i + 1][j].max(lengths[i][j + 1])
            };
        }
    }
    let mut pairs = Vec::with_capacity(lengths[0][0]);
    let (mut i, mut j) = (0, 0);
    while i < left.len() && j < right.len() {
        if left[i] == right[j] {
            pairs.push((i, j));
            i += 1;
            j += 1;
        } else if lengths[i + 1][j] >= lengths[i][j + 1] {
            i += 1;
        } else {
            j += 1;
        }
    }
    pairs
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn paragraph(text: &str) -> Value {
        json!({ "type": "paragraph", "content": [{ "type": "text", "text": text }] })
    }

    fn doc(blocks: Vec<Value>) -> Value {
        json!({ "type": "doc", "content": blocks })
    }

    fn texts(doc: &Value) -> Vec<String> {
        doc["content"]
            .as_array()
            .unwrap()
            .iter()
            .map(|block| {
                block["content"][0]["text"]
                    .as_str()
                    .unwrap_or("")
                    .to_string()
            })
            .collect()
    }

    #[test]
    fn edits_to_different_blocks_merge_cleanly() {
        let base = doc(vec![
            paragraph("intro"),
            paragraph("middle"),
            paragraph("end"),
        ]);
        let local = doc(vec![
            paragraph("intro edited"),
            paragraph("middle"),
            paragraph("end"),
        ]);
        let remote = doc(vec![
            paragraph("intro"),
            paragraph("middle"),
            paragraph("end"),
            paragraph("remote appendix"),
        ]);

        let outcome = merge_documents(&base, &local, &remote, MergeSide::Remote).unwrap();

        assert_eq!(
            texts(&outcome.doc),
            vec!["intro edited", "middle", "end", "remote appendix"]
        );
        assert!(outcome.conflicts.is_empty());
    }

    #[test]
    fn the_same_block_rewritten_on_both_sides_keeps_the_preferred_side() {
        let base = doc(vec![paragraph("a"), paragraph("b")]);
        let local = doc(vec![paragraph("a"), paragraph("b from local")]);
        let remote = doc(vec![paragraph("a"), paragraph("b from remote")]);

        let outcome = merge_documents(&base, &local, &remote, MergeSide::Local).unwrap();
        assert_eq!(texts(&outcome.doc), vec!["a", "b from local"]);
        assert_eq!(outcome.conflicts.len(), 1);
        assert_eq!(outcome.conflicts[0].base, vec![paragraph("b")]);
        assert_eq!(outcome.conflicts[0].local, vec![paragraph("b from local")]);
        assert_eq!(
            outcome.conflicts[0].remote,
            vec![paragraph("b from remote")]
        );

        let outcome = merge_documents(&base, &local, &remote, MergeSide::Remote).unwrap();
        assert_eq!(texts(&outcome.doc), vec!["a", "b from remote"]);
    }

    #[test]
    fn identical_changes_are_not_conflicts() {
        let base = doc(vec![paragraph("a")]);
        let local = doc(vec![paragraph("a"), paragraph("same")]);
        let remote = doc(vec![paragraph("a"), paragraph("same")]);

        let outcome = merge_documents(&base, &local, &remote, MergeSide::Local).unwrap();
        assert_eq!(texts(&outcome.doc), vec!["a", "same"]);
        assert!(outcome.conflicts.is_empty());
    }

    #[test]
    fn insertions_at_the_same_spot_keep_both_in_edit_order() {
        let base = doc(vec![paragraph("notes")]);
        let local = doc(vec![paragraph("notes"), paragraph("local thought")]);
        let remote = doc(vec![paragraph("notes"), paragraph("remote thought")]);

        let outcome = merge_documents(&base, &local, &remote, MergeSide::Remote).unwrap();
        assert_eq!(
            texts(&outcome.doc),
            vec!["notes", "local thought", "remote thought"]
        );
        assert!(outcome.conflicts.is_empty());
    }

    #[test]
    fn a_delete_against_an_edit_is_a_conflict() {
        let base = doc(vec![paragraph("keep"), paragraph("contested")]);
        let local = doc(vec![paragraph("keep")]);
        let remote = doc(vec![paragraph("keep"), paragraph("contested, improved")]);

        let outcome = merge_documents(&base, &local, &remote, MergeSide::Remote).unwrap();
        assert_eq!(texts(&outcome.doc), vec!["keep", "contested, improved"]);
        assert_eq!(outcome.conflicts.len(), 1);
    }

    #[test]
    fn deletions_on_one_side_apply() {
        let base = doc(vec![paragraph("a"), paragraph("b"), paragraph("c")]);
        let local = doc(vec![paragraph("a"), paragraph("c")]);
        let remote = doc(vec![paragraph("a"), paragraph("b"), paragraph("c edited")]);

        let outcome = merge_documents(&base, &local, &remote, MergeSide::Local).unwrap();
        assert_eq!(texts(&outcome.doc), vec!["a", "c edited"]);
        assert!(outcome.conflicts.is_empty());
    }

    #[test]
    fn key_order_does_not_make_blocks_look_different() {
        let base = doc(vec![
            json!({ "type": "paragraph", "attrs": { "x": 1 }, "content": [] }),
        ]);
        let local = doc(vec![
            json!({ "content": [], "attrs": { "x": 1 }, "type": "paragraph" }),
        ]);
        let remote = doc(vec![
            json!({ "type": "paragraph", "attrs": { "x": 1 }, "content": [] }),
            paragraph("new"),
        ]);

        let outcome = merge_documents(&base, &local, &remote, MergeSide::Local).unwrap();
        assert_eq!(outcome.doc["content"].as_array().unwrap().len(), 2);
        assert!(outcome.conflicts.is_empty());
    }

    #[test]
    fn non_documents_are_left_to_the_caller() {
        assert!(
            merge_documents(&json!("text"), &json!("a"), &json!("b"), MergeSide::Local).is_none()
        );
        assert!(
            merge_documents(
                &doc(vec![]),
                &json!({ "type": "paragraph" }),
                &doc(vec![]),
                MergeSide::Local
            )
            .is_none()
        );
    }

    #[test]
    fn merge_is_symmetric_for_the_same_inputs() {
        let base = doc(vec![paragraph("a"), paragraph("b"), paragraph("c")]);
        let local = doc(vec![
            paragraph("a!"),
            paragraph("b"),
            paragraph("c"),
            paragraph("d"),
        ]);
        let remote = doc(vec![paragraph("a"), paragraph("b?"), paragraph("c")]);

        let from_local = merge_documents(&base, &local, &remote, MergeSide::Remote).unwrap();
        let from_remote = merge_documents(&base, &remote, &local, MergeSide::Local).unwrap();
        assert_eq!(texts(&from_local.doc), texts(&from_remote.doc));
        assert_eq!(texts(&from_local.doc), vec!["a!", "b?", "c", "d"]);
    }
}
