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
}
