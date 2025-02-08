pub use slack_morphism::axum_support;
use slack_morphism::prelude::*;

pub struct Client {
    client: SlackClient<SlackClientHyperHttpsConnector>,
    api_token: SlackApiToken,
}

pub struct SessionMessage {
    session: hypr_db::user::Session,
}

impl SlackMessageTemplate for SessionMessage {
    fn render_template(&self) -> SlackMessageContent {
        // https://slack-rust.abdolence.dev/block-kit-support.html
        SlackMessageContent::new()
            .with_text(format!("Session ID: {}", self.session.id))
            .with_blocks(slack_blocks![
                some_into(SlackSectionBlock::new().with_text(md!("Hey {}", "123"))),
                some_into(SlackDividerBlock::new()),
                some_into(SlackImageBlock::new(
                    "https://www.gstatic.com/webp/gallery3/2_webp_ll.png"
                        .parse::<url::Url>()
                        .unwrap()
                        .into(),
                    "Test Image".into()
                )),
                some_into(SlackHeaderBlock::new(pt!("Simple header"))),
                some_into(SlackActionsBlock::new(slack_blocks![some_into(
                    SlackBlockButtonElement::new(
                        "simple-message-button".into(),
                        pt!("Simple button text")
                    )
                )]))
            ])
    }
}

impl Client {
    pub fn new(token: String) -> Self {
        let client = SlackClient::new(SlackClientHyperConnector::new().unwrap());
        let token_value: SlackApiTokenValue = token.into();
        let token: SlackApiToken = SlackApiToken::new(token_value);

        Self {
            client,
            api_token: token,
        }
    }

    // https://github.com/abdolence/slack-morphism-rust/blob/master/examples/client.rs
    pub async fn send_session(
        &self,
        channel: impl Into<SlackChannelId>,
        hypr_session: hypr_db::user::Session,
    ) -> anyhow::Result<SlackApiChatPostMessageResponse> {
        let slack_session = self.client.open_session(&self.api_token);
        let session_message = SessionMessage {
            session: hypr_session,
        };

        let req =
            SlackApiChatPostMessageRequest::new(channel.into(), session_message.render_template());

        let res = slack_session.chat_post_message(&req).await?;
        Ok(res)
    }
}
