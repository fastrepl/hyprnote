use std::path::Path;
use std::{fs, io};
use termtree::Tree;

#[derive(clap::Args)]
pub struct ModelsArgs {}

pub async fn handle_models(_args: ModelsArgs) -> anyhow::Result<()> {
    let content = {
        let models_dir = owhisper_config::models_dir();
        let mut t = tree(&models_dir)?;
        t.root = "~/Library/Caches/".to_string() + &t.root;
        t.to_string()
    };

    bat::PrettyPrinter::new()
        .input_from_bytes(content.as_bytes())
        .grid(true)
        .print()?;

    Ok(())
}

fn label<P: AsRef<Path>>(p: P) -> String {
    p.as_ref().file_name().unwrap().to_str().unwrap().to_owned()
}

fn tree<P: AsRef<Path>>(p: P) -> io::Result<Tree<String>> {
    let result = fs::read_dir(&p)?.filter_map(|e| e.ok()).fold(
        Tree::new(label(p.as_ref().canonicalize()?)),
        |mut root, entry| {
            let metadata = entry.metadata().unwrap();
            if metadata.is_dir() {
                if let Ok(subtree) = tree(entry.path()) {
                    root.push(subtree);
                }
            } else {
                root.push(Tree::new(label(entry.path())));
            }
            root
        },
    );
    Ok(result)
}
