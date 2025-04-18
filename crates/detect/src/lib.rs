#[cfg(target_os = "macos")]
mod macos;

pub fn run(f: impl Fn(String) + Sync + 'static) {
    #[cfg(target_os = "macos")]
    macos::run(f);
}
