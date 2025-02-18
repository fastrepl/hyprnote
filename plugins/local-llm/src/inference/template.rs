use super::SupportedModel;
use async_openai::types::CreateChatCompletionRequest;
use minijinja::Environment;

pub struct Engine {
    env: Environment<'static>,
}

#[derive(strum::EnumString, strum::AsRefStr, strum::Display)]
pub enum Template {
    #[strum(serialize = "llama32_3b")]
    Llama32_3b,
}

impl From<SupportedModel> for Template {
    fn from(value: SupportedModel) -> Self {
        match value {
            SupportedModel::Llama32_3b => Template::Llama32_3b,
        }
    }
}

impl Engine {
    pub fn new() -> Self {
        let mut env = Environment::new();

        // https://huggingface.co/NousResearch/Hermes-3-Llama-3.2-3B#prompt-format
        let llama32_3b_template = r#"{% if response_format and response_format.type == "json_schema" %}{% set has_system = false %}{% for message in messages %}{% if message.role == "system" %}{% set has_system = true %}<|im_start|>system
{{ message.content }}
Here's the json schema you must adhere to:
<schema>
{{ response_format.json_schema.schema }}
</schema><|im_end|>
{% endif %}{% endfor %}{% if not has_system %}<|im_start|>system
You are a helpful assistant that answers in JSON. Here's the json schema you must adhere to:
<schema>
{{ response_format.json_schema.schema }}
</schema><|im_end|>
{% endif %}{% endif %}{% for message in messages %}{% if message.role == "user" %}<|im_start|>user
{{ message.content }}<|im_end|>
{% elif message.role == "assistant" %}<|im_start|>assistant
{{ message.content }}<|im_end|>
{% endif %}{% endfor %}<|im_start|>assistant
"#;

        env.add_template(Template::Llama32_3b.as_ref(), llama32_3b_template)
            .unwrap();

        Self { env }
    }

    pub fn render(&self, template: Template, request: &CreateChatCompletionRequest) -> String {
        let template = self.env.get_template(template.as_ref()).unwrap();
        template.render(request).unwrap()
    }
}
