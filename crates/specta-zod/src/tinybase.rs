use std::{borrow::Cow, fmt::Write, path::Path};

use specta::{
    TypeCollection,
    datatype::{DataType, NamedDataType, PrimitiveType, StructFields},
};

use crate::Error;

pub struct TinyBase {
    pub header: Cow<'static, str>,
}

impl Default for TinyBase {
    fn default() -> Self {
        Self {
            header: r#"import type { TablesSchema, ValuesSchema } from "tinybase/with-schemas";

import type { InferTinyBaseSchema } from "./shared";

"#
            .into(),
        }
    }
}

impl TinyBase {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn header(mut self, header: impl Into<Cow<'static, str>>) -> Self {
        self.header = header.into();
        self
    }

    pub fn export(&self, types: &TypeCollection) -> Result<String, Error> {
        let mut output = self.header.to_string();

        for (_, ndt) in types {
            export_named_datatype(&mut output, ndt)?;
            output.push('\n');
        }

        Ok(output)
    }

    pub fn export_to(&self, path: impl AsRef<Path>, types: &TypeCollection) -> Result<(), Error> {
        let content = self.export(types)?;
        std::fs::write(path, content)?;
        Ok(())
    }
}

fn export_named_datatype(s: &mut String, ndt: &NamedDataType) -> Result<(), Error> {
    let name = ndt.name();

    match &ndt.inner {
        DataType::Struct(st) => {
            if let StructFields::Named(named) = st.fields() {
                let fields: Vec<_> = named
                    .fields()
                    .iter()
                    .filter(|(_, f)| f.ty().is_some())
                    .collect();

                write!(
                    s,
                    "export const {}TinybaseSchema = {{\n",
                    to_snake_case(name)
                )?;

                for (i, (field_name, field)) in fields.iter().enumerate() {
                    let ty = field.ty().unwrap();
                    let tinybase_type = datatype_to_tinybase_type(ty);

                    if i > 0 {
                        s.push_str(",\n");
                    }
                    write!(s, "  {}: {{ type: \"{}\" }}", field_name, tinybase_type)?;
                }

                if !fields.is_empty() {
                    s.push(',');
                }
                s.push_str("\n};\n");
            }
        }
        _ => {}
    }

    Ok(())
}

fn datatype_to_tinybase_type(dt: &DataType) -> &'static str {
    match dt {
        DataType::Primitive(p) => primitive_to_tinybase_type(p),
        DataType::Nullable(inner) => datatype_to_tinybase_type(inner),
        DataType::List(_) => "string",
        DataType::Map(_) => "string",
        DataType::Struct(_) => "string",
        DataType::Enum(_) => "string",
        DataType::Tuple(_) => "string",
        DataType::Reference(_) => "string",
        _ => "string",
    }
}

fn primitive_to_tinybase_type(p: &PrimitiveType) -> &'static str {
    use PrimitiveType::*;

    match p {
        i8 | i16 | i32 | u8 | u16 | u32 | f32 | f64 | usize | isize | i64 | u64 | i128 | u128 => {
            "number"
        }
        bool => "boolean",
        String | char => "string",
    }
}

fn to_snake_case(name: &str) -> String {
    let mut result = String::new();

    for (i, c) in name.chars().enumerate() {
        if c.is_uppercase() {
            if i > 0 {
                result.push('_');
            }
            result.push(c.to_ascii_lowercase());
        } else {
            result.push(c);
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde::{Deserialize, Serialize};
    use specta::Type;

    #[derive(Type, Serialize, Deserialize)]
    struct SimpleStruct {
        name: String,
        age: i32,
        active: bool,
    }

    #[derive(Type, Serialize, Deserialize)]
    struct WithOptional {
        required: String,
        optional: Option<String>,
        optional_num: Option<i32>,
    }

    #[derive(Type, Serialize, Deserialize)]
    struct WithArray {
        tags: Vec<String>,
        scores: Vec<i32>,
    }

    #[test]
    fn test_simple_struct() {
        let mut types = TypeCollection::default();
        types.register::<SimpleStruct>();
        let output = TinyBase::new().header("").export(&types).unwrap();
        insta::assert_snapshot!(output);
    }

    #[test]
    fn test_with_optional() {
        let mut types = TypeCollection::default();
        types.register::<WithOptional>();
        let output = TinyBase::new().header("").export(&types).unwrap();
        insta::assert_snapshot!(output);
    }

    #[test]
    fn test_with_array() {
        let mut types = TypeCollection::default();
        types.register::<WithArray>();
        let output = TinyBase::new().header("").export(&types).unwrap();
        insta::assert_snapshot!(output);
    }

    #[test]
    fn test_snake_case_conversion() {
        assert_eq!(to_snake_case("SimpleStruct"), "simple_struct");
        assert_eq!(to_snake_case("MyStruct"), "my_struct");
        assert_eq!(to_snake_case("ABC"), "a_b_c");
        assert_eq!(to_snake_case("already_snake"), "already_snake");
    }
}
