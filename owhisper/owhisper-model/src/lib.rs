mod error;
pub use error::*;

use hypr_whisper_local_model::WhisperModel as HyprWhisper;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, strum::Display, clap::ValueEnum)]
pub enum Model {
    #[serde(rename = "whisper-cpp-base-q8")]
    #[strum(serialize = "whisper-cpp-base-q8")]
    WhisperCppBaseQ8,
    #[serde(rename = "whisper-cpp-base-q8-en")]
    #[strum(serialize = "whisper-cpp-base-q8-en")]
    WhisperCppBaseQ8En,
    #[serde(rename = "whisper-cpp-tiny-q8")]
    #[strum(serialize = "whisper-cpp-tiny-q8")]
    WhisperCppTinyQ8,
    #[serde(rename = "whisper-cpp-tiny-q8-en")]
    #[strum(serialize = "whisper-cpp-tiny-q8-en")]
    WhisperCppTinyQ8En,
    #[serde(rename = "whisper-cpp-small-q8")]
    #[strum(serialize = "whisper-cpp-small-q8")]
    WhisperCppSmallQ8,
    #[serde(rename = "whisper-cpp-small-q8-en")]
    #[strum(serialize = "whisper-cpp-small-q8-en")]
    WhisperCppSmallQ8En,
    #[serde(rename = "whisper-cpp-large-turbo-q8")]
    #[strum(serialize = "whisper-cpp-large-turbo-q8")]
    WhisperCppLargeTurboQ8,
    #[serde(rename = "moonshine-onnx-tiny")]
    #[strum(serialize = "moonshine-onnx-tiny")]
    MoonshineOnnxTiny,
    #[serde(rename = "moonshine-onnx-tiny-q4")]
    #[strum(serialize = "moonshine-onnx-tiny-q4")]
    MoonshineOnnxTinyQ4,
    #[serde(rename = "moonshine-onnx-tiny-q8")]
    #[strum(serialize = "moonshine-onnx-tiny-q8")]
    MoonshineOnnxTinyQ8,
    #[serde(rename = "moonshine-onnx-base")]
    #[strum(serialize = "moonshine-onnx-base")]
    MoonshineOnnxBase,
    #[serde(rename = "moonshine-onnx-base-q4")]
    #[strum(serialize = "moonshine-onnx-base-q4")]
    MoonshineOnnxBaseQ4,
    #[serde(rename = "moonshine-onnx-base-q8")]
    #[strum(serialize = "moonshine-onnx-base-q8")]
    MoonshineOnnxBaseQ8,
}

impl Model {
    pub fn verify(&self, assets_dir: &std::path::Path) -> Result<(), crate::Error> {
        for asset in self.assets() {
            let asset_path = assets_dir.join(&asset.name);

            if !asset_path.exists() {
                return Err(crate::Error::FileNotFound(asset_path));
            }

            let metadata = std::fs::metadata(&asset_path)?;
            if metadata.len() != asset.size {
                return Err(crate::Error::FileSizeMismatch(asset_path));
            }

            let checksum = hypr_file::calculate_file_checksum(&asset_path)?;
            if checksum != asset.checksum {
                return Err(crate::Error::FileChecksumMismatch(asset_path));
            }
        }

        Ok(())
    }
}

impl TryFrom<Model> for HyprWhisper {
    type Error = crate::Error;

    fn try_from(model: Model) -> Result<Self, Self::Error> {
        match model {
            Model::WhisperCppTinyQ8 => Ok(HyprWhisper::QuantizedTiny),
            Model::WhisperCppTinyQ8En => Ok(HyprWhisper::QuantizedTinyEn),
            Model::WhisperCppBaseQ8 => Ok(HyprWhisper::QuantizedBase),
            Model::WhisperCppBaseQ8En => Ok(HyprWhisper::QuantizedBaseEn),
            Model::WhisperCppSmallQ8 => Ok(HyprWhisper::QuantizedSmall),
            Model::WhisperCppSmallQ8En => Ok(HyprWhisper::QuantizedSmallEn),
            Model::WhisperCppLargeTurboQ8 => Ok(HyprWhisper::QuantizedLargeTurbo),
            Model::MoonshineOnnxTiny => Err(Error::NotSupported),
            Model::MoonshineOnnxTinyQ4 => Err(Error::NotSupported),
            Model::MoonshineOnnxTinyQ8 => Err(Error::NotSupported),
            Model::MoonshineOnnxBase => Err(Error::NotSupported),
            Model::MoonshineOnnxBaseQ4 => Err(Error::NotSupported),
            Model::MoonshineOnnxBaseQ8 => Err(Error::NotSupported),
        }
    }
}

#[derive(Clone)]
pub struct Asset {
    pub name: String,
    pub url: String,
    pub size: u64,
    pub checksum: u32,
}

impl Model {
    pub fn assets(&self) -> Vec<Asset> {
        match self {
            Model::WhisperCppTinyQ8
            | Model::WhisperCppTinyQ8En
            | Model::WhisperCppBaseQ8
            | Model::WhisperCppBaseQ8En
            | Model::WhisperCppSmallQ8
            | Model::WhisperCppSmallQ8En
            | Model::WhisperCppLargeTurboQ8 => {
                let hypr_model: HyprWhisper = self.clone().try_into().unwrap();

                vec![Asset {
                    name: "model.ggml".to_string(),
                    url: hypr_model.model_url().to_string(),
                    size: hypr_model.model_size_bytes(),
                    checksum: hypr_model.checksum(),
                }]
            }

            Model::MoonshineOnnxBase => {
                vec![
                    Asset {
                        name: "tokenizer.json".to_string(),
                        url: "https://storage2.hyprnote.com/v0/UsefulSensors/moonshine/tokenizer.json".to_string(),
                        size: 1985530,
                        checksum: 1800591672,
                    },
                    Asset {
                        name: "encoder_model.onnx".to_string(),
                        url: "https://storage2.hyprnote.com/v0/UsefulSensors/moonshine/onnx/merged/base/float/encoder_model.onnx".to_string(),
                        size: 80818781,
                        checksum: 4261777944,
                    },
                    Asset {
                        name: "decoder_model_merged.onnx".to_string(),
                        url: "https://storage2.hyprnote.com/v0/UsefulSensors/moonshine/onnx/merged/base/float/decoder_model_merged.onnx".to_string(),
                        size: 166211345,
                        checksum: 4284499744,
                    },
                ]
            }
            Model::MoonshineOnnxBaseQ8 => {
                vec![
                    Asset {
                        name: "tokenizer.json".to_string(),
                        url: "https://storage2.hyprnote.com/v0/UsefulSensors/moonshine/tokenizer.json".to_string(),
                        size: 1985530,
                        checksum: 1800591672,
                    },
                    Asset {
                        name: "encoder_model.onnx".to_string(),
                        url: "https://storage2.hyprnote.com/v0/UsefulSensors/moonshine/onnx/merged/base/quantized/encoder_model.onnx".to_string(),
                        size: 20513063,
                        checksum: 2520442982,
                    },
                    Asset {
                        name: "decoder_model_merged.onnx".to_string(),
                        url: "https://storage2.hyprnote.com/v0/UsefulSensors/moonshine/onnx/merged/base/quantized/decoder_model_merged.onnx".to_string(),
                        size: 42498870,
                        checksum: 4007751459,
                    },
                ]
            }
            Model::MoonshineOnnxBaseQ4 => {
                vec![
                    Asset {
                        name: "tokenizer.json".to_string(),
                        url: "https://storage2.hyprnote.com/v0/UsefulSensors/moonshine/tokenizer.json".to_string(),
                        size: 1985530,
                        checksum: 1800591672,
                    },
                    Asset {
                        name: "encoder_model.onnx".to_string(),
                        url: "https://storage2.hyprnote.com/v0/UsefulSensors/moonshine/onnx/merged/base/quantized_4bit/encoder_model.onnx".to_string(),
                        size: 31027744,
                        checksum: 1761974521,
                    },
                    Asset {
                        name: "decoder_model_merged.onnx".to_string(),
                        url: "https://storage2.hyprnote.com/v0/UsefulSensors/moonshine/onnx/merged/base/quantized_4bit/decoder_model_merged.onnx".to_string(),
                        size: 42427308,
                        checksum: 1460870890,
                    },
                ]
            }
            Model::MoonshineOnnxTiny => {
                vec![
                    Asset {
                        name: "tokenizer.json".to_string(),
                        url: "https://storage2.hyprnote.com/v0/UsefulSensors/moonshine/tokenizer.json".to_string(),
                        size: 1985530,
                        checksum: 1800591672,
                    },
                    Asset {
                        name: "encoder_model.onnx".to_string(),
                        url: "https://storage2.hyprnote.com/v0/UsefulSensors/moonshine/onnx/merged/tiny/float/encoder_model.onnx".to_string(),
                        size: 30882331,
                        checksum: 3259662431,
                    },
                    Asset {
                        name: "decoder_model_merged.onnx".to_string(),
                        url: "https://storage2.hyprnote.com/v0/UsefulSensors/moonshine/onnx/merged/tiny/float/decoder_model_merged.onnx".to_string(),
                        size: 78227550,
                        checksum: 2598806900,
                    },
                ]
            }
            Model::MoonshineOnnxTinyQ4 => {
                vec![
                    Asset {
                        name: "tokenizer.json".to_string(),
                        url: "https://storage2.hyprnote.com/v0/UsefulSensors/moonshine/tokenizer.json".to_string(),
                        size: 1985530,
                        checksum: 1800591672,
                    },
                    Asset {
                        name: "encoder_model.onnx".to_string(),
                        url: "https://storage2.hyprnote.com/v0/UsefulSensors/moonshine/onnx/merged/tiny/quantized_4bit/encoder_model.onnx".to_string(),
                        size: 13003282,
                        checksum: 26504769,
                    },
                    Asset {
                        name: "decoder_model_merged.onnx".to_string(),
                        url: "https://storage2.hyprnote.com/v0/UsefulSensors/moonshine/onnx/merged/tiny/quantized_4bit/decoder_model_merged.onnx".to_string(),
                        size: 20189543,
                        checksum: 158090752,
                    },
                ]
            }
            Model::MoonshineOnnxTinyQ8 => {
                vec![
                    Asset {
                        name: "tokenizer.json".to_string(),
                        url: "https://storage2.hyprnote.com/v0/UsefulSensors/moonshine/tokenizer.json".to_string(),
                        size: 1985530,
                        checksum: 1800591672,
                    },
                    Asset {
                        name: "encoder_model.onnx".to_string(),
                        url: "https://storage2.hyprnote.com/v0/UsefulSensors/moonshine/onnx/merged/tiny/quantized/encoder_model.onnx".to_string(),
                        size: 7937661,
                        checksum: 633860095,
                    },
                    Asset {
                        name: "decoder_model_merged.onnx".to_string(),
                        url: "https://storage2.hyprnote.com/v0/UsefulSensors/moonshine/onnx/merged/tiny/quantized/decoder_model_merged.onnx".to_string(),
                        size: 20243286,
                        checksum: 4021622913,
                    },
                ]
            }
        }
    }
}
