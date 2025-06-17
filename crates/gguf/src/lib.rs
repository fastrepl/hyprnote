use std::fs::File;
use std::io::{Cursor, Seek, SeekFrom};
use std::path::Path;

use byteorder::{BigEndian, LittleEndian, ReadBytesExt};
use memmap2::Mmap;

mod error;
pub use error::*;

mod template;
pub use template::*;

mod value;
pub use value::*;

mod utils;
pub use utils::*;

pub trait GgufExt {
    fn gguf_chat_format(&self) -> Result<Option<ChatTemplate>>;
}

impl<T: AsRef<Path>> GgufExt for T {
    fn gguf_chat_format(&self) -> Result<Option<ChatTemplate>> {
        let file = File::open(self.as_ref())?;
        let map = unsafe { Mmap::map(&file)? };
        let mut reader = Cursor::new(&map[..]);

        let magic = reader.read_u32::<LittleEndian>()?;
        if magic != GGUF_MAGIC {
            return Err(Error::InvalidMagic);
        }

        let (version, is_little_endian) = {
            reader.seek(SeekFrom::Start(4))?;
            let version_le = reader.read_u32::<LittleEndian>()?;

            if version_le & 65535 != 0 {
                (version_le, true)
            } else {
                reader.seek(SeekFrom::Start(4))?;
                let version_be = reader.read_u32::<BigEndian>()?;
                (version_be, false)
            }
        };

        if version > 3 {
            return Err(Error::UnsupportedVersion(version));
        }

        // Reset position to after version
        reader.seek(SeekFrom::Start(8))?;

        let _tensor_count = read_versioned_size(&mut reader, version, is_little_endian)?;
        let metadata_kv_count = read_versioned_size(&mut reader, version, is_little_endian)?;

        for _ in 0..metadata_kv_count {
            let key = read_string(&mut reader, version, is_little_endian)?;

            let value_type_raw = if is_little_endian {
                reader.read_u32::<LittleEndian>()?
            } else {
                reader.read_u32::<BigEndian>()?
            };
            let value_type = GGUFMetadataValueType::try_from(value_type_raw)?;

            if key == "tokenizer.chat_template" {
                if let GGUFMetadataValueType::String = value_type {
                    let template = read_string(&mut reader, version, is_little_endian)?;
                    return Ok(Some(ChatTemplate::TemplateValue(template)));
                } else {
                    skip_value(&mut reader, value_type, version, is_little_endian)?;
                }
            } else {
                skip_value(&mut reader, value_type, version, is_little_endian)?;
            }
        }

        // If we didn't find a chat template, try to infer from architecture
        reader.seek(SeekFrom::Start(8))?;

        // Skip tensor count
        read_versioned_size(&mut reader, version, is_little_endian)?;

        // Read metadata count again
        let metadata_kv_count = read_versioned_size(&mut reader, version, is_little_endian)?;

        let mut architecture = None;

        for _ in 0..metadata_kv_count {
            let key = read_string(&mut reader, version, is_little_endian)?;

            let value_type_raw = if is_little_endian {
                reader.read_u32::<LittleEndian>()?
            } else {
                reader.read_u32::<BigEndian>()?
            };
            let value_type = GGUFMetadataValueType::try_from(value_type_raw)?;

            if key == "general.architecture" {
                if let GGUFMetadataValueType::String = value_type {
                    architecture = Some(read_string(&mut reader, version, is_little_endian)?);
                    break;
                } else {
                    skip_value(&mut reader, value_type, version, is_little_endian)?;
                }
            } else {
                skip_value(&mut reader, value_type, version, is_little_endian)?;
            }
        }

        if let Some(arch) = architecture {
            match arch.to_lowercase().as_str() {
                "llama" => Ok(Some(ChatTemplate::TemplateKey(LlamaCppRegistry::Llama2))),
                "mistral" => Ok(Some(ChatTemplate::TemplateKey(LlamaCppRegistry::MistralV1))),
                "falcon" => Ok(Some(ChatTemplate::TemplateKey(LlamaCppRegistry::Falcon3))),
                "mpt" => Ok(Some(ChatTemplate::TemplateKey(LlamaCppRegistry::ChatML))),
                "phi2" => Ok(Some(ChatTemplate::TemplateKey(LlamaCppRegistry::Phi3))),
                "gpt2" | "gptj" | "gptneox" => {
                    Ok(Some(ChatTemplate::TemplateKey(LlamaCppRegistry::ChatML)))
                }
                "llama3" => Ok(Some(ChatTemplate::TemplateKey(LlamaCppRegistry::Llama3))),
                "gemma" | "gemma3" => Ok(Some(ChatTemplate::TemplateKey(LlamaCppRegistry::Gemma))),
                "phi3" => Ok(Some(ChatTemplate::TemplateKey(LlamaCppRegistry::Phi3))),
                "phi4" => Ok(Some(ChatTemplate::TemplateKey(LlamaCppRegistry::Phi4))),
                _ => Ok(None),
            }
        } else {
            Ok(None)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::GgufExt;

    #[test]
    fn test_gguf_chat_format() {
        let test_path = dirs::data_dir()
            .unwrap()
            .join("com.hyprnote.stable")
            .join("llm.gguf");

        assert!(test_path.exists());
        test_path.gguf_chat_format().unwrap().unwrap();
    }
}
