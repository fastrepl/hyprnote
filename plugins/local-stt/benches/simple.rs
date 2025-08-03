#[derive(Debug)]
struct CustomBenchmark {
    name: &'static str,
    benchmark_fn: fn() -> CustomBenchmarkResult,
}

#[derive(Debug)]
struct CustomBenchmarkResult {
    latency: f64,
    accuracy: f64,
}

impl CustomBenchmark {
    fn run(&self) -> serde_json::Value {
        let result = (self.benchmark_fn)();
        let measures = serde_json::json!({
            "latency": result.latency,
            "accuracy": result.accuracy,
        });
        let mut benchmark_map = serde_json::Map::new();
        benchmark_map.insert(self.name.to_string(), measures);
        benchmark_map.into()
    }
}

fn bench_english_1() -> CustomBenchmarkResult {
    use futures_util::StreamExt;
    let rt = tokio::runtime::Runtime::new().unwrap();

    rt.block_on(async {
        let server_state = tauri_plugin_local_stt::ServerStateBuilder::default()
            .model_cache_dir(dirs::data_dir().unwrap().join("com.hyprnote.dev/stt"))
            .model_type(hypr_whisper_local_model::WhisperModel::QuantizedTinyEn)
            .build();

        let server = tauri_plugin_local_stt::run_server(server_state)
            .await
            .unwrap();

        let api_base = format!("http://{}", &server.addr);

        let client = owhisper_client::ListenClient::builder()
            .api_base(api_base)
            .api_key("")
            .params(owhisper_interface::ListenParams::default())
            .build_single();

        let audio_stream = rodio::Decoder::new(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap();

        let stream = client.from_realtime_audio(audio_stream).await.unwrap();
        futures_util::pin_mut!(stream);

        let actual = stream
            .map(|result| {
                result
                    .words
                    .into_iter()
                    .map(|word| word.text)
                    .collect::<Vec<_>>()
            })
            .collect::<Vec<Vec<String>>>()
            .await
            .into_iter()
            .flatten()
            .map(|w| w.trim().to_lowercase())
            .collect::<Vec<_>>()
            .join(" ");

        let expected: String = serde_json::from_str::<Vec<owhisper_interface::Word>>(
            hypr_data::english_1::TRANSCRIPTION_JSON,
        )
        .unwrap()
        .into_iter()
        .map(|w| w.text.trim().to_lowercase())
        .collect::<Vec<_>>()
        .join(" ");

        println!("expected: {}\n\nactual: {}", expected, actual);

        let output = std::process::Command::new("poetry")
            .arg("run")
            .arg("python")
            .arg("../../scripts/eval_stt.py")
            .arg("--reference")
            .arg(&expected)
            .arg("--hypothesis")
            .arg(&actual)
            .output()
            .expect("Failed to execute Python script");

        println!("\nMetrics:");
        if !output.stdout.is_empty() {
            println!("{}", String::from_utf8_lossy(&output.stdout));
        }
        if !output.stderr.is_empty() {
            println!("Error: {}", String::from_utf8_lossy(&output.stderr));
        }
        if !output.status.success() {
            println!("Python script exited with code: {:?}", output.status.code());
        }

        server.shutdown.send(()).unwrap();

        CustomBenchmarkResult {
            latency: 0.0,
            accuracy: 0.0,
        }
    })
}

inventory::collect!(CustomBenchmark);

inventory::submit!(CustomBenchmark {
    name: "bench_english_1",
    benchmark_fn: bench_english_1
});

fn main() {
    let mut bmf = serde_json::Map::new();

    for benchmark in inventory::iter::<CustomBenchmark> {
        let mut results = benchmark.run();
        bmf.append(results.as_object_mut().unwrap());
    }

    let bmf_str = serde_json::to_string_pretty(&bmf).unwrap();
    println!("{bmf_str}");
}
