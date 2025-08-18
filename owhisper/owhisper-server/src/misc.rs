const LOGO: &str = include_str!("../logo/ascii.txt");

pub fn print_logo() {
    println!(
        "{}{}\n",
        LOGO, "Thank you for using OWhisper! We ♡ our users!\nBug report: https://github.com/fastrepl/hyprnote/issues/new?labels=owhisper"
    );
}

pub fn set_logger() {
    let mut builder = env_logger::Builder::new();

    builder.format(|buf, record| {
        let (style_begin, style_end) = {
            use env_logger::fmt::style;

            match record.level() {
                log::Level::Trace => (
                    style::AnsiColor::White.on_default().render(),
                    style::AnsiColor::White.on_default().render_reset(),
                ),
                log::Level::Debug => (
                    style::AnsiColor::Blue.on_default().render(),
                    style::AnsiColor::Blue.on_default().render_reset(),
                ),
                log::Level::Info => (
                    style::AnsiColor::Green.on_default().render(),
                    style::AnsiColor::Green.on_default().render_reset(),
                ),
                log::Level::Warn => (
                    style::AnsiColor::Yellow.on_default().render(),
                    style::AnsiColor::Yellow.on_default().render_reset(),
                ),
                log::Level::Error => (
                    style::AnsiColor::Red.on_default().render(),
                    style::AnsiColor::Red.on_default().render_reset(),
                ),
            }
        };

        use std::io::Write;

        writeln!(
            buf,
            "[{}] {}{}{} {}",
            chrono::Local::now().format("%H:%M:%S"),
            style_begin,
            record.level(),
            style_end,
            record.args()
        )
    });

    if let Ok(log_level) = std::env::var("LOG_LEVEL") {
        builder.parse_filters(&log_level);
    } else {
        builder.filter_level(log::LevelFilter::Info);
    }

    builder
        .filter_module("ort", log::LevelFilter::Warn)
        .filter_module("whisper-local", log::LevelFilter::Warn);
    builder.init();
}

pub async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("failed to install Ctrl+C handler");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("failed to install signal handler")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}
