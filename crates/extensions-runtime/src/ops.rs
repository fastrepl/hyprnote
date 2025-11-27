use deno_core::op2;

#[op2]
#[string]
pub fn op_hypr_log(#[string] message: String) -> String {
    tracing::info!(target: "extension", "{}", message);
    "ok".to_string()
}
