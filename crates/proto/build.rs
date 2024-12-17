use protobuf::descriptor::field_descriptor_proto::Type;
use protobuf::reflect::FieldDescriptor;
use protobuf_codegen::{Codegen, Customize, CustomizeCallback};

struct BytesConverter;

impl CustomizeCallback for BytesConverter {
    fn field(&self, field: &FieldDescriptor) -> Customize {
        if field.proto().type_() == Type::TYPE_BYTES {
            Customize::default().tokio_bytes(true)
        } else {
            Customize::default()
        }
    }
}

fn main() {
    Codegen::new()
        .out_dir("src/generated")
        .include("../../packages/proto")
        .input("../../packages/proto/v0.proto")
        .customize_callback(BytesConverter)
        .run()
        .unwrap();
}
