mod types;
pub use types::*;

#[cfg(test)]
mod tests {
    use super::*;
    use specta::TypeCollection;
    use specta_zod::{TinyBase, Zod};

    #[test]
    fn test_generate_zod_schemas() {
        let mut types = TypeCollection::default();
        types.register::<Human>();
        types.register::<Event>();
        types.register::<Calendar>();
        types.register::<Organization>();
        types.register::<Session>();
        types.register::<Transcript>();
        types.register::<MappingSessionParticipant>();
        types.register::<Tag>();
        types.register::<MappingTagSession>();
        types.register::<Template>();
        types.register::<TemplateSection>();
        types.register::<ChatGroup>();
        types.register::<ChatMessage>();
        types.register::<ChatShortcut>();
        types.register::<EnhancedNote>();
        types.register::<Prompt>();
        types.register::<Word>();
        types.register::<SpeakerHint>();
        types.register::<General>();

        let output = Zod::new().export(&types).unwrap();
        println!("{}", output);
        assert!(output.contains("humanSchema"));
        assert!(output.contains("sessionSchema"));
    }

    #[test]
    fn test_generate_tinybase_schemas() {
        let mut types = TypeCollection::default();
        types.register::<Human>();
        types.register::<Session>();
        types.register::<Transcript>();

        let output = TinyBase::new().export(&types).unwrap();
        println!("{}", output);
        assert!(output.contains("humanTinybaseSchema"));
        assert!(output.contains("sessionTinybaseSchema"));
    }
}
