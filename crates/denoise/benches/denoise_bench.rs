use std::hint::black_box;

use criterion::{Criterion, criterion_group, criterion_main};

use denoise::{Denoiser, HOP_SIZE};

fn bench_denoiser_initialization(c: &mut Criterion) {
    c.bench_function("denoiser_initialization", |b| {
        b.iter(|| black_box(Denoiser::new().unwrap()))
    });
}

fn bench_denoiser_process_frame(c: &mut Criterion) {
    let mut denoiser = Denoiser::new().unwrap();
    let input = vec![0.0f32; HOP_SIZE];
    let mut output = vec![0.0f32; HOP_SIZE];

    c.bench_function("denoiser_process_frame", |b| {
        b.iter(|| {
            black_box(
                denoiser
                    .process_frame(black_box(&input), black_box(&mut output))
                    .unwrap(),
            )
        })
    });
}

fn bench_denoiser_process(c: &mut Criterion) {
    let mut denoiser = Denoiser::new().unwrap();

    let frame_counts = [10, 100, 1000];

    for &num_frames in &frame_counts {
        let input = vec![0.0f32; HOP_SIZE * num_frames];

        c.bench_function(&format!("denoiser_process_{}_frames", num_frames), |b| {
            b.iter(|| black_box(denoiser.process(black_box(&input)).unwrap()))
        });
    }
}

fn bench_denoiser_throughput(c: &mut Criterion) {
    let mut denoiser = Denoiser::new().unwrap();
    let num_frames = 100;
    let input = vec![0.0f32; HOP_SIZE * num_frames];

    let mut group = c.benchmark_group("denoiser_throughput");
    group.throughput(criterion::Throughput::Elements(input.len() as u64));

    group.bench_function("samples_per_second", |b| {
        b.iter(|| black_box(denoiser.process(black_box(&input)).unwrap()))
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
