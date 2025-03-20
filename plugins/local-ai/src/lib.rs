#[tokio::test]
#[ignore]
// cargo test test_local_ai -p tauri-plugin-local-ai -- --ignored --nocapture
async fn test_local_ai() {
    use futures_util::StreamExt;
    use tauri::Manager;

    let app = tauri::test::mock_builder()
        .plugin(tauri_plugin_local_llm::init())
        .plugin(tauri_plugin_local_stt::init())
        .build(tauri::test::mock_context(tauri::test::noop_assets()))
        .unwrap();

    {
        use tauri_plugin_listener::ListenClientBuilder;
        use tauri_plugin_local_stt::LocalSttPluginExt;

        let cache_dir = app.path().data_dir().unwrap().join("com.hyprnote.dev");
        app.start_server(cache_dir).await.unwrap();
        let api_base = app.api_base().await.unwrap();

        let listen_client = ListenClientBuilder::default()
            .api_base(api_base)
            .api_key("NONE")
            .language(codes_iso_639::part_1::LanguageCode::En)
            .build();

        let audio_source = rodio::Decoder::new_wav(std::io::BufReader::new(
            std::fs::File::open(hypr_data::english_1::AUDIO_PATH).unwrap(),
        ))
        .unwrap();

        let listen_stream = listen_client.from_audio(audio_source).await.unwrap();
        let mut listen_stream = Box::pin(listen_stream);

        while let Some(chunk) = listen_stream.next().await {
            println!("{:?}", chunk);
        }

        app.stop_server().await.unwrap();
    }
}
