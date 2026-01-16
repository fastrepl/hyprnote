use axum::http::StatusCode;

use super::state::ErrorType;

pub fn classify_http_status(status: StatusCode) -> ErrorType {
    match status.as_u16() {
        400 => ErrorType::BadRequest,
        401 | 403 => ErrorType::Unauthorized,
        402 => ErrorType::PaymentRequired,
        404 => ErrorType::NotFound,
        429 => ErrorType::RateLimited,
        500..=599 => ErrorType::ServerError,
        _ => ErrorType::Other,
    }
}

pub fn classify_status_code(code: u16) -> ErrorType {
    match code {
        400 => ErrorType::BadRequest,
        401 | 403 => ErrorType::Unauthorized,
        402 => ErrorType::PaymentRequired,
        404 => ErrorType::NotFound,
        429 => ErrorType::RateLimited,
        500..=599 => ErrorType::ServerError,
        _ => ErrorType::Other,
    }
}

pub fn classify_request_error(error: &reqwest::Error) -> ErrorType {
    if error.is_timeout() || error.is_connect() {
        ErrorType::ConnectionError
    } else if let Some(status) = error.status() {
        classify_http_status(status)
    } else {
        ErrorType::Other
    }
}
