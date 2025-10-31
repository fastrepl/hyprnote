#[derive(Debug, Clone)]
pub enum State {
    RunningActive,
    Finalizing,
    Inactive,
}

impl serde::Serialize for State {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        match self {
            State::Inactive => serializer.serialize_str("inactive"),
            State::RunningActive => serializer.serialize_str("running_active"),
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
