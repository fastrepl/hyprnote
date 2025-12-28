use std::collections::HashMap;
use std::ops::{Deref, DerefMut};

use axum::{
    extract::FromRequestParts,
    http::{StatusCode, request::Parts},
    response::{IntoResponse, Response},
};

#[derive(Debug, Clone)]
pub enum QueryValue {
    Single(String),
    Multi(Vec<String>),
}

impl QueryValue {
    pub fn first(&self) -> Option<&str> {
        match self {
            QueryValue::Single(s) => Some(s),
            QueryValue::Multi(v) => v.first().map(|s| s.as_str()),
        }
    }

    pub fn iter(&self) -> impl Iterator<Item = &str> {
        match self {
            QueryValue::Single(s) => QueryValueIter::Single(Some(s.as_str())),
            QueryValue::Multi(v) => QueryValueIter::Multi(v.iter().map(|s| s.as_str())),
        }
    }
}

enum QueryValueIter<'a, I: Iterator<Item = &'a str>> {
    Single(Option<&'a str>),
    Multi(I),
}

impl<'a, I: Iterator<Item = &'a str>> Iterator for QueryValueIter<'a, I> {
    type Item = &'a str;

    fn next(&mut self) -> Option<Self::Item> {
        match self {
            QueryValueIter::Single(opt) => opt.take(),
            QueryValueIter::Multi(iter) => iter.next(),
        }
    }
}

#[derive(Debug, Clone, Default)]
pub struct QueryParams(HashMap<String, QueryValue>);

impl QueryParams {
    pub fn get_first(&self, key: &str) -> Option<&str> {
        self.0.get(key).and_then(|v| v.first())
    }

    pub fn remove(&mut self, key: &str) -> Option<QueryValue> {
        self.0.remove(key)
    }

    pub fn remove_first(&mut self, key: &str) -> Option<String> {
        self.0.remove(key).map(|v| match v {
            QueryValue::Single(s) => s,
            QueryValue::Multi(mut v) => v.remove(0),
        })
    }
}

impl Deref for QueryParams {
    type Target = HashMap<String, QueryValue>;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl DerefMut for QueryParams {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.0
    }
}

impl<S> FromRequestParts<S> for QueryParams
where
    S: Send + Sync,
{
    type Rejection = Response;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let query = parts.uri.query().unwrap_or_default();

        let raw: HashMap<String, Vec<String>> = serde_html_form::from_str(query).map_err(|e| {
            (
                StatusCode::BAD_REQUEST,
                format!("failed_to_parse_query_string: {}", e),
            )
                .into_response()
        })?;

        let params = raw
            .into_iter()
            .filter_map(|(k, v)| {
                let value = match v.len() {
                    0 => return None,
                    1 => QueryValue::Single(v.into_iter().next().unwrap()),
                    _ => QueryValue::Multi(v),
                };
                Some((k, value))
            })
            .collect();

        Ok(QueryParams(params))
    }
}
