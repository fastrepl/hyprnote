fn main() -> Result<(), Box<dyn std::error::Error>> {
    #[cfg(feature = "generate")]
    {
        tonic_build::configure()
            .build_server(false)
            .out_dir("./src/realtime/interface")
            .compile_protos(&["proto/rtzr.proto"], &["proto"])?;
    }

    Ok(())
}
