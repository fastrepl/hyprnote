use std::collections::HashMap;

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
        let mut content = String::from("---\n");
        content.push_str(&format!("name: {}\n", self.name));

        if let Some(desc) = &self.description {
            content.push_str(&format!("description: {}\n", desc));
        }

        if !self.args.is_empty() {
            content.push_str("args:\n");
            for arg in &self.args {
                content.push_str(&format!("  - name: {}\n", arg.name));
                content.push_str(&format!("    type: {}\n", arg.type_name));
                if let Some(desc) = &arg.description {
                    content.push_str(&format!("    description: {}\n", desc));
                }
            }
        }

        content.push_str("---\n");
        content
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
}

#[derive(Debug, Clone)]
struct TypeDoc {
    description: Option<String>,
    args: Vec<ArgField>,
}

pub fn parse_hooks(source_code: &str) -> Result<Vec<HookInfo>, String> {
    let (module, fm) = parse_module(source_code)?;
    let jsdoc = JsDocExtractor::new(source_code, &fm);
    let type_docs = collect_type_docs(&module, &jsdoc);
    Ok(extract_hooks(&module, &type_docs))
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
    let mut docs = HashMap::new();

    for item in &module.body {
        if let ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(export)) = item {
            if let Decl::TsTypeAlias(type_alias) = &export.decl {
                let type_name = type_alias.id.sym.to_string();
                let description = jsdoc.for_span(&export.span);
                let args = extract_fields(type_alias.type_ann.as_ref(), jsdoc);

                docs.insert(type_name, TypeDoc { description, args });
            }
        }
    }

    docs
}

fn extract_hooks(module: &Module, type_docs: &HashMap<String, TypeDoc>) -> Vec<HookInfo> {
    command_methods(module)
        .into_iter()
        .filter_map(|method| hook_from_method(method, type_docs))
        .collect()
}

fn command_methods<'a>(module: &'a Module) -> Vec<&'a MethodProp> {
    let mut methods = Vec::new();

    for item in &module.body {
        if let ModuleItem::ModuleDecl(ModuleDecl::ExportDecl(export)) = item {
            if let Decl::Var(var_decl) = &export.decl {
                for decl in &var_decl.decls {
                    if let (Pat::Ident(ident), Some(init)) = (&decl.name, &decl.init) {
                        if ident.id.sym == "commands" {
                            if let Expr::Object(obj) = &**init {
                                for prop in &obj.props {
                                    if let PropOrSpread::Prop(prop) = prop {
                                        if let Prop::Method(method) = &**prop {
                                            methods.push(method);
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    methods
}

fn hook_from_method(method: &MethodProp, type_docs: &HashMap<String, TypeDoc>) -> Option<HookInfo> {
    let hook_name = if let PropName::Ident(method_name) = &method.key {
        method_name.sym.to_string()
    } else {
        return None;
    };

    let (description, args) = method_arg_type_name(method)
        .and_then(|type_name| type_docs.get(&type_name))
        .map(|doc| (doc.description.clone(), doc.args.clone()))
        .unwrap_or((None, Vec::new()));

    Some(HookInfo {
        name: hook_name,
        description,
        args,
    })
}

fn method_arg_type_name(method: &MethodProp) -> Option<String> {
    method
        .function
        .params
        .first()
        .and_then(|param| match &param.pat {
            Pat::Ident(ident) => ident
                .type_ann
                .as_ref()
                .and_then(|type_ann| extract_type_name(&type_ann.type_ann)),
            _ => None,
        })
}

fn extract_type_name(type_ann: &TsType) -> Option<String> {
    if let TsType::TsTypeRef(type_ref) = type_ann {
        if let TsEntityName::Ident(ident) = &type_ref.type_name {
            return Some(ident.sym.to_string());
        }
    }
    None
}

fn extract_fields(type_ann: &TsType, jsdoc: &JsDocExtractor<'_>) -> Vec<ArgField> {
    let mut fields = Vec::new();

    if let TsType::TsTypeLit(type_lit) = type_ann {
        for member in &type_lit.members {
            if let TsTypeElement::TsPropertySignature(prop) = member {
                if let Expr::Ident(ident) = &*prop.key {
                    let field_name = ident.sym.to_string();
                    let description = jsdoc.for_span(&prop.span);
                    let type_name = prop
                        .type_ann
                        .as_ref()
                        .map(|ta| format_type(&ta.type_ann))
                        .unwrap_or_else(|| "unknown".to_string());

                    fields.push(ArgField {
                        name: field_name,
                        description,
                        type_name,
                    });
                }
            }
        }
    }

    fields
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

fn format_type(type_ann: &TsType) -> String {
    match type_ann {
        TsType::TsKeywordType(kw) => match kw.kind {
            TsKeywordTypeKind::TsStringKeyword => "string".to_string(),
            TsKeywordTypeKind::TsNumberKeyword => "number".to_string(),
            TsKeywordTypeKind::TsBooleanKeyword => "boolean".to_string(),
            _ => format!("{:?}", kw.kind).to_lowercase(),
        },
        TsType::TsTypeRef(type_ref) => {
            if let TsEntityName::Ident(ident) = &type_ref.type_name {
                ident.sym.to_string()
            } else {
                "unknown".to_string()
            }
        }
        _ => "unknown".to_string(),
    }
}
