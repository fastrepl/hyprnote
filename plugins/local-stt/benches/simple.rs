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
    CustomBenchmarkResult {
        latency: 0.0,
        accuracy: 0.0,
    }
}

fn bench_english_2() -> CustomBenchmarkResult {
    let rt = tokio::runtime::Runtime::new().unwrap();

    rt.block_on(async {
        let server_state = tauri_plugin_local_stt::ServerStateBuilder::default()
            .model_cache_dir(dirs::data_dir().unwrap().join("com.hyprnote.dev/stt"))
            .model_type(tauri_plugin_local_stt::SupportedModel::QuantizedTinyEn)
            .build();

        let _handle = tauri_plugin_local_stt::run_server(server_state)
            .await
            .unwrap();

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
inventory::submit!(CustomBenchmark {
    name: "bench_english_2",
    benchmark_fn: bench_english_2
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
