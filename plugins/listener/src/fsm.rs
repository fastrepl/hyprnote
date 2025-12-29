#[derive(Debug, Clone, PartialEq, Eq)]
pub enum State {
    Active,
    Inactive,
    // Transitioning from Active to Inactive. For ex, waiting for `from_finalize=true` from upstream provider.
    Finalizing,
}

impl serde::Serialize for State {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        match self {
            State::Inactive => serializer.serialize_str("inactive"),
            State::Active => serializer.serialize_str("active"),
            State::Finalizing => serializer.serialize_str("finalizing"),
        }
    }
}

impl specta::Type for State {
    fn inline(
        _type_map: &mut specta::TypeCollection,
        _generics: specta::Generics,
    ) -> specta::DataType {
        specta::datatype::PrimitiveType::String.into()
    }
}
