use std::collections::HashMap;

use crate::naming::cli_flag;
use serde::{Deserialize, Serialize};

use swc_common::{sync::Lrc, FileName, SourceMap, Span};
use swc_ecma_ast::*;
use swc_ecma_parser::{lexer::Lexer, Parser, StringInput, Syntax, TsSyntax};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HookInfo {
    pub name: String,
    pub description: Option<String>,
    pub args: Vec<ArgField>,
}

impl HookInfo {
    pub fn doc_render(&self) -> String {
        let yaml = serde_yaml::to_string(self).unwrap_or_default();
        format!("---\n{}---\n", yaml)
    }

    pub fn doc_path(&self) -> String {
        format!("{}.mdx", self.name)
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ArgField {
    pub name: String,
    pub description: Option<String>,
    pub type_name: String,
    #[serde(skip_serializing_if = "is_false")]
    pub optional: bool,
}

#[derive(Debug, Clone)]
struct TypeDoc {
    description: Option<String>,
    args: Vec<ArgField>,
}

#[derive(Debug, Clone)]
struct TypeInfo {
    type_name: String,
    optional: bool,
}

impl TypeInfo {
    fn unknown() -> Self {
        Self {
            type_name: "unknown".to_string(),
            optional: false,
        }
    }
}

pub fn parse_hooks(source_code: &str) -> Result<Vec<HookInfo>, String> {
    let (module, fm) = parse_module(source_code)?;
    let jsdoc = JsDocExtractor::new(source_code, &fm);
    let type_docs = collect_type_docs(&module, &jsdoc);
    Ok(extract_hook_events(&module, &type_docs))
}

fn parse_module(source_code: &str) -> Result<(Module, Lrc<swc_common::SourceFile>), String> {
    let cm: Lrc<SourceMap> = Default::default();
    let fm = cm.new_source_file(
        FileName::Custom("bindings.gen.ts".into()).into(),
        source_code.to_string(),
    );

    let lexer = Lexer::new(
        Syntax::Typescript(TsSyntax {
            tsx: false,
            decorators: false,
            dts: false,
            no_early_errors: true,
            disallow_ambiguous_jsx_like: true,
        }),
        Default::default(),
        StringInput::from(&*fm),
        None,
    );

    let mut parser = Parser::new_from(lexer);
    let module = parser
        .parse_module()
        .map_err(|e| format!("Parse error: {:?}", e))?;

    Ok((module, fm))
}

fn collect_type_docs(module: &Module, jsdoc: &JsDocExtractor<'_>) -> HashMap<String, TypeDoc> {
    exported_type_aliases(module)
        .map(|(alias, span)| {
            let type_name = alias.id.sym.to_string();
            let description = jsdoc.for_span(&span);
            let args = extract_fields(alias.type_ann.as_ref(), jsdoc);
            (type_name, TypeDoc { description, args })
        })
        .collect()
}

fn extract_hook_events(module: &Module, type_docs: &HashMap<String, TypeDoc>) -> Vec<HookInfo> {
    hook_union(module)
        .map(|ty| hook_variants(ty, type_docs))
        .unwrap_or_default()
}

fn hook_variants(type_ann: &TsType, type_docs: &HashMap<String, TypeDoc>) -> Vec<HookInfo> {
    if let TsType::TsUnionOrIntersectionType(TsUnionOrIntersectionType::TsUnionType(union)) =
        type_ann
    {
        union
            .types
            .iter()
            .filter_map(|variant| hook_from_variant(variant.as_ref(), type_docs))
            .collect()
    } else {
        Vec::new()
    }
}

fn hook_from_variant(type_ann: &TsType, type_docs: &HashMap<String, TypeDoc>) -> Option<HookInfo> {
    let type_lit = type_lit_from(type_ann)?;
    let prop = first_property(type_lit)?;
    let hook_name = prop_name(prop)?;
    let args_type = prop
        .type_ann
        .as_ref()
        .and_then(|ty| args_type_name(&ty.type_ann))?;

    let (description, args) = type_docs
        .get(&args_type)
        .map(|doc| (doc.description.clone(), doc.args.clone()))
        .unwrap_or((None, Vec::new()));

    Some(HookInfo {
        name: hook_name,
        description,
        args,
    })
}

fn extract_fields(type_ann: &TsType, jsdoc: &JsDocExtractor<'_>) -> Vec<ArgField> {
    let type_lit = match type_lit_from(type_ann) {
        Some(lit) => lit,
        None => return Vec::new(),
    };

    type_lit
        .members
        .iter()
        .filter_map(|member| {
            if let TsTypeElement::TsPropertySignature(prop) = member {
                let field_name = prop_name(prop)?;
                let doc_name = cli_flag(&field_name);
                let description = jsdoc.for_span(&prop.span);
                let type_info = prop
                    .type_ann
                    .as_ref()
                    .map(|ta| format_type(&ta.type_ann))
                    .unwrap_or_else(TypeInfo::unknown);

                Some(ArgField {
                    name: doc_name,
                    description,
                    type_name: type_info.type_name,
                    optional: prop.optional || type_info.optional,
                })
            } else {
                None
            }
        })
        .collect()
}

fn exported_type_aliases(module: &Module) -> impl Iterator<Item = (&TsTypeAliasDecl, Span)> + '_ {
    module.body.iter().filter_map(|item| {
        if let ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(export)) = item {
            if let Decl::TsTypeAlias(type_alias) = &export.decl {
                return Some((type_alias.as_ref(), export.span));
            }
        }
        None
    })
}

fn hook_union(module: &Module) -> Option<&TsType> {
    exported_type_aliases(module)
        .find(|(alias, _)| alias.id.sym.as_ref() == "HookEvent")
        .map(|(alias, _)| alias.type_ann.as_ref())
}

fn args_type_name(type_ann: &TsType) -> Option<String> {
    let type_lit = type_lit_from(type_ann)?;
    let prop = property_by_name(&type_lit.members, "args")?;
    prop.type_ann
        .as_ref()
        .and_then(|ta| type_name_from(&ta.type_ann))
}

fn property_by_name<'a>(
    members: &'a [TsTypeElement],
    name: &str,
) -> Option<&'a TsPropertySignature> {
    members.iter().find_map(|member| match member {
        TsTypeElement::TsPropertySignature(prop) => match &*prop.key {
            Expr::Ident(ident) if ident.sym.as_ref() == name => Some(prop),
            _ => None,
        },
        _ => None,
    })
}

fn first_property(type_lit: &TsTypeLit) -> Option<&TsPropertySignature> {
    type_lit.members.iter().find_map(|member| match member {
        TsTypeElement::TsPropertySignature(prop) => Some(prop),
        _ => None,
    })
}

fn prop_name(prop: &TsPropertySignature) -> Option<String> {
    if let Expr::Ident(ident) = &*prop.key {
        Some(ident.sym.to_string())
    } else {
        None
    }
}

fn type_lit_from(type_ann: &TsType) -> Option<&TsTypeLit> {
    match type_ann {
        TsType::TsTypeLit(type_lit) => Some(type_lit),
        TsType::TsParenthesizedType(paren) => type_lit_from(&paren.type_ann),
        _ => None,
    }
}

fn type_name_from(type_ann: &TsType) -> Option<String> {
    if let TsType::TsTypeRef(type_ref) = type_ann {
        if let TsEntityName::Ident(ident) = &type_ref.type_name {
            return Some(ident.sym.to_string());
        }
    }
    None
}

struct JsDocExtractor<'a> {
    source: &'a str,
    fm: Lrc<swc_common::SourceFile>,
}

impl<'a> JsDocExtractor<'a> {
    fn new(source: &'a str, fm: &Lrc<swc_common::SourceFile>) -> Self {
        Self {
            source,
            fm: fm.clone(),
        }
    }

    fn for_span(&self, span: &Span) -> Option<String> {
        let start_pos = self.fm.start_pos.0 as usize;
        let lo = span.lo.0 as usize;

        if lo <= start_pos {
            return None;
        }

        let relative_pos = lo - start_pos;
        let before = &self.source[..relative_pos];
        let end = before.rfind("*/")?;
        let start = before[..=end].rfind("/**")?;

        if start + 3 > end {
            return None;
        }

        if !before[end + 2..].trim().is_empty() {
            return None;
        }

        format_jsdoc_content(&before[start + 3..end])
    }
}

fn format_jsdoc_content(block: &str) -> Option<String> {
    let mut lines = Vec::new();

    for line in block.lines() {
        let trimmed = line.trim();

        let content = trimmed
            .strip_prefix('*')
            .map(|rest| rest.trim())
            .unwrap_or(trimmed)
            .trim();

        if !content.is_empty() {
            lines.push(content.to_string());
        }
    }

    if lines.is_empty() {
        None
    } else {
        Some(lines.join(" "))
    }
}

fn format_type(type_ann: &TsType) -> TypeInfo {
    match type_ann {
        TsType::TsKeywordType(kw) => format_keyword_type(&kw.kind),
        TsType::TsTypeRef(type_ref) => {
            if let TsEntityName::Ident(ident) = &type_ref.type_name {
                TypeInfo {
                    type_name: ident.sym.to_string(),
                    optional: false,
                }
            } else {
                TypeInfo::unknown()
            }
        }
        TsType::TsUnionOrIntersectionType(TsUnionOrIntersectionType::TsUnionType(union)) => {
            let mut parts = Vec::new();
            let mut optional = false;

            for ty in &union.types {
                let ty_name = format_type(ty);

                if matches!(ty_name.type_name.as_str(), "null" | "undefined" | "void") {
                    optional = true;
                    continue;
                }

                if ty_name.type_name == "unknown" {
                    continue;
                }

                if ty_name.optional {
                    optional = true;
                }

                if !parts.contains(&ty_name.type_name) {
                    parts.push(ty_name.type_name);
                }
            }

            if parts.is_empty() {
                TypeInfo {
                    type_name: "unknown".to_string(),
                    optional,
                }
            } else {
                TypeInfo {
                    type_name: parts.join(" | "),
                    optional,
                }
            }
        }
        TsType::TsParenthesizedType(paren) => format_type(&paren.type_ann),
        _ => TypeInfo::unknown(),
    }
}

fn format_keyword_type(kind: &TsKeywordTypeKind) -> TypeInfo {
    let name = format!("{:?}", kind)
        .trim_start_matches("Ts")
        .trim_end_matches("Keyword")
        .to_lowercase();

    let optional = matches!(
        kind,
        TsKeywordTypeKind::TsNullKeyword
            | TsKeywordTypeKind::TsUndefinedKeyword
            | TsKeywordTypeKind::TsVoidKeyword
    );

    TypeInfo {
        type_name: name,
        optional,
    }
}

fn is_false(value: &bool) -> bool {
    !*value
}
