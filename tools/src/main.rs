use std::fs::File;
use std::io::BufReader;
use std::path::PathBuf;

use clap::{Parser, Subcommand};
use image::GenericImageView;
use xcap::Window;

#[derive(Parser)]
#[command(name = "tools")]
#[command(about = "CLI tools for window screenshots and image comparison")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    #[command(about = "List all available windows")]
    ListWindows,

    #[command(about = "Take a screenshot of a window by name")]
    Screenshot {
        #[arg(short, long, help = "Window name (partial match supported)")]
        name: String,

        #[arg(short, long, help = "Output file path")]
        output: PathBuf,
    },

    #[command(about = "Compare two images using pixelmatch")]
    Compare {
        #[arg(help = "First image path")]
        image1: PathBuf,

        #[arg(help = "Second image path")]
        image2: PathBuf,

        #[arg(short, long, help = "Output diff image path (optional)")]
        output: Option<PathBuf>,

        #[arg(
            short,
            long,
            default_value = "0.1",
            help = "Threshold for pixel comparison (0.0-1.0)"
        )]
        threshold: f64,
    },
}

fn list_windows() -> Result<(), Box<dyn std::error::Error>> {
    let windows = Window::all()?;

    if windows.is_empty() {
        println!("No windows found.");
        return Ok(());
    }

    println!("{:<8} {:<60} {:<20}", "ID", "Title", "App Name");
    println!("{}", "-".repeat(88));

    for window in windows {
        let id = window.id();
        let title = window.title();
        let app_name = window.app_name();

        if !title.is_empty() {
            println!(
                "{:<8} {:<60} {:<20}",
                id,
                truncate(&title, 58),
                truncate(&app_name, 18)
            );
        }
    }

    Ok(())
}

fn truncate(s: &str, max_len: usize) -> String {
    if s.len() > max_len {
        format!("{}...", &s[..max_len - 3])
    } else {
        s.to_string()
    }
}

fn screenshot(name: &str, output: &PathBuf) -> Result<(), Box<dyn std::error::Error>> {
    let windows = Window::all()?;

    let matching_window = windows.into_iter().find(|w| {
        let title = w.title().to_lowercase();
        let app_name = w.app_name().to_lowercase();
        let search = name.to_lowercase();
        title.contains(&search) || app_name.contains(&search)
    });

    match matching_window {
        Some(window) => {
            let image = window.capture_image()?;
            image.save(output)?;
            println!("Screenshot saved to: {}", output.display());
            Ok(())
        }
        None => {
            eprintln!("No window found matching: {}", name);
            std::process::exit(1);
        }
    }
}

fn compare(
    image1_path: &PathBuf,
    image2_path: &PathBuf,
    output_path: Option<&PathBuf>,
    threshold: f64,
) -> Result<(), Box<dyn std::error::Error>> {
    let img1 = image::open(image1_path)?;
    let img2 = image::open(image2_path)?;

    let (w1, h1) = img1.dimensions();
    let (w2, h2) = img2.dimensions();

    if w1 != w2 || h1 != h2 {
        eprintln!(
            "Image dimensions do not match: {}x{} vs {}x{}",
            w1, h1, w2, h2
        );
        std::process::exit(1);
    }

    let file1 = File::open(image1_path)?;
    let file2 = File::open(image2_path)?;
    let reader1 = BufReader::new(file1);
    let reader2 = BufReader::new(file2);

    let options = pixelmatch::Options {
        threshold,
        include_aa: true,
        ..Default::default()
    };

    let total_pixels = (w1 * h1) as usize;

    let mismatch_count = if let Some(output) = output_path {
        let mut output_file = File::create(output)?;
        pixelmatch::pixelmatch(
            reader1,
            reader2,
            Some(&mut output_file),
            Some(w1),
            Some(h1),
            Some(options),
        )?
    } else {
        pixelmatch::pixelmatch::<_, _, File>(
            reader1,
            reader2,
            None,
            Some(w1),
            Some(h1),
            Some(options),
        )?
    };

    let mismatch_percentage = (mismatch_count as f64 / total_pixels as f64) * 100.0;

    println!("Comparison results:");
    println!("  Total pixels: {}", total_pixels);
    println!("  Mismatched pixels: {}", mismatch_count);
    println!("  Mismatch percentage: {:.2}%", mismatch_percentage);

    if output_path.is_some() {
        println!("  Diff image saved to: {}", output_path.unwrap().display());
    }

    if mismatch_count > 0 {
        std::process::exit(1);
    }

    Ok(())
}

fn main() {
    let cli = Cli::parse();

    let result = match &cli.command {
        Commands::ListWindows => list_windows(),
        Commands::Screenshot { name, output } => screenshot(name, output),
        Commands::Compare {
            image1,
            image2,
            output,
            threshold,
        } => compare(image1, image2, output.as_ref(), *threshold),
    };

    if let Err(e) = result {
        eprintln!("Error: {}", e);
        std::process::exit(1);
    }
}
