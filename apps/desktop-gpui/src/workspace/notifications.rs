//! `showBatchCompletedNotification` / `showSummaryReadyNotification` and
//! their gates (`isAppWindowInactive`, `shouldShowNotification`), plus the
//! `openNew` a notification click performs.

use gpui::{Context, Window};

use super::Workspace;

impl Workspace {
    /// `isAppWindowInactive`, tracked from the window's activation events.
    pub(super) fn observe_window_activity(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        self.window_active = window.is_window_active();
        cx.observe_window_activation(window, |this, window, _| {
            this.window_active = window.is_window_active();
        })
        .detach();
    }

    /// `shouldShowNotification(settingKey)`: notifications on, and the kind on.
    fn should_show_notification(&self, key: &str, path: &[&str]) -> bool {
        let settings = &self.provider_settings;
        !settings.bool_setting(
            "notification_disabled",
            &["notification", "disabled"],
            false,
        ) && settings.bool_setting(key, path, true)
    }

    /// `showBatchCompletedNotification(sessionId)`: only while the window is
    /// inactive and `notification_transcription_complete` is on.
    pub(crate) fn notify_batch_completed(&self, session_id: &str) {
        if self.window_active
            || !self.should_show_notification(
                "notification_transcription_complete",
                &["notification", "transcription_complete"],
            )
        {
            return;
        }
        crate::notifications::show(&crate::notifications::batch_completed(session_id));
    }

    /// `showSummaryReadyNotification(sessionId, title)`.
    pub(crate) fn notify_summary_ready(&self, session_id: &str, title: Option<&str>) {
        if self.window_active
            || !self.should_show_notification(
                "notification_summary_complete",
                &["notification", "summary_complete"],
            )
        {
            return;
        }
        crate::notifications::show(&crate::notifications::summary_ready(session_id, title));
    }

    /// A notification's `Open Anarlog`: `openNew({ type: "sessions", id })`.
    pub(crate) fn open_session_from_notification(
        &mut self,
        session_id: String,
        cx: &mut Context<Self>,
    ) {
        self.open_new(session_id, cx);
    }
}
