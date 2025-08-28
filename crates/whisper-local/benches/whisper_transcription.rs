use std::hint::black_box;
use std::time::Duration;

use criterion::{criterion_group, criterion_main, Criterion};
use hypr_whisper::Language;
use whisper_local::Whisper;

fn benchmark_whisper_transcription(c: &mut Criterion) {
    let audio: Vec<f32> = hypr_data::english_1::AUDIO
        .chunks_exact(2)
        .map(|chunk| i16::from_le_bytes([chunk[0], chunk[1]]) as f32 / 32768.0)
        .collect();

    let model_path = concat!(env!("CARGO_MANIFEST_DIR"), "/model.bin");

    let mut whisper_without_vocab = Whisper::builder()
        .model_path(model_path)
        .languages(vec![Language::En])
        .build()
        .unwrap();

    let mut whisper_with_vocab = Whisper::builder()
        .model_path(model_path)
        .languages(vec![Language::En])
        .vocabulary(
            vec![
                "profound",
                "acquire",
                "complementary",
                "deeply",
                "repositories",
                "brilliant",
                "pockets",
                "thread",
                "stumbling",
                "stumble",
                "communities",
                "invested",
                "undergrad",
                "Googleable",
                "exploring",
                "neuroscientist",
                "psychology",
                "engineering",
                "researcher",
                "thinker",
                "skill",
                "invest",
                "solved",
                "entire",
                "especially",
                "actually",
                "often",
                "already",
                "important",
                "definitely",
                "much",
            ]
            .into_iter()
            .map(|s| s.into())
            .collect(),
        )
        .build()
        .unwrap();

    let mut group = c.benchmark_group("whisper_comparison");
    group.measurement_time(Duration::from_secs(100));
    group.sample_size(10);

    group.bench_function("without_vocab", |b| {
        b.iter(|| {
            let segments = whisper_without_vocab.transcribe(black_box(&audio)).unwrap();
            black_box(segments)
        })
    });

    group.bench_function("with_vocab", |b| {
        b.iter(|| {
            let segments = whisper_with_vocab.transcribe(black_box(&audio)).unwrap();
            black_box(segments)
        })
    });

    group.finish();
}

criterion_group!(benches, benchmark_whisper_transcription);
criterion_main!(benches);
