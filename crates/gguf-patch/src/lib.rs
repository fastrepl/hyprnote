pub mod gguf {
    pub mod patch {
        include!(concat!(env!("OUT_DIR"), "/gguf.patch.rs"));
    }
}

pub use gguf::patch::{GgufPatch, PatchEntry, PatchMetadata, PatchOperation};
