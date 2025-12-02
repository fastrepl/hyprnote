use std::path::Path;

use owhisper_interface::ListenParams;

use super::ArgmaxAdapter;
use crate::adapter::{BatchFuture, BatchSttAdapter};

impl BatchSttAdapter for ArgmaxAdapter {
    fn transcribe_file<'a, P: AsRef<Path> + Send + 'a>(
        &'a self,
        client: &'a reqwest::Client,
        api_base: &'a str,
        api_key: &'a str,
        params: &'a ListenParams,
        file_path: P,
    ) -> BatchFuture<'a> {
        self.inner
            .transcribe_file(client, api_base, api_key, params, file_path)
    }
}
