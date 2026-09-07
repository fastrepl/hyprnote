//! `@pierre/diffs` `MultiFileDiff` (`diffStyle: "unified"`) as data: the rows
//! of a unified diff with three lines of context, word-level emphasis for
//! paired changed lines, and the `pierre-light` / `pierre-dark` markdown
//! token colours the highlighter would apply.

use std::ops::Range;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum LineKind {
    Context,
    Delete,
    Insert,
}

/// One rendered row of the diff.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum DiffRow {
    /// `data-separator='line-info'`: skipped context before a hunk.
    Separator(String),
    Line {
        kind: LineKind,
        /// The old number for context and deletions, the new one for insertions.
        number: usize,
        text: String,
        /// `data-diff-span`: the changed words of a paired deletion / insertion.
        emphasis: Vec<Range<usize>>,
    },
    /// `data-no-newline`: "No newline at end of file" under the line.
    NoNewline(LineKind),
}

/// The emphasised byte ranges of a deleted and an inserted line.
type EmphasisPair = (Vec<Range<usize>>, Vec<Range<usize>>);

/// `additions` / `deletions` of the file header.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct Stats {
    pub additions: usize,
    pub deletions: usize,
}

pub struct Diff {
    pub rows: Vec<DiffRow>,
    pub stats: Stats,
    /// Digits of the widest line number, for the gutter width.
    pub number_digits: usize,
}

pub fn diff(old: &str, new: &str) -> Diff {
    let text_diff = similar::TextDiff::from_lines(old, new);
    let mut rows = Vec::new();
    let mut stats = Stats::default();
    let mut max_number = 1;
    let mut unified = text_diff.unified_diff();
    let unified = unified.context_radius(3);
    let old_lines = old.lines().count();
    // 0-based old line the next hunk may start at without skipping context.
    let mut next_old = 0;
    for hunk in unified.iter_hunks() {
        let ops = hunk.ops();
        let (Some(first), Some(last)) = (ops.first(), ops.last()) else {
            continue;
        };
        if first.old_range().start > next_old {
            rows.push(DiffRow::Separator(hunk.header().to_string()));
        }
        next_old = last.old_range().end;
        let changes: Vec<similar::Change<&str>> = hunk.iter_changes().collect();
        let mut index = 0;
        while index < changes.len() {
            let change = &changes[index];
            match change.tag() {
                similar::ChangeTag::Equal => {
                    let number = change.old_index().map_or(0, |i| i + 1);
                    max_number = max_number.max(number);
                    push_line(&mut rows, LineKind::Context, number, change, Vec::new());
                    index += 1;
                }
                similar::ChangeTag::Delete => {
                    // A run of deletions followed by a run of insertions: the
                    // lines pair up by position for the word emphasis.
                    let delete_end = changes[index..]
                        .iter()
                        .position(|c| c.tag() != similar::ChangeTag::Delete)
                        .map_or(changes.len(), |offset| index + offset);
                    let insert_end = changes[delete_end..]
                        .iter()
                        .position(|c| c.tag() != similar::ChangeTag::Insert)
                        .map_or(changes.len(), |offset| delete_end + offset);
                    let deletes = &changes[index..delete_end];
                    let inserts = &changes[delete_end..insert_end];
                    let mut emphasis: Vec<EmphasisPair> = deletes
                        .iter()
                        .zip(inserts.iter())
                        .map(|(d, i)| word_emphasis(line_text(d), line_text(i)))
                        .collect();
                    emphasis.resize(deletes.len().max(inserts.len()), (Vec::new(), Vec::new()));
                    for (offset, change) in deletes.iter().enumerate() {
                        let number = change.old_index().map_or(0, |i| i + 1);
                        max_number = max_number.max(number);
                        stats.deletions += 1;
                        let ranges = std::mem::take(&mut emphasis[offset].0);
                        push_line(&mut rows, LineKind::Delete, number, change, ranges);
                    }
                    for (offset, change) in inserts.iter().enumerate() {
                        let number = change.new_index().map_or(0, |i| i + 1);
                        max_number = max_number.max(number);
                        stats.additions += 1;
                        let ranges = std::mem::take(&mut emphasis[offset].1);
                        push_line(&mut rows, LineKind::Insert, number, change, ranges);
                    }
                    index = insert_end;
                }
                similar::ChangeTag::Insert => {
                    let number = change.new_index().map_or(0, |i| i + 1);
                    max_number = max_number.max(number);
                    stats.additions += 1;
                    push_line(&mut rows, LineKind::Insert, number, change, Vec::new());
                    index += 1;
                }
            }
        }
    }
    if next_old < old_lines && !rows.is_empty() {
        rows.push(DiffRow::Separator(String::new()));
    }
    Diff {
        rows,
        stats,
        number_digits: max_number.to_string().len(),
    }
}

fn line_text<'a>(change: &similar::Change<&'a str>) -> &'a str {
    change.value().strip_suffix('\n').unwrap_or(change.value())
}

fn push_line(
    rows: &mut Vec<DiffRow>,
    kind: LineKind,
    number: usize,
    change: &similar::Change<&str>,
    emphasis: Vec<Range<usize>>,
) {
    rows.push(DiffRow::Line {
        kind,
        number,
        text: line_text(change).to_string(),
        emphasis,
    });
    if change.missing_newline() {
        rows.push(DiffRow::NoNewline(kind));
    }
}

/// The changed words of `old` and `new` (byte ranges in each), adjacent
/// changes merged.
pub fn word_emphasis(old: &str, new: &str) -> EmphasisPair {
    let diff = similar::TextDiff::from_words(old, new);
    let (mut old_at, mut new_at) = (0usize, 0usize);
    let (mut deleted, mut inserted): (Vec<Range<usize>>, Vec<Range<usize>>) =
        (Vec::new(), Vec::new());
    for change in diff.iter_all_changes() {
        let len = change.value().len();
        match change.tag() {
            similar::ChangeTag::Equal => {
                old_at += len;
                new_at += len;
            }
            similar::ChangeTag::Delete => {
                extend(&mut deleted, old_at..old_at + len, old);
                old_at += len;
            }
            similar::ChangeTag::Insert => {
                extend(&mut inserted, new_at..new_at + len, new);
                new_at += len;
            }
        }
    }
    (deleted, inserted)
}

/// Appends `range`, merging it into the previous range when only whitespace
/// separates them (so "Old item" is one span, not two words).
fn extend(ranges: &mut Vec<Range<usize>>, range: Range<usize>, text: &str) {
    if let Some(last) = ranges.last_mut()
        && text[last.end..range.start].trim().is_empty()
    {
        last.end = range.end;
        return;
    }
    ranges.push(range);
}

/// A markdown token colour over a byte range.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Token {
    pub range: Range<usize>,
    pub color: u32,
    pub italic: bool,
}

/// The theme's markdown scopes that matter for memos and summaries.
#[derive(Debug, Clone, Copy)]
pub struct Palette {
    pub fg: u32,
    pub bg: u32,
    pub heading: u32,
    pub list_marker: u32,
    pub bold: u32,
    pub italic: u32,
    pub code: u32,
    pub link_title: u32,
    pub link_url: u32,
    pub quote: u32,
}

/// `pierre-light`
pub const LIGHT: Palette = Palette {
    fg: 0x070707,
    bg: 0xffffff,
    heading: 0xd52c36,
    list_marker: 0xd52c36,
    bold: 0xd5a910,
    italic: 0xfc2b73,
    code: 0x199f43,
    link_title: 0x7b43f8,
    link_url: 0xfc2b73,
    quote: 0x84848a,
};

/// `pierre-dark`
pub const DARK: Palette = Palette {
    fg: 0xfbfbfb,
    bg: 0x070707,
    heading: 0xff6762,
    list_marker: 0xff6762,
    bold: 0xffd452,
    italic: 0xff678d,
    code: 0x5ecc71,
    link_title: 0x9d6afb,
    link_url: 0xff678d,
    quote: 0x84848a,
};

/// The highlighter's tokens for one markdown line: headings and quotes as a
/// whole, list markers, and the inline bold / italic / code / link spans.
pub fn markdown_tokens(line: &str, palette: &Palette) -> Vec<Token> {
    let plain = |range: Range<usize>, color: u32| Token {
        range,
        color,
        italic: false,
    };
    let trimmed = line.trim_start();
    let indent = line.len() - trimmed.len();
    if indent < 4 {
        let hashes = trimmed.bytes().take_while(|b| *b == b'#').count();
        if (1..=6).contains(&hashes)
            && trimmed[hashes..]
                .chars()
                .next()
                .is_none_or(char::is_whitespace)
        {
            return vec![plain(0..line.len(), palette.heading)];
        }
        if trimmed.starts_with('>') {
            return vec![plain(0..line.len(), palette.quote)];
        }
    }
    let mut tokens = Vec::new();
    let mut body_start = 0;
    if let Some(marker_len) = list_marker_len(trimmed) {
        if indent > 0 {
            tokens.push(plain(0..indent, palette.fg));
        }
        tokens.push(plain(indent..indent + marker_len, palette.list_marker));
        body_start = indent + marker_len;
    }
    inline_tokens(line, body_start, palette, &mut tokens);
    tokens
}

/// `- `, `* `, `+ `, `1. `, `1) ` (marker only, without the trailing space).
fn list_marker_len(text: &str) -> Option<usize> {
    let bytes = text.as_bytes();
    let first = *bytes.first()?;
    if matches!(first, b'-' | b'*' | b'+') {
        return matches!(bytes.get(1), Some(b' ' | b'\t')).then_some(1);
    }
    let digits = bytes.iter().take_while(|b| b.is_ascii_digit()).count();
    if digits > 0
        && matches!(bytes.get(digits), Some(b'.' | b')'))
        && matches!(bytes.get(digits + 1), Some(b' ' | b'\t'))
    {
        return Some(digits + 1);
    }
    None
}

fn inline_tokens(line: &str, start: usize, palette: &Palette, tokens: &mut Vec<Token>) {
    let bytes = line.as_bytes();
    let mut plain_start = start;
    let mut at = start;
    let flush = |tokens: &mut Vec<Token>, plain_start: usize, at: usize| {
        if at > plain_start {
            tokens.push(Token {
                range: plain_start..at,
                color: palette.fg,
                italic: false,
            });
        }
    };
    while at < bytes.len() {
        let rest = &line[at..];
        let styled: Option<(usize, u32, bool)> = if let Some(code) = rest.strip_prefix('`') {
            code.find('`').map(|end| (end + 2, palette.code, false))
        } else if let Some(delim) = ["**", "__"].iter().find(|d| rest.starts_with(**d)) {
            rest[2..]
                .find(delim)
                .filter(|end| *end > 0)
                .map(|end| (end + 4, palette.bold, false))
        } else if rest.starts_with('*') || rest.starts_with('_') {
            let delim = &rest[..1];
            rest[1..]
                .find(delim)
                .filter(|end| *end > 0)
                .map(|end| (end + 2, palette.italic, true))
        } else if rest.starts_with('[') {
            link_len(rest).map(|len| (len, 0, false))
        } else {
            None
        };
        match styled {
            Some((len, 0, _)) => {
                flush(tokens, plain_start, at);
                link_tokens(line, at, at + len, palette, tokens);
                at += len;
                plain_start = at;
            }
            Some((len, color, italic)) => {
                flush(tokens, plain_start, at);
                tokens.push(Token {
                    range: at..at + len,
                    color,
                    italic,
                });
                at += len;
                plain_start = at;
            }
            None => {
                at += rest.chars().next().map_or(1, char::len_utf8);
            }
        }
    }
    flush(tokens, plain_start, at);
}

/// `[title](url)` at the start of `text`.
fn link_len(text: &str) -> Option<usize> {
    let close = text.find("](")?;
    let url_end = text[close + 2..].find(')')?;
    Some(close + 2 + url_end + 1)
}

/// `[` `]` `(` `)` in the theme's punctuation colour, the title and url in
/// theirs.
fn link_tokens(line: &str, start: usize, end: usize, palette: &Palette, tokens: &mut Vec<Token>) {
    let text = &line[start..end];
    let close = text.find("](").unwrap_or(0);
    let punct = |range: Range<usize>| Token {
        range,
        color: palette.heading,
        italic: false,
    };
    tokens.push(punct(start..start + 1));
    tokens.push(Token {
        range: start + 1..start + close,
        color: palette.link_title,
        italic: false,
    });
    tokens.push(punct(start + close..start + close + 2));
    tokens.push(Token {
        range: start + close + 2..end - 1,
        color: palette.link_url,
        italic: false,
    });
    tokens.push(punct(end - 1..end));
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rows_pair_deletions_with_insertions_for_emphasis() {
        let out = diff("# Agenda\n\n- Old item\n\n- Keep me", "# Agenda\n\n- Item");
        assert_eq!(
            out.stats,
            Stats {
                additions: 1,
                deletions: 3
            }
        );
        assert_eq!(out.number_digits, 1);
        assert_eq!(
            out.rows,
            vec![
                DiffRow::Line {
                    kind: LineKind::Context,
                    number: 1,
                    text: "# Agenda".into(),
                    emphasis: vec![]
                },
                DiffRow::Line {
                    kind: LineKind::Context,
                    number: 2,
                    text: String::new(),
                    emphasis: vec![]
                },
                DiffRow::Line {
                    kind: LineKind::Delete,
                    number: 3,
                    text: "- Old item".into(),
                    emphasis: vec![Range { start: 2, end: 10 }]
                },
                DiffRow::Line {
                    kind: LineKind::Delete,
                    number: 4,
                    text: String::new(),
                    emphasis: vec![]
                },
                DiffRow::Line {
                    kind: LineKind::Delete,
                    number: 5,
                    text: "- Keep me".into(),
                    emphasis: vec![]
                },
                DiffRow::NoNewline(LineKind::Delete),
                DiffRow::Line {
                    kind: LineKind::Insert,
                    number: 3,
                    text: "- Item".into(),
                    emphasis: vec![Range { start: 2, end: 6 }]
                },
                DiffRow::NoNewline(LineKind::Insert),
            ]
        );
    }

    #[test]
    fn separators_mark_skipped_context() {
        let old: String = (1..=20).map(|n| format!("line {n}\n")).collect();
        let new = old.replace("line 10\n", "line ten\n");
        let out = diff(&old, &new);
        assert!(
            matches!(&out.rows[0], DiffRow::Separator(header) if header.starts_with("@@ -7,7 +7,7 @@"))
        );
        assert!(matches!(out.rows.last(), Some(DiffRow::Separator(header)) if header.is_empty()));
        assert_eq!(out.number_digits, 2);
        assert!(diff("same\n", "same\n").rows.is_empty());
    }

    #[test]
    fn word_emphasis_merges_adjacent_words() {
        assert_eq!(
            word_emphasis("- Old item", "- Item"),
            (
                vec![Range { start: 2, end: 10 }],
                vec![Range { start: 2, end: 6 }]
            )
        );
        assert_eq!(
            word_emphasis("a b c", "a x c"),
            (
                vec![Range { start: 2, end: 3 }],
                vec![Range { start: 2, end: 3 }]
            )
        );
    }

    #[test]
    fn markdown_tokens_follow_the_theme_scopes() {
        let p = &LIGHT;
        assert_eq!(
            markdown_tokens("# Agenda", p),
            vec![Token {
                range: 0..8,
                color: p.heading,
                italic: false
            }]
        );
        assert_eq!(
            markdown_tokens("- Old **bold** and `code`", p),
            vec![
                Token {
                    range: 0..1,
                    color: p.list_marker,
                    italic: false
                },
                Token {
                    range: 1..6,
                    color: p.fg,
                    italic: false
                },
                Token {
                    range: 6..14,
                    color: p.bold,
                    italic: false
                },
                Token {
                    range: 14..19,
                    color: p.fg,
                    italic: false
                },
                Token {
                    range: 19..25,
                    color: p.code,
                    italic: false
                },
            ]
        );
        assert_eq!(
            markdown_tokens("1. *it*", p),
            vec![
                Token {
                    range: 0..2,
                    color: p.list_marker,
                    italic: false
                },
                Token {
                    range: 2..3,
                    color: p.fg,
                    italic: false
                },
                Token {
                    range: 3..7,
                    color: p.italic,
                    italic: true
                },
            ]
        );
        assert_eq!(
            markdown_tokens("> quote", p),
            vec![Token {
                range: 0..7,
                color: p.quote,
                italic: false
            }]
        );
        assert_eq!(
            markdown_tokens("see [docs](https://x.y)", p),
            vec![
                Token {
                    range: 0..4,
                    color: p.fg,
                    italic: false
                },
                Token {
                    range: 4..5,
                    color: p.heading,
                    italic: false
                },
                Token {
                    range: 5..9,
                    color: p.link_title,
                    italic: false
                },
                Token {
                    range: 9..11,
                    color: p.heading,
                    italic: false
                },
                Token {
                    range: 11..22,
                    color: p.link_url,
                    italic: false
                },
                Token {
                    range: 22..23,
                    color: p.heading,
                    italic: false
                },
            ]
        );
        assert!(markdown_tokens("", p).is_empty());
    }
}
