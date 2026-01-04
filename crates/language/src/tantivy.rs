use crate::{ISO639, Language};

impl Language {
    pub fn for_tantivy_stemmer(&self) -> Option<tantivy::tokenizer::Language> {
        use tantivy::tokenizer::Language as TL;

        match self.iso639 {
            ISO639::Ar => Some(TL::Arabic),
            ISO639::Da => Some(TL::Danish),
            ISO639::Nl => Some(TL::Dutch),
            ISO639::En => Some(TL::English),
            ISO639::Fi => Some(TL::Finnish),
            ISO639::Fr => Some(TL::French),
            ISO639::De => Some(TL::German),
            ISO639::El => Some(TL::Greek),
            ISO639::Hu => Some(TL::Hungarian),
            ISO639::It => Some(TL::Italian),
            ISO639::No => Some(TL::Norwegian),
            ISO639::Pt => Some(TL::Portuguese),
            ISO639::Ro => Some(TL::Romanian),
            ISO639::Ru => Some(TL::Russian),
            ISO639::Es => Some(TL::Spanish),
            ISO639::Sv => Some(TL::Swedish),
            ISO639::Ta => Some(TL::Tamil),
            ISO639::Tr => Some(TL::Turkish),
            _ => None,
        }
    }
}
