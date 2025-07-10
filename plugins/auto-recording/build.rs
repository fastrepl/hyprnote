use std::fs;
use std::path::Path;

fn extract_commands_from_file(path: &Path) -> Vec<String> {
    let content = fs::read_to_string(path).expect("Failed to read commands.rs");
    let mut commands = Vec::new();
    let mut in_tauri_command = false;

    for line in content.lines() {
        if line.trim() == "#[tauri::command]" {
            in_tauri_command = true;
        } else if in_tauri_command && line.trim().starts_with("pub(crate)") {
            if let Some(fn_name) = extract_function_name(line) {
                commands.push(fn_name);
            }
            in_tauri_command = false;
        }
    }

    commands
}

fn extract_function_name(line: &str) -> Option<String> {
    let trimmed = line.trim();
    if let Some(start) = trimmed.find("fn ") {
        let after_fn = &trimmed[start + 3..];
        if let Some(end) = after_fn.find('<') {
            Some(after_fn[..end].to_string())
        } else if let Some(end) = after_fn.find('(') {
            Some(after_fn[..end].to_string())
        } else {
            None
        }
    } else {
        None
    }
}

fn main() {
    let commands_path = Path::new("src/commands.rs");
    let commands = extract_commands_from_file(commands_path);

    let static_commands: Vec<&'static str> = commands
        .into_iter()
        .map(|s| Box::leak(s.into_boxed_str()) as &'static str)
        .collect();

    tauri_plugin::Builder::new(&static_commands).build();
}
