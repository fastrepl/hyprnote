fn main() {
    println!("cargo:rerun-if-changed=../web/src/");

    let status = std::process::Command::new("pnpm")
        .args(["-F", "web", "build"])
        .status()
        .unwrap();

    if !status.success() {
        panic!("'pnpm -F web build' command failed");
    }
}
