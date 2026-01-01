use std::hint::black_box;

use criterion::{BenchmarkId, Criterion, criterion_group, criterion_main};
use tauri_plugin_pagefind::{IndexRecord, build_index_sync};
use tempfile::TempDir;

fn generate_records(count: usize) -> Vec<IndexRecord> {
    (0..count)
        .map(|i| IndexRecord {
            url: format!("/doc/{}", i),
            content: format!(
                "This is document number {}. It contains sample text for indexing. \
                The quick brown fox jumps over the lazy dog. Lorem ipsum dolor sit amet, \
                consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore \
                et dolore magna aliqua. Document {} has unique content for search testing.",
                i, i
            ),
            title: Some(format!("Document Title {}", i)),
            filters: None,
            meta: None,
        })
        .collect()
}

fn bench_indexing(c: &mut Criterion) {
    let mut group = c.benchmark_group("indexing");

    for count in [10, 100, 1000, 2000, 4000, 8000] {
        let records = generate_records(count);

        group.bench_with_input(BenchmarkId::new("docs", count), &records, |b, records| {
            b.iter_with_setup(
                || {
                    let temp_dir = TempDir::new().unwrap();
                    (temp_dir, records.clone())
                },
                |(temp_dir, records)| {
                    black_box(build_index_sync(temp_dir.path().to_path_buf(), records).unwrap())
                },
            )
        });
    }

    group.finish();
}

criterion_group! {
    name = benches;
    config = Criterion::default().sample_size(10);
    targets = bench_indexing
}
criterion_main!(benches);
