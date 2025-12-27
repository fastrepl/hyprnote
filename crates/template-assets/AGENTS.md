# General

- `crates/template-assets/minijinja` should be considered legacy.
- `crates/template-assets/askama` is our primary place for storing prompts.
- `.md.jinja` files should be written in structured-markdown format.
- Any instructions should be written as very concise, minimal descriptions. No weird prompting tricks or ALL CAPITALS. Human-readability is important.

# Syntax

- Read [docs](https://askama.readthedocs.io/en/stable/template_syntax.html) for template syntax.
- Our custom filters are defined in `crates/template2/src/filters.rs`.
