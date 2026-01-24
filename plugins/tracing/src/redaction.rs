use std::io::{self, Write};
use std::sync::LazyLock;

use regex::Regex;

static UNIX_HOME_REGEX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"/home/[^/\s]+").expect("Invalid regex"));

static MAC_HOME_REGEX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"/Users/[^/\s]+").expect("Invalid regex"));

static WINDOWS_HOME_REGEX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"C:\\Users\\[^\\/\s]+").expect("Invalid regex"));

static EMAIL_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}").expect("Invalid regex")
});

static IP_REGEX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\b(?:\d{1,3}\.){3}\d{1,3}\b").expect("Invalid regex"));

pub struct RedactingWriter<W: Write> {
    inner: W,
    buffer: Vec<u8>,
}

impl<W: Write> RedactingWriter<W> {
    pub fn new(inner: W) -> Self {
        Self {
            inner,
            buffer: Vec::with_capacity(8192),
        }
    }

    fn redact_line(line: &str) -> String {
        let mut redacted = line.to_string();
        redacted = UNIX_HOME_REGEX
            .replace_all(&redacted, "/home/[REDACTED]")
            .into_owned();
        redacted = MAC_HOME_REGEX
            .replace_all(&redacted, "/Users/[REDACTED]")
            .into_owned();
        redacted = WINDOWS_HOME_REGEX
            .replace_all(&redacted, r"C:\Users\[REDACTED]")
            .into_owned();
        redacted = EMAIL_REGEX
            .replace_all(&redacted, "[EMAIL_REDACTED]")
            .into_owned();
        redacted = IP_REGEX
            .replace_all(&redacted, "[IP_REDACTED]")
            .into_owned();
        redacted
    }

    fn flush_buffer(&mut self) -> io::Result<()> {
        if self.buffer.is_empty() {
            return Ok(());
        }

        if let Ok(line) = std::str::from_utf8(&self.buffer) {
            let redacted = Self::redact_line(line);
            self.inner.write_all(redacted.as_bytes())?;
        } else {
            self.inner.write_all(&self.buffer)?;
        }

        self.buffer.clear();
        Ok(())
    }
}

impl<W: Write> Write for RedactingWriter<W> {
    fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
        let mut last_newline_pos = 0;

        for (i, &byte) in buf.iter().enumerate() {
            if byte == b'\n' {
                self.buffer.extend_from_slice(&buf[last_newline_pos..=i]);
                self.flush_buffer()?;
                last_newline_pos = i + 1;
            }
        }

        if last_newline_pos < buf.len() {
            self.buffer.extend_from_slice(&buf[last_newline_pos..]);
        }

        Ok(buf.len())
    }

    fn flush(&mut self) -> io::Result<()> {
        self.flush_buffer()?;
        self.inner.flush()
    }
}

impl<W: Write> Drop for RedactingWriter<W> {
    fn drop(&mut self) {
        let _ = self.flush();
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_redact_unix_home() {
        let input = "/home/johndoe/documents/file.txt";
        let output = RedactingWriter::<Vec<u8>>::redact_line(input);
        assert_eq!(output, "/home/[REDACTED]/documents/file.txt");
    }

    #[test]
    fn test_redact_unix_home_multiple() {
        let input = "/home/alice/file and /home/bob/other";
        let output = RedactingWriter::<Vec<u8>>::redact_line(input);
        assert_eq!(output, "/home/[REDACTED]/file and /home/[REDACTED]/other");
    }

    #[test]
    fn test_redact_mac_home() {
        let input = "/Users/janedoe/projects/app";
        let output = RedactingWriter::<Vec<u8>>::redact_line(input);
        assert_eq!(output, "/Users/[REDACTED]/projects/app");
    }

    #[test]
    fn test_redact_mac_home_multiple() {
        let input = "/Users/alice/Desktop and /Users/bob/Documents";
        let output = RedactingWriter::<Vec<u8>>::redact_line(input);
        assert_eq!(
            output,
            "/Users/[REDACTED]/Desktop and /Users/[REDACTED]/Documents"
        );
    }

    #[test]
    fn test_redact_windows_home() {
        let input = r"C:\Users\johndoe\Desktop\file.txt";
        let output = RedactingWriter::<Vec<u8>>::redact_line(input);
        assert_eq!(output, r"C:\Users\[REDACTED]\Desktop\file.txt");
    }

    #[test]
    fn test_redact_windows_home_forward_slash() {
        let input = r"C:\Users\johndoe/AppData/Local";
        let output = RedactingWriter::<Vec<u8>>::redact_line(input);
        assert_eq!(output, r"C:\Users\[REDACTED]/AppData/Local");
    }

    #[test]
    fn test_redact_email() {
        let input = "Contact: user@example.com for help";
        let output = RedactingWriter::<Vec<u8>>::redact_line(input);
        assert_eq!(output, "Contact: [EMAIL_REDACTED] for help");
    }

    #[test]
    fn test_redact_email_multiple() {
        let input = "From alice@test.org to bob@example.com";
        let output = RedactingWriter::<Vec<u8>>::redact_line(input);
        assert_eq!(output, "From [EMAIL_REDACTED] to [EMAIL_REDACTED]");
    }

    #[test]
    fn test_redact_email_complex() {
        let input = "Email: john.doe+tag@sub.example.co.uk";
        let output = RedactingWriter::<Vec<u8>>::redact_line(input);
        assert_eq!(output, "Email: [EMAIL_REDACTED]");
    }

    #[test]
    fn test_redact_ip() {
        let input = "Connected to 192.168.1.1 successfully";
        let output = RedactingWriter::<Vec<u8>>::redact_line(input);
        assert_eq!(output, "Connected to [IP_REDACTED] successfully");
    }

    #[test]
    fn test_redact_ip_multiple() {
        let input = "From 10.0.0.1 to 192.168.0.100";
        let output = RedactingWriter::<Vec<u8>>::redact_line(input);
        assert_eq!(output, "From [IP_REDACTED] to [IP_REDACTED]");
    }

    #[test]
    fn test_redact_ip_localhost() {
        let input = "Listening on 127.0.0.1:8080";
        let output = RedactingWriter::<Vec<u8>>::redact_line(input);
        assert_eq!(output, "Listening on [IP_REDACTED]:8080");
    }

    #[test]
    fn test_redact_mixed_content() {
        let input = "User alice@test.com at /home/alice connected from 192.168.1.50";
        let output = RedactingWriter::<Vec<u8>>::redact_line(input);
        assert_eq!(
            output,
            "User [EMAIL_REDACTED] at /home/[REDACTED] connected from [IP_REDACTED]"
        );
    }

    #[test]
    fn test_no_redaction_needed() {
        let input = "Application started successfully";
        let output = RedactingWriter::<Vec<u8>>::redact_line(input);
        assert_eq!(output, "Application started successfully");
    }

    #[test]
    fn test_redacting_writer_single_line() {
        let mut output = Vec::new();
        {
            let mut writer = RedactingWriter::new(&mut output);
            writer.write_all(b"test /home/user/file\n").unwrap();
            writer.flush().unwrap();
        }

        let result = String::from_utf8(output).unwrap();
        assert_eq!(result, "test /home/[REDACTED]/file\n");
    }

    #[test]
    fn test_redacting_writer_partial_line() {
        let mut output = Vec::new();
        {
            let mut writer = RedactingWriter::new(&mut output);
            writer.write_all(b"test /home/").unwrap();
            writer.write_all(b"user/file\n").unwrap();
            writer.flush().unwrap();
        }

        let result = String::from_utf8(output).unwrap();
        assert_eq!(result, "test /home/[REDACTED]/file\n");
    }

    #[test]
    fn test_redacting_writer_multiple_lines() {
        let mut output = Vec::new();
        {
            let mut writer = RedactingWriter::new(&mut output);
            writer.write_all(b"/home/alice/a\n/Users/bob/b\n").unwrap();
            writer.flush().unwrap();
        }

        let result = String::from_utf8(output).unwrap();
        assert_eq!(result, "/home/[REDACTED]/a\n/Users/[REDACTED]/b\n");
    }

    #[test]
    fn test_redacting_writer_flush_partial() {
        let mut output = Vec::new();
        {
            let mut writer = RedactingWriter::new(&mut output);
            writer.write_all(b"partial /home/user/path").unwrap();
            writer.flush().unwrap();
        }

        let result = String::from_utf8(output).unwrap();
        assert_eq!(result, "partial /home/[REDACTED]/path");
    }

    #[test]
    fn test_redacting_writer_empty_input() {
        let mut output = Vec::new();
        {
            let mut writer = RedactingWriter::new(&mut output);
            writer.write_all(b"").unwrap();
            writer.flush().unwrap();
        }

        let result = String::from_utf8(output).unwrap();
        assert_eq!(result, "");
    }

    #[test]
    fn test_redacting_writer_only_newlines() {
        let mut output = Vec::new();
        {
            let mut writer = RedactingWriter::new(&mut output);
            writer.write_all(b"\n\n\n").unwrap();
            writer.flush().unwrap();
        }

        let result = String::from_utf8(output).unwrap();
        assert_eq!(result, "\n\n\n");
    }

    #[test]
    fn test_redacting_writer_interleaved_writes() {
        let mut output = Vec::new();
        {
            let mut writer = RedactingWriter::new(&mut output);
            writer.write_all(b"line1 ").unwrap();
            writer.write_all(b"user@test.com").unwrap();
            writer.write_all(b" end\n").unwrap();
            writer.write_all(b"line2\n").unwrap();
            writer.flush().unwrap();
        }

        let result = String::from_utf8(output).unwrap();
        assert_eq!(result, "line1 [EMAIL_REDACTED] end\nline2\n");
    }
}
