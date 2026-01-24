use std::io::{self, Write};
use std::sync::LazyLock;

use regex::Regex;

static EMAIL_REGEX: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}").expect("Invalid regex")
});

static IP_REGEX: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"\b(?:\d{1,3}\.){3}\d{1,3}\b").expect("Invalid regex"));

pub struct RedactingWriter<W: Write> {
    inner: W,
    buffer: Vec<u8>,
    home_dir: Option<String>,
}

impl<W: Write> RedactingWriter<W> {
    pub fn new(inner: W) -> Self {
        Self {
            inner,
            buffer: Vec::with_capacity(8192),
            home_dir: dirs::home_dir().map(|p| p.to_string_lossy().into_owned()),
        }
    }

    fn redact_line(&self, line: &str) -> String {
        let mut redacted = line.to_string();
        if let Some(home) = &self.home_dir {
            redacted = redacted.replace(home, "[HOME]");
        }
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
            let redacted = self.redact_line(line);
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

    impl<W: Write> RedactingWriter<W> {
        fn with_home_dir(inner: W, home_dir: Option<String>) -> Self {
            Self {
                inner,
                buffer: Vec::with_capacity(8192),
                home_dir,
            }
        }
    }

    #[test]
    fn test_redact_home_dir() {
        let writer = RedactingWriter::with_home_dir(Vec::<u8>::new(), Some("/home/johndoe".into()));
        let input = "/home/johndoe/documents/file.txt";
        let output = writer.redact_line(input);
        assert_eq!(output, "[HOME]/documents/file.txt");
    }

    #[test]
    fn test_redact_home_dir_multiple_occurrences() {
        let writer = RedactingWriter::with_home_dir(Vec::<u8>::new(), Some("/home/alice".into()));
        let input = "/home/alice/file and /home/alice/other";
        let output = writer.redact_line(input);
        assert_eq!(output, "[HOME]/file and [HOME]/other");
    }

    #[test]
    fn test_redact_mac_home_dir() {
        let writer =
            RedactingWriter::with_home_dir(Vec::<u8>::new(), Some("/Users/janedoe".into()));
        let input = "/Users/janedoe/projects/app";
        let output = writer.redact_line(input);
        assert_eq!(output, "[HOME]/projects/app");
    }

    #[test]
    fn test_redact_windows_home_dir() {
        let writer =
            RedactingWriter::with_home_dir(Vec::<u8>::new(), Some(r"C:\Users\johndoe".into()));
        let input = r"C:\Users\johndoe\Desktop\file.txt";
        let output = writer.redact_line(input);
        assert_eq!(output, r"[HOME]\Desktop\file.txt");
    }

    #[test]
    fn test_other_user_paths_not_redacted() {
        let writer = RedactingWriter::with_home_dir(Vec::<u8>::new(), Some("/home/alice".into()));
        let input = "/home/bob/documents/file.txt";
        let output = writer.redact_line(input);
        assert_eq!(output, "/home/bob/documents/file.txt");
    }

    #[test]
    fn test_redact_email() {
        let writer = RedactingWriter::with_home_dir(Vec::<u8>::new(), None);
        let input = "Contact: user@example.com for help";
        let output = writer.redact_line(input);
        assert_eq!(output, "Contact: [EMAIL_REDACTED] for help");
    }

    #[test]
    fn test_redact_email_multiple() {
        let writer = RedactingWriter::with_home_dir(Vec::<u8>::new(), None);
        let input = "From alice@test.org to bob@example.com";
        let output = writer.redact_line(input);
        assert_eq!(output, "From [EMAIL_REDACTED] to [EMAIL_REDACTED]");
    }

    #[test]
    fn test_redact_email_complex() {
        let writer = RedactingWriter::with_home_dir(Vec::<u8>::new(), None);
        let input = "Email: john.doe+tag@sub.example.co.uk";
        let output = writer.redact_line(input);
        assert_eq!(output, "Email: [EMAIL_REDACTED]");
    }

    #[test]
    fn test_redact_ip() {
        let writer = RedactingWriter::with_home_dir(Vec::<u8>::new(), None);
        let input = "Connected to 192.168.1.1 successfully";
        let output = writer.redact_line(input);
        assert_eq!(output, "Connected to [IP_REDACTED] successfully");
    }

    #[test]
    fn test_redact_ip_multiple() {
        let writer = RedactingWriter::with_home_dir(Vec::<u8>::new(), None);
        let input = "From 10.0.0.1 to 192.168.0.100";
        let output = writer.redact_line(input);
        assert_eq!(output, "From [IP_REDACTED] to [IP_REDACTED]");
    }

    #[test]
    fn test_redact_ip_localhost() {
        let writer = RedactingWriter::with_home_dir(Vec::<u8>::new(), None);
        let input = "Listening on 127.0.0.1:8080";
        let output = writer.redact_line(input);
        assert_eq!(output, "Listening on [IP_REDACTED]:8080");
    }

    #[test]
    fn test_redact_mixed_content() {
        let writer = RedactingWriter::with_home_dir(Vec::<u8>::new(), Some("/home/alice".into()));
        let input = "User alice@test.com at /home/alice connected from 192.168.1.50";
        let output = writer.redact_line(input);
        assert_eq!(
            output,
            "User [EMAIL_REDACTED] at [HOME] connected from [IP_REDACTED]"
        );
    }

    #[test]
    fn test_no_redaction_needed() {
        let writer = RedactingWriter::with_home_dir(Vec::<u8>::new(), None);
        let input = "Application started successfully";
        let output = writer.redact_line(input);
        assert_eq!(output, "Application started successfully");
    }

    #[test]
    fn test_redacting_writer_with_actual_home() {
        let home = dirs::home_dir().map(|p| p.to_string_lossy().into_owned());
        if let Some(ref home_path) = home {
            let mut output = Vec::new();
            let input = format!("{}/documents/file.txt\n", home_path);
            {
                let mut writer = RedactingWriter::new(&mut output);
                writer.write_all(input.as_bytes()).unwrap();
                writer.flush().unwrap();
            }
            let result = String::from_utf8(output).unwrap();
            assert_eq!(result, "[HOME]/documents/file.txt\n");
        }
    }

    #[test]
    fn test_redacting_writer_partial_line() {
        let mut output = Vec::new();
        {
            let mut writer = RedactingWriter::with_home_dir(&mut output, Some("/home/user".into()));
            writer.write_all(b"test /home/").unwrap();
            writer.write_all(b"user/file\n").unwrap();
            writer.flush().unwrap();
        }
        let result = String::from_utf8(output).unwrap();
        assert_eq!(result, "test [HOME]/file\n");
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
