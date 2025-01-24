use std::sync::Mutex;

pub struct Buffer {
    content: Mutex<String>,
}

impl Buffer {
    pub fn new() -> Self {
        Self {
            content: Mutex::new(String::new()),
        }
    }

    pub fn write(&self, s: &str) {
        let mut content = self.content.lock().unwrap();
        content.push_str(s);
    }

    pub fn read(&self) -> anyhow::Result<String> {
        let content = self.content.lock().unwrap();
        let html = markdown::to_html(&content);
        Ok(html)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple() {
        let buffer = Buffer::new();

        buffer.write("# Hello, ");
        buffer.write("world!");

        let result = buffer.read().unwrap();
        assert_eq!(result, "<h1>Hello, world!</h1>");
    }
}
