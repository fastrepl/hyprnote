fn main() {
    #[cfg(debug_assertions)]
    {
        dotenv::from_filename(".env.local").ok();
        let vars = std::env::vars().filter(|(k, _)| k.starts_with("VITE_"));

        let status = std::process::Command::new("pnpm")
            .args(["-F", "app", "build"])
            .envs(vars)
            .status()
            .unwrap();

        if !status.success() {
            panic!("'pnpm -F app build' command failed");
        }
    }
}
