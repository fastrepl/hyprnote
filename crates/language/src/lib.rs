mod error;
pub use error::*;

use std::str::FromStr;

pub use codes_iso_639::part_1::LanguageCode as ISO639;
pub use codes_iso_639::part_3::LanguageCode as ISO639_3;

#[derive(Debug, Clone, PartialEq)]
pub enum LanguageCode {
    Part1(ISO639),
    Cmn,
    Yue,
}

#[derive(Debug, Clone, PartialEq, schemars::JsonSchema)]
pub struct Language {
    #[schemars(with = "String", regex(pattern = "^[a-zA-Z]{2,3}$"))]
    code: LanguageCode,
}

impl specta::Type for Language {
    fn inline(_: &mut specta::TypeCollection, _: specta::Generics) -> specta::DataType {
        specta::DataType::Primitive(specta::datatype::PrimitiveType::String)
    }
}

impl Default for Language {
    fn default() -> Self {
        Self {
            code: LanguageCode::Part1(ISO639::En),
        }
    }
}

impl From<ISO639> for Language {
    fn from(language: ISO639) -> Self {
        Self {
            code: LanguageCode::Part1(language),
        }
    }
}

impl Language {
    pub fn code(&self) -> &str {
        match &self.code {
            LanguageCode::Part1(iso639) => iso639.code(),
            LanguageCode::Cmn => "cmn",
            LanguageCode::Yue => "yue",
        }
    }

    pub fn is_mandarin(&self) -> bool {
        matches!(self.code, LanguageCode::Cmn)
    }

    pub fn is_cantonese(&self) -> bool {
        matches!(self.code, LanguageCode::Yue)
    }

    pub fn is_chinese(&self) -> bool {
        matches!(
            self.code,
            LanguageCode::Cmn | LanguageCode::Yue | LanguageCode::Part1(ISO639::Zh)
        )
    }
}

#[cfg(feature = "whisper")]
impl TryInto<hypr_whisper::Language> for Language {
    type Error = Error;

    fn try_into(self) -> Result<hypr_whisper::Language, Self::Error> {
        use hypr_whisper::Language as WL;

        match self.code {
            LanguageCode::Cmn | LanguageCode::Yue => Ok(WL::Zh),
            LanguageCode::Part1(iso639) => match iso639 {
                ISO639::Af => Ok(WL::Af),
                ISO639::Am => Ok(WL::Am),
                ISO639::Ar => Ok(WL::Ar),
                ISO639::As => Ok(WL::As),
                ISO639::Az => Ok(WL::Az),
                ISO639::Ba => Ok(WL::Ba),
                ISO639::Be => Ok(WL::Be),
                ISO639::Bg => Ok(WL::Bg),
                ISO639::Bn => Ok(WL::Bn),
                ISO639::Bo => Ok(WL::Bo),
                ISO639::Br => Ok(WL::Br),
                ISO639::Bs => Ok(WL::Bs),
                ISO639::Ca => Ok(WL::Ca),
                ISO639::Cs => Ok(WL::Cs),
                ISO639::Cy => Ok(WL::Cy),
                ISO639::Da => Ok(WL::Da),
                ISO639::De => Ok(WL::De),
                ISO639::El => Ok(WL::El),
                ISO639::En => Ok(WL::En),
                ISO639::Es => Ok(WL::Es),
                ISO639::Et => Ok(WL::Et),
                ISO639::Eu => Ok(WL::Eu),
                ISO639::Fa => Ok(WL::Fa),
                ISO639::Fi => Ok(WL::Fi),
                ISO639::Fo => Ok(WL::Fo),
                ISO639::Fr => Ok(WL::Fr),
                ISO639::Gl => Ok(WL::Gl),
                ISO639::Gu => Ok(WL::Gu),
                ISO639::Ha => Ok(WL::Ha),
                ISO639::He => Ok(WL::He),
                ISO639::Hi => Ok(WL::Hi),
                ISO639::Hr => Ok(WL::Hr),
                ISO639::Ht => Ok(WL::Ht),
                ISO639::Hu => Ok(WL::Hu),
                ISO639::Hy => Ok(WL::Hy),
                ISO639::Id => Ok(WL::Id),
                ISO639::Is => Ok(WL::Is),
                ISO639::It => Ok(WL::It),
                ISO639::Ja => Ok(WL::Ja),
                ISO639::Jv => Ok(WL::Jw),
                ISO639::Ka => Ok(WL::Ka),
                ISO639::Kk => Ok(WL::Kk),
                ISO639::Km => Ok(WL::Km),
                ISO639::Kn => Ok(WL::Kn),
                ISO639::Ko => Ok(WL::Ko),
                ISO639::La => Ok(WL::La),
                ISO639::Lb => Ok(WL::Lb),
                ISO639::Lo => Ok(WL::Lo),
                ISO639::Lt => Ok(WL::Lt),
                ISO639::Lv => Ok(WL::Lv),
                ISO639::Mg => Ok(WL::Mg),
                ISO639::Mi => Ok(WL::Mi),
                ISO639::Mk => Ok(WL::Mk),
                ISO639::Ml => Ok(WL::Ml),
                ISO639::Mn => Ok(WL::Mn),
                ISO639::Mr => Ok(WL::Mr),
                ISO639::Ms => Ok(WL::Ms),
                ISO639::Mt => Ok(WL::Mt),
                ISO639::My => Ok(WL::My),
                ISO639::Ne => Ok(WL::Ne),
                ISO639::Nl => Ok(WL::Nl),
                ISO639::Nn => Ok(WL::Nn),
                ISO639::No => Ok(WL::No),
                ISO639::Oc => Ok(WL::Oc),
                ISO639::Pa => Ok(WL::Pa),
                ISO639::Pl => Ok(WL::Pl),
                ISO639::Ps => Ok(WL::Ps),
                ISO639::Pt => Ok(WL::Pt),
                ISO639::Ro => Ok(WL::Ro),
                ISO639::Ru => Ok(WL::Ru),
                ISO639::Sa => Ok(WL::Sa),
                ISO639::Sd => Ok(WL::Sd),
                ISO639::Si => Ok(WL::Si),
                ISO639::Sk => Ok(WL::Sk),
                ISO639::Sl => Ok(WL::Sl),
                ISO639::Sn => Ok(WL::Sn),
                ISO639::So => Ok(WL::So),
                ISO639::Sq => Ok(WL::Sq),
                ISO639::Sr => Ok(WL::Sr),
                ISO639::Su => Ok(WL::Su),
                ISO639::Sv => Ok(WL::Sv),
                ISO639::Sw => Ok(WL::Sw),
                ISO639::Ta => Ok(WL::Ta),
                ISO639::Te => Ok(WL::Te),
                ISO639::Tg => Ok(WL::Tg),
                ISO639::Th => Ok(WL::Th),
                ISO639::Tk => Ok(WL::Tk),
                ISO639::Tl => Ok(WL::Tl),
                ISO639::Tr => Ok(WL::Tr),
                ISO639::Tt => Ok(WL::Tt),
                ISO639::Uk => Ok(WL::Uk),
                ISO639::Ur => Ok(WL::Ur),
                ISO639::Uz => Ok(WL::Uz),
                ISO639::Vi => Ok(WL::Vi),
                ISO639::Yi => Ok(WL::Yi),
                ISO639::Yo => Ok(WL::Yo),
                ISO639::Zh => Ok(WL::Zh),
                _ => Err(Error::NotSupportedLanguage(self.code().to_string())),
            },
        }
    }
}

#[cfg(feature = "whisper")]
impl TryInto<Language> for hypr_whisper::Language {
    type Error = Error;

    fn try_into(self) -> Result<Language, Self::Error> {
        use hypr_whisper::Language as WL;

        let code = match self {
            WL::Af => LanguageCode::Part1(ISO639::Af),
            WL::Am => LanguageCode::Part1(ISO639::Am),
            WL::Ar => LanguageCode::Part1(ISO639::Ar),
            WL::As => LanguageCode::Part1(ISO639::As),
            WL::Az => LanguageCode::Part1(ISO639::Az),
            WL::Ba => LanguageCode::Part1(ISO639::Ba),
            WL::Be => LanguageCode::Part1(ISO639::Be),
            WL::Bg => LanguageCode::Part1(ISO639::Bg),
            WL::Bn => LanguageCode::Part1(ISO639::Bn),
            WL::Bo => LanguageCode::Part1(ISO639::Bo),
            WL::Br => LanguageCode::Part1(ISO639::Br),
            WL::Bs => LanguageCode::Part1(ISO639::Bs),
            WL::Ca => LanguageCode::Part1(ISO639::Ca),
            WL::Cs => LanguageCode::Part1(ISO639::Cs),
            WL::Cy => LanguageCode::Part1(ISO639::Cy),
            WL::Da => LanguageCode::Part1(ISO639::Da),
            WL::De => LanguageCode::Part1(ISO639::De),
            WL::El => LanguageCode::Part1(ISO639::El),
            WL::En => LanguageCode::Part1(ISO639::En),
            WL::Es => LanguageCode::Part1(ISO639::Es),
            WL::Et => LanguageCode::Part1(ISO639::Et),
            WL::Eu => LanguageCode::Part1(ISO639::Eu),
            WL::Fa => LanguageCode::Part1(ISO639::Fa),
            WL::Fi => LanguageCode::Part1(ISO639::Fi),
            WL::Fo => LanguageCode::Part1(ISO639::Fo),
            WL::Fr => LanguageCode::Part1(ISO639::Fr),
            WL::Gl => LanguageCode::Part1(ISO639::Gl),
            WL::Gu => LanguageCode::Part1(ISO639::Gu),
            WL::Ha => LanguageCode::Part1(ISO639::Ha),
            WL::He => LanguageCode::Part1(ISO639::He),
            WL::Hi => LanguageCode::Part1(ISO639::Hi),
            WL::Hr => LanguageCode::Part1(ISO639::Hr),
            WL::Ht => LanguageCode::Part1(ISO639::Ht),
            WL::Hu => LanguageCode::Part1(ISO639::Hu),
            WL::Hy => LanguageCode::Part1(ISO639::Hy),
            WL::Id => LanguageCode::Part1(ISO639::Id),
            WL::Is => LanguageCode::Part1(ISO639::Is),
            WL::It => LanguageCode::Part1(ISO639::It),
            WL::Ja => LanguageCode::Part1(ISO639::Ja),
            WL::Jw => LanguageCode::Part1(ISO639::Jv),
            WL::Ka => LanguageCode::Part1(ISO639::Ka),
            WL::Kk => LanguageCode::Part1(ISO639::Kk),
            WL::Km => LanguageCode::Part1(ISO639::Km),
            WL::Kn => LanguageCode::Part1(ISO639::Kn),
            WL::Ko => LanguageCode::Part1(ISO639::Ko),
            WL::La => LanguageCode::Part1(ISO639::La),
            WL::Lb => LanguageCode::Part1(ISO639::Lb),
            WL::Lo => LanguageCode::Part1(ISO639::Lo),
            WL::Lt => LanguageCode::Part1(ISO639::Lt),
            WL::Lv => LanguageCode::Part1(ISO639::Lv),
            WL::Mg => LanguageCode::Part1(ISO639::Mg),
            WL::Mi => LanguageCode::Part1(ISO639::Mi),
            WL::Mk => LanguageCode::Part1(ISO639::Mk),
            WL::Ml => LanguageCode::Part1(ISO639::Ml),
            WL::Mn => LanguageCode::Part1(ISO639::Mn),
            WL::Mr => LanguageCode::Part1(ISO639::Mr),
            WL::Ms => LanguageCode::Part1(ISO639::Ms),
            WL::Mt => LanguageCode::Part1(ISO639::Mt),
            WL::My => LanguageCode::Part1(ISO639::My),
            WL::Ne => LanguageCode::Part1(ISO639::Ne),
            WL::Nl => LanguageCode::Part1(ISO639::Nl),
            WL::Nn => LanguageCode::Part1(ISO639::Nn),
            WL::No => LanguageCode::Part1(ISO639::No),
            WL::Oc => LanguageCode::Part1(ISO639::Oc),
            WL::Pa => LanguageCode::Part1(ISO639::Pa),
            WL::Pl => LanguageCode::Part1(ISO639::Pl),
            WL::Ps => LanguageCode::Part1(ISO639::Ps),
            WL::Pt => LanguageCode::Part1(ISO639::Pt),
            WL::Ro => LanguageCode::Part1(ISO639::Ro),
            WL::Ru => LanguageCode::Part1(ISO639::Ru),
            WL::Sa => LanguageCode::Part1(ISO639::Sa),
            WL::Sd => LanguageCode::Part1(ISO639::Sd),
            WL::Si => LanguageCode::Part1(ISO639::Si),
            WL::Sk => LanguageCode::Part1(ISO639::Sk),
            WL::Sl => LanguageCode::Part1(ISO639::Sl),
            WL::Sn => LanguageCode::Part1(ISO639::Sn),
            WL::So => LanguageCode::Part1(ISO639::So),
            WL::Sq => LanguageCode::Part1(ISO639::Sq),
            WL::Sr => LanguageCode::Part1(ISO639::Sr),
            WL::Su => LanguageCode::Part1(ISO639::Su),
            WL::Sv => LanguageCode::Part1(ISO639::Sv),
            WL::Sw => LanguageCode::Part1(ISO639::Sw),
            WL::Ta => LanguageCode::Part1(ISO639::Ta),
            WL::Te => LanguageCode::Part1(ISO639::Te),
            WL::Tg => LanguageCode::Part1(ISO639::Tg),
            WL::Th => LanguageCode::Part1(ISO639::Th),
            WL::Tk => LanguageCode::Part1(ISO639::Tk),
            WL::Tl => LanguageCode::Part1(ISO639::Tl),
            WL::Tr => LanguageCode::Part1(ISO639::Tr),
            WL::Tt => LanguageCode::Part1(ISO639::Tt),
            WL::Uk => LanguageCode::Part1(ISO639::Uk),
            WL::Ur => LanguageCode::Part1(ISO639::Ur),
            WL::Uz => LanguageCode::Part1(ISO639::Uz),
            WL::Vi => LanguageCode::Part1(ISO639::Vi),
            WL::Yi => LanguageCode::Part1(ISO639::Yi),
            WL::Yo => LanguageCode::Part1(ISO639::Yo),
            WL::Zh => LanguageCode::Part1(ISO639::Zh),
            _ => return Err(Error::NotSupportedLanguage(self.to_string())),
        };

        Ok(Language { code })
    }
}

impl Language {
    #[cfg(feature = "deepgram")]
    pub fn for_deepgram(self) -> Result<deepgram::common::options::Language, Error> {
        use deepgram::common::options::Language as DG;

        match self.code {
            LanguageCode::Cmn | LanguageCode::Yue => Ok(DG::zh),
            LanguageCode::Part1(iso639) => match iso639 {
                ISO639::Bg => Ok(DG::bg),
                ISO639::Ca => Ok(DG::ca),
                ISO639::Cs => Ok(DG::cs),
                ISO639::Da => Ok(DG::da),
                ISO639::De => Ok(DG::de),
                ISO639::El => Ok(DG::el),
                ISO639::En => Ok(DG::en),
                ISO639::Es => Ok(DG::es),
                ISO639::Et => Ok(DG::et),
                ISO639::Fi => Ok(DG::fi),
                ISO639::Fr => Ok(DG::fr),
                ISO639::Hi => Ok(DG::hi),
                ISO639::Hu => Ok(DG::hu),
                ISO639::Id => Ok(DG::id),
                ISO639::It => Ok(DG::it),
                ISO639::Ja => Ok(DG::ja),
                ISO639::Ko => Ok(DG::ko),
                ISO639::Lt => Ok(DG::lt),
                ISO639::Lv => Ok(DG::lv),
                ISO639::Ms => Ok(DG::ms),
                ISO639::Nl => Ok(DG::nl),
                ISO639::No => Ok(DG::no),
                ISO639::Pl => Ok(DG::pl),
                ISO639::Pt => Ok(DG::pt),
                ISO639::Ro => Ok(DG::ro),
                ISO639::Ru => Ok(DG::ru),
                ISO639::Sk => Ok(DG::sk),
                ISO639::Sv => Ok(DG::sv),
                ISO639::Ta => Ok(DG::ta),
                ISO639::Th => Ok(DG::th),
                ISO639::Tr => Ok(DG::tr),
                ISO639::Uk => Ok(DG::uk),
                ISO639::Vi => Ok(DG::vi),
                ISO639::Zh => Ok(DG::zh),
                _ => Err(Error::NotSupportedLanguage(self.code().to_string())),
            },
        }
    }
}

impl serde::Serialize for Language {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(self.code())
    }
}

impl<'de> serde::Deserialize<'de> for Language {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let code_str = String::deserialize(deserializer)?;
        match code_str.as_str() {
            "cmn" => Ok(Language {
                code: LanguageCode::Cmn,
            }),
            "yue" => Ok(Language {
                code: LanguageCode::Yue,
            }),
            _ => {
                let iso639 = ISO639::from_str(&code_str).map_err(serde::de::Error::custom)?;
                Ok(iso639.into())
            }
        }
    }
}
