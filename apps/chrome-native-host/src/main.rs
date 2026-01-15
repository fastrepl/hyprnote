use hypr_chrome_native_messaging::{ExtensionMessage, HostMessage, read_message, write_message};
use std::fs::{self, OpenOptions};
use std::io::{self, BufReader, Write};
use std::path::PathBuf;

fn get_state_file_path() -> Option<PathBuf> {
    let data_dir = dirs::data_local_dir()?;
    let hyprnote_dir = data_dir.join("hyprnote");
    fs::create_dir_all(&hyprnote_dir).ok()?;
    Some(hyprnote_dir.join("chrome_extension_state.json"))
}

fn write_state(muted: bool) -> io::Result<()> {
    let state_file = get_state_file_path().ok_or_else(|| {
        io::Error::new(
            io::ErrorKind::NotFound,
            "Could not determine state file path",
        )
    })?;

    let state = serde_json::json!({
        "source": "google_meet",
        "muted": muted,
        "timestamp": std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0)
    });

    let mut file = OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .open(&state_file)?;

    file.write_all(serde_json::to_string_pretty(&state)?.as_bytes())?;
    file.flush()?;

    Ok(())
}

fn main() {
    let stdin = io::stdin();
    let mut stdout = io::stdout();
    let mut reader = BufReader::new(stdin.lock());

    loop {
        match read_message(&mut reader) {
            Ok(Some(message)) => {
                match message {
                    ExtensionMessage::MuteStateChanged { muted } => {
                        if let Err(e) = write_state(muted) {
                            eprintln!("Failed to write state: {}", e);
                        }
                    }
                }

                if let Err(e) = write_message(&mut stdout, &HostMessage::Ack) {
                    eprintln!("Failed to send ack: {}", e);
                }
            }
            Ok(None) => {
                break;
            }
            Err(e) => {
                eprintln!("Error reading message: {}", e);
                break;
            }
        }
    }
}
