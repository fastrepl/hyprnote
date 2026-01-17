use reqwest::Response;

use crate::error::Error;

pub async fn ensure_success(response: Response) -> Result<Response, Error> {
    let status = response.status();
    if status.is_success() {
        Ok(response)
    } else {
        let body = response.text().await.unwrap_or_default();
        Err(Error::UnexpectedStatus { status, body })
    }
}
