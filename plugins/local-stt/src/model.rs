use hypr_am::AmModel;
use hypr_whisper_local_model::WhisperModel;

pub static SUPPORTED_MODELS: [SupportedSttModel; 10] = [
    SupportedSttModel::Whisper(WhisperModel::QuantizedTiny),
    SupportedSttModel::Whisper(WhisperModel::QuantizedTinyEn),
    SupportedSttModel::Whisper(WhisperModel::QuantizedBase),
    SupportedSttModel::Whisper(WhisperModel::QuantizedBaseEn),
    SupportedSttModel::Whisper(WhisperModel::QuantizedSmall),
    SupportedSttModel::Whisper(WhisperModel::QuantizedSmallEn),
    SupportedSttModel::Whisper(WhisperModel::QuantizedLargeTurbo),
    SupportedSttModel::Am(AmModel::ParakeetV2),
    SupportedSttModel::Am(AmModel::ParakeetV3),
    SupportedSttModel::Am(AmModel::WhisperLargeV3),
];

#[derive(serde::Serialize, serde::Deserialize, specta::Type)]
pub struct SttModelInfo {
    pub key: SupportedSttModel,
    pub display_name: String,
    pub size_bytes: u64,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type, Eq, Hash, PartialEq)]
#[serde(untagged)]
pub enum SupportedSttModel {
    Whisper(WhisperModel),
    Am(AmModel),
}

impl SupportedSttModel {
    pub fn supported_languages(&self) -> Vec<hypr_language::Language> {
        use hypr_language::ISO639;

        let whisper_multi_languages: Vec<hypr_language::Language> = vec![
            ISO639::Af.into(),
            ISO639::Am.into(),
            ISO639::Ar.into(),
            ISO639::As.into(),
            ISO639::Az.into(),
            ISO639::Ba.into(),
            ISO639::Be.into(),
            ISO639::Bg.into(),
            ISO639::Bn.into(),
            ISO639::Bo.into(),
            ISO639::Br.into(),
            ISO639::Bs.into(),
            ISO639::Ca.into(),
            ISO639::Cs.into(),
            ISO639::Cy.into(),
            ISO639::Da.into(),
            ISO639::De.into(),
            ISO639::El.into(),
            ISO639::En.into(),
            ISO639::Es.into(),
            ISO639::Et.into(),
            ISO639::Eu.into(),
            ISO639::Fa.into(),
            ISO639::Fi.into(),
            ISO639::Fo.into(),
            ISO639::Fr.into(),
            ISO639::Gl.into(),
            ISO639::Gu.into(),
            ISO639::Ha.into(),
            ISO639::He.into(),
            ISO639::Hi.into(),
            ISO639::Hr.into(),
            ISO639::Ht.into(),
            ISO639::Hu.into(),
            ISO639::Hy.into(),
            ISO639::Id.into(),
            ISO639::Is.into(),
            ISO639::It.into(),
            ISO639::Ja.into(),
            ISO639::Jv.into(),
            ISO639::Ka.into(),
            ISO639::Kk.into(),
            ISO639::Km.into(),
            ISO639::Kn.into(),
            ISO639::Ko.into(),
            ISO639::La.into(),
            ISO639::Lb.into(),
            ISO639::Lo.into(),
            ISO639::Lt.into(),
            ISO639::Lv.into(),
            ISO639::Mg.into(),
            ISO639::Mi.into(),
            ISO639::Mk.into(),
            ISO639::Ml.into(),
            ISO639::Mn.into(),
            ISO639::Mr.into(),
            ISO639::Ms.into(),
            ISO639::Mt.into(),
            ISO639::My.into(),
            ISO639::Ne.into(),
            ISO639::Nl.into(),
            ISO639::Nn.into(),
            ISO639::No.into(),
            ISO639::Oc.into(),
            ISO639::Pa.into(),
            ISO639::Pl.into(),
            ISO639::Ps.into(),
            ISO639::Pt.into(),
            ISO639::Ro.into(),
            ISO639::Ru.into(),
            ISO639::Sa.into(),
            ISO639::Sd.into(),
            ISO639::Si.into(),
            ISO639::Sk.into(),
            ISO639::Sl.into(),
            ISO639::Sn.into(),
            ISO639::So.into(),
            ISO639::Sq.into(),
            ISO639::Sr.into(),
            ISO639::Su.into(),
            ISO639::Sv.into(),
            ISO639::Sw.into(),
            ISO639::Ta.into(),
            ISO639::Te.into(),
            ISO639::Tg.into(),
            ISO639::Th.into(),
            ISO639::Tk.into(),
            ISO639::Tl.into(),
            ISO639::Tr.into(),
            ISO639::Tt.into(),
            ISO639::Uk.into(),
            ISO639::Ur.into(),
            ISO639::Uz.into(),
            ISO639::Vi.into(),
            ISO639::Yi.into(),
            ISO639::Yo.into(),
            ISO639::Zh.into(),
        ];

        // https://huggingface.co/nvidia/parakeet-tdt-0.6b-v3
        let parakeet_v3_languages: Vec<hypr_language::Language> = vec![
            ISO639::Bg.into(),
            ISO639::Hr.into(),
            ISO639::Cs.into(),
            ISO639::Da.into(),
            ISO639::Nl.into(),
            ISO639::En.into(),
            ISO639::Et.into(),
            ISO639::Fi.into(),
            ISO639::Fr.into(),
            ISO639::De.into(),
            ISO639::El.into(),
            ISO639::Hu.into(),
            ISO639::It.into(),
            ISO639::Lv.into(),
            ISO639::Lt.into(),
            ISO639::Mt.into(),
            ISO639::Pl.into(),
            ISO639::Pt.into(),
            ISO639::Ro.into(),
            ISO639::Sk.into(),
            ISO639::Sl.into(),
            ISO639::Es.into(),
            ISO639::Sv.into(),
            ISO639::Ru.into(),
            ISO639::Uk.into(),
        ];

        match self {
            SupportedSttModel::Whisper(model) => match model {
                hypr_whisper_local_model::WhisperModel::QuantizedTinyEn
                | hypr_whisper_local_model::WhisperModel::QuantizedBaseEn
                | hypr_whisper_local_model::WhisperModel::QuantizedSmallEn => {
                    vec![ISO639::En.into()]
                }
                hypr_whisper_local_model::WhisperModel::QuantizedTiny
                | hypr_whisper_local_model::WhisperModel::QuantizedBase
                | hypr_whisper_local_model::WhisperModel::QuantizedSmall
                | hypr_whisper_local_model::WhisperModel::QuantizedLargeTurbo => {
                    whisper_multi_languages
                }
            },
            SupportedSttModel::Am(model) => match model {
                hypr_am::AmModel::ParakeetV2 => vec![ISO639::En.into()],
                hypr_am::AmModel::ParakeetV3 => parakeet_v3_languages,
                hypr_am::AmModel::WhisperLargeV3 => whisper_multi_languages,
            },
        }
    }

    pub fn info(&self) -> SttModelInfo {
        match self {
            SupportedSttModel::Whisper(model) => SttModelInfo {
                key: self.clone(),
                display_name: model.display_name().to_string(),
                size_bytes: model.model_size_bytes(),
            },
            SupportedSttModel::Am(model) => SttModelInfo {
                key: self.clone(),
                display_name: model.display_name().to_string(),
                size_bytes: model.model_size_bytes(),
            },
        }
    }
}
