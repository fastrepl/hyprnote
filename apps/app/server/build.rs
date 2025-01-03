fn main() {
    #[cfg(debug_assertions)]
    {
        println!("cargo:rerun-if-changed=../src/");

        dotenv::from_filename(".env.local").ok();
        let vars = std::env::vars();

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
