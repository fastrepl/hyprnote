use crate::error::Error;

pub trait NotificationPluginExt<R: tauri::Runtime> {
    fn show_notification(&self, v: hypr_notification::Notification) -> Result<(), Error>;
    fn clear_notifications(&self) -> Result<(), Error>;
}

impl<R: tauri::Runtime, T: tauri::Manager<R>> NotificationPluginExt<R> for T {
    #[tracing::instrument(skip(self))]
    fn show_notification(&self, v: hypr_notification::Notification) -> Result<(), Error> {
        hypr_notification::show(&v);
        Ok(())
    }

    #[tracing::instrument(skip(self))]
    fn clear_notifications(&self) -> Result<(), Error> {
        hypr_notification::clear();
        Ok(())
    }
}
