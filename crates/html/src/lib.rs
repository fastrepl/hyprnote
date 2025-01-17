use std::sync::Mutex;

pub struct HtmlBuffer {
    buffer: Mutex<String>,
}

impl HtmlBuffer {
    pub fn new() -> Self {
        Self {
            buffer: Mutex::new(String::new()),
        }
    }

    pub fn write(&self, text: &str) {
        let mut buffer = self.buffer.lock().unwrap();
        buffer.push_str(text);
    }

    pub fn read(&self) -> Result<String, tl::ParseError> {
        let buffer = self.buffer.lock().unwrap();
        let dom = tl::parse(&*buffer, tl::ParserOptions::default())?;
        Ok(dom.outer_html())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple() {
        let buffer = HtmlBuffer::new();

        buffer.write("<h1>Hello,");
        buffer.write(" world");
        buffer.write("</h1><ul><li>item1");

        assert_eq!(
            buffer.read().unwrap(),
            "<h1>Hello, world</h1><ul><li>item1</li></ul>"
        );
    }

    #[test]
    fn test_single_writer_single_reader() {
        let write_buffer = std::sync::Arc::new(HtmlBuffer::new());
        let read_buffer = std::sync::Arc::clone(&write_buffer);

        let write_thread = std::thread::spawn(move || {
            let b = write_buffer.as_ref();
            b.write("<h1>Hello");
            std::thread::sleep(std::time::Duration::from_millis(100));
            b.write(" world");
            std::thread::sleep(std::time::Duration::from_millis(40));
            b.write("<");
        });

        let read_thread = std::thread::spawn(move || {
            let b = read_buffer.as_ref();
            for _ in 0..100 {
                b.read().unwrap();
                std::thread::sleep(std::time::Duration::from_millis(5));
            }
            b.read().unwrap()
        });

        write_thread.join().unwrap();
        let result = read_thread.join().unwrap();
        assert_eq!(result, "<h1>Hello world</h1>");
    }

    #[test]
    fn test_multiple_readers_and_writers() {
        let buffer = std::sync::Arc::new(HtmlBuffer::new());
        let num_writers = 5;
        let num_readers = 3;
        let iterations = 100;

        let mut handles = vec![];

        for i in 0..num_writers {
            let buffer = std::sync::Arc::clone(&buffer);
            handles.push(std::thread::spawn(move || {
                for j in 0..iterations {
                    buffer.write(&format!("<div>writer{}-{}</div>", i, j));
                }
            }));
        }

        for _ in 0..num_readers {
            let buffer = std::sync::Arc::clone(&buffer);
            handles.push(std::thread::spawn(move || {
                for _ in 0..iterations {
                    let result = buffer.read().unwrap();
                    assert!(result.starts_with("<"));
                    assert!(result.ends_with(">"));
                }
            }));
        }

        for handle in handles {
            handle.join().unwrap();
        }

        let final_result = buffer.read().unwrap();
        assert!(final_result.starts_with("<"));
        assert!(final_result.ends_with(">"));
    }
}
