use std::sync::OnceLock;

use chrono::{Datelike, Timelike};
use typst::diag::{FileError, FileResult};
use typst::foundations::{Bytes, Datetime};
use typst::syntax::{FileId, Source};
use typst::text::{Font, FontBook};
use typst::utils::LazyHash;
use typst::{Library, LibraryExt, World};

use crate::PdfInput;

static LIBRARY: OnceLock<LazyHash<Library>> = OnceLock::new();

fn library() -> &'static LazyHash<Library> {
    LIBRARY.get_or_init(|| LazyHash::new(Library::default()))
}

pub struct TypstWorld {
    source: Source,
    fonts: Vec<Font>,
    font_book: LazyHash<FontBook>,
}

impl TypstWorld {
    pub fn new(content: String) -> Self {
        let source = Source::detached(content);

        let fonts: Vec<Font> = Vec::new();
        let font_book = FontBook::from_fonts(fonts.iter());

        Self {
            source,
            fonts,
            font_book: LazyHash::new(font_book),
        }
    }
}

impl World for TypstWorld {
    fn library(&self) -> &LazyHash<Library> {
        library()
    }

    fn book(&self) -> &LazyHash<FontBook> {
        &self.font_book
    }

    fn main(&self) -> FileId {
        self.source.id()
    }

    fn source(&self, id: FileId) -> FileResult<Source> {
        if id == self.source.id() {
            Ok(self.source.clone())
        } else {
            Err(FileError::NotFound(id.vpath().as_rootless_path().into()))
        }
    }

    fn file(&self, id: FileId) -> FileResult<Bytes> {
        Err(FileError::NotFound(id.vpath().as_rootless_path().into()))
    }

    fn font(&self, index: usize) -> Option<Font> {
        self.fonts.get(index).cloned()
    }

    fn today(&self, _offset: Option<i64>) -> Option<Datetime> {
        let now = chrono::Local::now();
        Datetime::from_ymd_hms(
            now.year(),
            now.month().try_into().ok()?,
            now.day().try_into().ok()?,
            now.hour().try_into().ok()?,
            now.minute().try_into().ok()?,
            now.second().try_into().ok()?,
        )
    }
}

pub fn build_typst_content(input: &PdfInput) -> String {
    let mut content = String::new();

    content.push_str("#set page(paper: \"a4\", margin: 2cm)\n");
    content.push_str("#set text(size: 11pt)\n\n");

    content.push_str(&input.enhanced_md);
    content.push('\n');

    if let Some(transcript) = &input.transcript {
        if !transcript.items.is_empty() {
            content.push_str("\n#pagebreak()\n\n");
            content.push_str("= Transcript\n\n");

            for item in &transcript.items {
                let speaker = item.speaker.as_deref().unwrap_or("Unknown");
                let text = &item.text;
                content.push_str(&format!("*{}*: {}\n\n", speaker, text));
            }
        }
    }

    content
}

pub fn compile_to_pdf(content: &str) -> Result<Vec<u8>, crate::Error> {
    let world = TypstWorld::new(content.to_string());

    let document = typst::compile(&world)
        .output
        .map_err(|errors| crate::Error::TypstCompile(format!("{:?}", errors)))?;

    let options = typst_pdf::PdfOptions::default();
    let pdf = typst_pdf::pdf(&document, &options)
        .map_err(|errors| crate::Error::TypstPdf(format!("{:?}", errors)))?;

    Ok(pdf)
}
