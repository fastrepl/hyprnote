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
        use std::io::Write;
        writeln!(
            buf,
            "[{}] {} {}",
            chrono::Local::now().format("%H:%M:%S"),
            record.level(),
            record.args()
        )
    });

    if let Ok(log_level) = std::env::var("LOG_LEVEL") {
        builder.parse_filters(&log_level);
    } else {
        builder.filter_level(log::LevelFilter::Info);
    }

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
