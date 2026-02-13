#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AccountInfo {
    pub user_id: String,
    pub email: Option<String>,
    pub full_name: Option<String>,
    pub avatar_url: Option<String>,
    pub stripe_customer_id: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceInfo {
    pub platform: String,
    pub arch: String,
    pub os_version: String,
    pub app_version: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub build_hash: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub locale: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct AccountContext {
    pub email: Option<String>,
    pub full_name: Option<String>,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize, specta::Type, utoipa::ToSchema)]
#[serde(rename_all = "camelCase")]
pub struct DeviceContext {
    pub platform: String,
    pub arch: String,
    pub os_version: String,
    pub app_version: String,
    pub locale: Option<String>,
}

#[derive(askama::Template)]
#[template(path = "bug_report.md.jinja")]
struct BugReportBody<'a> {
    description: &'a str,
    platform: &'a str,
    arch: &'a str,
    os_version: &'a str,
    app_version: &'a str,
    source: &'a str,
}

#[derive(askama::Template)]
#[template(path = "feature_request.md.jinja")]
struct FeatureRequestBody<'a> {
    description: &'a str,
    platform: &'a str,
    arch: &'a str,
    os_version: &'a str,
    app_version: &'a str,
    source: &'a str,
}

#[derive(askama::Template)]
#[template(path = "log_analysis.md.jinja")]
struct LogAnalysisComment<'a> {
    summary_section: &'a str,
    tail: &'a str,
}

#[derive(askama::Template, Default)]
#[template(path = "support_chat.md.jinja")]
struct SupportChatPrompt;

pub struct SupportIssueTemplateInput<'a> {
    pub description: &'a str,
    pub platform: &'a str,
    pub arch: &'a str,
    pub os_version: &'a str,
    pub app_version: &'a str,
    pub source: &'a str,
}

pub fn render_bug_report(input: SupportIssueTemplateInput<'_>) -> Result<String, askama::Error> {
    askama::Template::render(&BugReportBody {
        description: input.description,
        platform: input.platform,
        arch: input.arch,
        os_version: input.os_version,
        app_version: input.app_version,
        source: input.source,
    })
}

pub fn render_feature_request(
    input: SupportIssueTemplateInput<'_>,
) -> Result<String, askama::Error> {
    askama::Template::render(&FeatureRequestBody {
        description: input.description,
        platform: input.platform,
        arch: input.arch,
        os_version: input.os_version,
        app_version: input.app_version,
        source: input.source,
    })
}

pub fn render_log_analysis(summary_section: &str, tail: &str) -> Result<String, askama::Error> {
    askama::Template::render(&LogAnalysisComment {
        summary_section,
        tail,
    })
}

pub fn render_support_chat() -> Result<String, askama::Error> {
    askama::Template::render(&SupportChatPrompt)
}
