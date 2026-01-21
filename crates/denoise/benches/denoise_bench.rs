use std::hint::black_box;

use criterion::{Criterion, criterion_group, criterion_main};
use hound::WavReader;

use denoise::{Denoiser, HOP_SIZE, SAMPLE_RATE};

fn load_test_audio() -> Vec<f32> {
    let wav_path = hypr_data::english_1::AUDIO_PART6_48000HZ_PATH;
    let reader = WavReader::open(wav_path).expect("Failed to open WAV file");
    let spec = reader.spec();

    assert_eq!(
        spec.sample_rate as usize, SAMPLE_RATE,
        "Expected 48kHz audio"
    );

    let samples: Vec<f32> = reader
        .into_samples::<i16>()
        .map(|s| s.unwrap() as f32 / 32768.0)
        .collect();

    let num_frames = samples.len() / HOP_SIZE;
    samples[..num_frames * HOP_SIZE].to_vec()
}

fn bench_denoiser_initialization(c: &mut Criterion) {
    c.bench_function("denoiser_initialization", |b| {
        b.iter(|| black_box(Denoiser::new().unwrap()))
    });
}

fn bench_denoiser_process_frame(c: &mut Criterion) {
    let mut denoiser = Denoiser::new().unwrap();
    let audio = load_test_audio();
    let input = &audio[..HOP_SIZE];
    let mut output = vec![0.0f32; HOP_SIZE];

    c.bench_function("denoiser_process_frame", |b| {
        b.iter(|| {
            black_box(
                denoiser
                    .process_frame(black_box(input), black_box(&mut output))
                    .unwrap(),
            )
        })
    });
}

fn bench_denoiser_process(c: &mut Criterion) {
    let mut denoiser = Denoiser::new().unwrap();
    let audio = load_test_audio();

    let frame_counts = [10, 100];

    for &num_frames in &frame_counts {
        let samples = num_frames * HOP_SIZE;
        if samples <= audio.len() {
            let input = &audio[..samples];

            c.bench_function(&format!("denoiser_process_{}_frames", num_frames), |b| {
                b.iter(|| black_box(denoiser.process(black_box(input)).unwrap()))
            });
        }
    }
}

fn bench_denoiser_throughput(c: &mut Criterion) {
    let mut denoiser = Denoiser::new().unwrap();
    let audio = load_test_audio();

    let mut group = c.benchmark_group("denoiser_throughput");
    group.throughput(criterion::Throughput::Elements(audio.len() as u64));

    group.bench_function("samples_per_second", |b| {
        b.iter(|| black_box(denoiser.process(black_box(&audio)).unwrap()))
    });

    group.finish();
}

criterion_group!(
    benches,
    bench_denoiser_initialization,
    bench_denoiser_process_frame,
    bench_denoiser_process,
    bench_denoiser_throughput
);
criterion_main!(benches);
