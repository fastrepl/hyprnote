pub trait MembershipPluginExt<R: tauri::Runtime> {
    fn todo(&self) -> &str;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> MembershipPluginExt<R> for T {
    fn todo(&self) -> &str {
        "todo"
    }
}
