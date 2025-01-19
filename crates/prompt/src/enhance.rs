pub type Input = hypr_bridge::EnhanceRequest;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_format() {
        let input = Input {
            user: hypr_db::user::ConfigDataProfile::default(),
            editor: "<p>Hello, world!</p>".to_string(),
            template: hypr_db::user::Template {
                id: "1".to_string(),
                title: "Enhance".to_string(),
                description: "Enhance the editor content".to_string(),
                sections: vec![],
            },
        };

        let ctx = crate::tera::Context::from_serialize(&input).unwrap();
        let output = crate::render(crate::Template::Enhance, &ctx).unwrap();
        assert!(!output.is_empty());
    }

    #[ignore]
    #[test]
    fn test_run() {}
}
