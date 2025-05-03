mod error;
pub use error::*;

pub use codes_iso_639::part_1::LanguageCode as ISO639;

#[derive(Debug, Clone, PartialEq, serde::Serialize, serde::Deserialize)]
pub struct Language {
    iso639: ISO639,
}

impl Default for Language {
    fn default() -> Self {
        Self { iso639: ISO639::En }
    }
}

impl From<ISO639> for Language {
    fn from(language: ISO639) -> Self {
        Self { iso639: language }
    }
}

impl std::ops::Deref for Language {
    type Target = ISO639;

    fn deref(&self) -> &Self::Target {
        &self.iso639
    }
}

impl Language {
    pub fn iso639(&self) -> ISO639 {
        self.iso639
    }

    #[cfg(feature = "whisper")]
    pub fn for_whisper(self) -> Result<hypr_whisper::Language, Error> {
        use hypr_whisper::Language as WL;

        match self.iso639 {
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
            _ => Err(Error::NotSupportedLanguage(self.iso639)),
        }
    }

    #[cfg(feature = "deepgram")]
    pub fn for_deepgram(self) -> Result<deepgram::common::options::Language, Error> {
        use deepgram::common::options::Language as DG;

        match self.iso639 {
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
            _ => Err(Error::NotSupportedLanguage(self.iso639)),
        }
    }

    pub fn text_transcript(&self) -> Result<String, Error> {
        match self.iso639 {
            ISO639::Bg => Ok(String::from("транскрипт")),
            ISO639::Ca => Ok(String::from("transcripció")),
            ISO639::Cs => Ok(String::from("přepis")),
            ISO639::Da => Ok(String::from("transskription")),
            ISO639::De => Ok(String::from("Transkript")),
            ISO639::El => Ok(String::from("απομαγνητοφώνηση")),
            ISO639::En => Ok(String::from("transcript")),
            ISO639::Es => Ok(String::from("transcripción")),
            ISO639::Et => Ok(String::from("transkriptsioon")),
            ISO639::Fi => Ok(String::from("transkriptio")),
            ISO639::Fr => Ok(String::from("transcription")),
            ISO639::Hi => Ok(String::from("प्रतिलेख")),
            ISO639::Hu => Ok(String::from("átirat")),
            ISO639::Id => Ok(String::from("transkrip")),
            ISO639::It => Ok(String::from("trascrizione")),
            ISO639::Ja => Ok(String::from("文字起こし")),
            ISO639::Ko => Ok(String::from("대화록")),
            ISO639::Lt => Ok(String::from("transkripcija")),
            ISO639::Lv => Ok(String::from("transkripcija")),
            ISO639::Ms => Ok(String::from("transkrip")),
            ISO639::Nl => Ok(String::from("transcript")),
            ISO639::No => Ok(String::from("transkripsjon")),
            ISO639::Pl => Ok(String::from("transkrypcja")),
            ISO639::Pt => Ok(String::from("transcrição")),
            ISO639::Ro => Ok(String::from("transcriere")),
            ISO639::Ru => Ok(String::from("стенограмма")),
            ISO639::Sk => Ok(String::from("prepis")),
            ISO639::Sv => Ok(String::from("transkription")),
            ISO639::Ta => Ok(String::from("குறிப்பெடுப்பு")),
            ISO639::Th => Ok(String::from("บันทึกการสนทนา")),
            ISO639::Tr => Ok(String::from("deşifre")),
            ISO639::Uk => Ok(String::from("стенограма")),
            ISO639::Vi => Ok(String::from("bản ghi")),
            ISO639::Zh => Ok(String::from("文字记录")),
            _ => Err(Error::NotSupportedLanguage(self.iso639)),
        }
    }
}
