use anlg_e2ee::WorkspaceKeyring;
use anlg_tiptap::merge::{MergeSide, merge_documents};
use serde_json::Value;

use super::LocalState;

pub(super) struct MergedField {
    pub value: Value,
    pub had_conflicts: bool,
}

/// Three-way merge for a field that holds a TipTap document as JSON text.
/// The base is the last version this device synced, which is what the other
/// side also started from. Returns `None` when the field is not a document or
/// the base is unavailable, in which case whole-value ordering applies.
#[allow(clippy::too_many_arguments)]
pub(super) fn merge_concurrent_field(
    keyring: &WorkspaceKeyring,
    workspace_id: &str,
    table: &str,
    field: &str,
    state: &LocalState,
    local: &Value,
    remote: &Value,
    prefer_local: bool,
) -> Option<MergedField> {
    if table != "session_documents" || field != "body" || state.payload.is_empty() {
        return None;
    }
    let base = keyring
        .open_field(workspace_id, &state.record_id, &state.payload)
        .ok()?;
    let base_doc = parse_document(&base.value)?;
    let local_doc = parse_document(local)?;
    let remote_doc = parse_document(remote)?;
    let prefer = if prefer_local {
        MergeSide::Local
    } else {
        MergeSide::Remote
    };
    let outcome = merge_documents(&base_doc, &local_doc, &remote_doc, prefer)?;
    let value = Value::String(serde_json::to_string(&outcome.doc).ok()?);
    Some(MergedField {
        value,
        had_conflicts: !outcome.conflicts.is_empty(),
    })
}

fn parse_document(value: &Value) -> Option<Value> {
    let doc: Value = serde_json::from_str(value.as_str()?).ok()?;
    (doc.get("type").and_then(Value::as_str) == Some("doc")).then_some(doc)
}
