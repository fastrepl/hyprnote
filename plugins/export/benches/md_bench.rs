use std::hint::black_box;

use criterion::{BenchmarkId, Criterion, criterion_group, criterion_main};
use serde_json::json;
use tauri_plugin_export::md::{mdast_to_markdown, tiptap_json_to_mdast};
use tauri_plugin_export::{tiptap_json_to_md, tiptap_json_to_md_batch};

fn realistic_document() -> serde_json::Value {
    let mut content = Vec::new();

    for header_idx in 1..=10 {
        content.push(json!({
            "type": "heading",
            "attrs": { "level": 2 },
            "content": [
                { "type": "text", "text": format!("Section {}", header_idx) }
            ]
        }));

        let bullets: Vec<serde_json::Value> = (1..=10)
            .map(|bullet_idx| {
                json!({
                    "type": "listItem",
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [
                                { "type": "text", "text": format!("Bullet point {} under section {}", bullet_idx, header_idx) }
                            ]
                        }
                    ]
                })
            })
            .collect();

        content.push(json!({
            "type": "bulletList",
            "content": bullets
        }));
    }

    json!({
        "type": "doc",
        "content": content
    })
}

fn bench_tiptap_to_mdast(c: &mut Criterion) {
    let doc = realistic_document();

    c.bench_function("tiptap_to_mdast", |b| {
        b.iter(|| black_box(tiptap_json_to_mdast(black_box(&doc))))
    });
}

fn bench_ast_to_md(c: &mut Criterion) {
    let doc = realistic_document();
    let mdast = tiptap_json_to_mdast(&doc);

    c.bench_function("ast_to_md", |b| {
        b.iter(|| black_box(mdast_to_markdown(black_box(&mdast)).unwrap()))
    });
}

fn bench_single_vs_batch(c: &mut Criterion) {
    let doc = realistic_document();

    let mut group = c.benchmark_group("batch_comparison");

    for count in [100, 500] {
        let docs: Vec<_> = (0..count).map(|_| doc.clone()).collect();

        group.bench_with_input(BenchmarkId::new("sequential", count), &docs, |b, docs| {
            b.iter(|| {
                for doc in docs {
                    black_box(tiptap_json_to_md(black_box(doc)).unwrap());
                }
            })
        });

        group.bench_with_input(BenchmarkId::new("rayon_batch", count), &docs, |b, docs| {
            b.iter(|| black_box(tiptap_json_to_md_batch(black_box(docs.clone())).unwrap()))
        });
    }

    group.finish();
}

criterion_group! {
    name = benches;
    config = Criterion::default().sample_size(10);
    targets = bench_tiptap_to_mdast, bench_ast_to_md, bench_single_vs_batch
}
criterion_main!(benches);
