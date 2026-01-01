use crate::PdfInput;

use super::markdown::markdown_to_typst;

fn build_preamble() -> String {
    r##"
#set page(
  paper: "a4",
  margin: (top: 2.5cm, bottom: 2.5cm, left: 2.5cm, right: 2.5cm),
)

#set text(
  font: "New Computer Modern",
  size: 11pt,
  lang: "en",
)

#set par(
  justify: true,
  leading: 0.65em,
)

#show heading.where(level: 1): it => block(
  above: 1.5em,
  below: 1em,
  text(size: 18pt, weight: "bold", it.body)
)

#show heading.where(level: 2): it => block(
  above: 1.3em,
  below: 0.8em,
  text(size: 14pt, weight: "bold", it.body)
)

#show heading.where(level: 3): it => block(
  above: 1.2em,
  below: 0.6em,
  text(size: 12pt, weight: "bold", it.body)
)

#show link: it => text(fill: rgb("#2563eb"), it)

#show quote: it => block(
  inset: (left: 1em, right: 1em, top: 0.5em, bottom: 0.5em),
  stroke: (left: 2pt + rgb("#d1d5db")),
  fill: rgb("#f9fafb"),
  it.body
)

"##
    .to_string()
}

pub fn build_typst_content(input: &PdfInput) -> String {
    let mut content = build_preamble();

    let typst_content = markdown_to_typst(&input.enhanced_md);
    content.push_str(&typst_content);

    if let Some(transcript) = &input.transcript
        && !transcript.items.is_empty()
    {
        content.push_str("\n#pagebreak()\n\n");
        content.push_str("= Transcript\n\n");

        for item in &transcript.items {
            let speaker = item.speaker.as_deref().unwrap_or("Unknown");
            let text = &item.text;
            content.push_str(&format!(
                "#block(spacing: 0.8em)[#text(weight: \"semibold\")[{}:] {}]\n",
                speaker, text
            ));
        }
    }

    content
}
