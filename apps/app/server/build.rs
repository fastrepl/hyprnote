fn main() {
    #[cfg(debug_assertions)]
    {
        dotenv::from_filename(".env.local").ok();

        let exec = "pnpm";
        let args = ["-F", "app", "build"];
        let envs = std::env::vars().filter(|(k, _)| k.starts_with("VITE_"));

        let status = std::process::Command::new(exec)
            .args(args)
            .envs(envs)
            .status()
            .unwrap();

        if !status.success() {
            panic!("{exec} {args:?} failed");
        }
    }
}

