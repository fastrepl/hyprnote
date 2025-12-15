use std::rc::Rc;
use std::time::Duration;

use gpui::prelude::*;
use gpui::*;

const DEFAULT_TOAST_DURATION: Duration = Duration::from_secs(10);
const NOTIFICATION_WIDTH: Pixels = px(400.);
const NOTIFICATION_HEIGHT: Pixels = px(72.);
const NOTIFICATION_MARGIN: Pixels = px(16.);

#[derive(Clone)]
pub struct ToastAction {
    pub id: SharedString,
    pub label: SharedString,
    pub on_click: Option<Rc<dyn Fn(&mut Window, &mut App)>>,
}

impl ToastAction {
    pub fn new(id: impl Into<SharedString>, label: impl Into<SharedString>) -> Self {
        Self {
            id: id.into(),
            label: label.into(),
            on_click: None,
        }
    }

    pub fn on_click(mut self, handler: impl Fn(&mut Window, &mut App) + 'static) -> Self {
        self.on_click = Some(Rc::new(handler));
        self
    }
}

pub struct StatusToast {
    title: SharedString,
    subtitle: Option<SharedString>,
    action: Option<ToastAction>,
    show_dismiss: bool,
    on_dismiss: Option<Rc<dyn Fn(&mut Window, &mut App)>>,
}

impl StatusToast {
    pub fn new(title: impl Into<SharedString>) -> Self {
        Self {
            title: title.into(),
            subtitle: None,
            action: None,
            show_dismiss: true,
            on_dismiss: None,
        }
    }

    pub fn subtitle(mut self, subtitle: impl Into<SharedString>) -> Self {
        self.subtitle = Some(subtitle.into());
        self
    }

    pub fn action(mut self, action: ToastAction) -> Self {
        self.action = Some(action);
        self
    }

    pub fn show_dismiss(mut self, show: bool) -> Self {
        self.show_dismiss = show;
        self
    }

    pub fn on_dismiss(mut self, handler: impl Fn(&mut Window, &mut App) + 'static) -> Self {
        self.on_dismiss = Some(Rc::new(handler));
        self
    }
}

impl Render for StatusToast {
    fn render(&mut self, _window: &mut Window, _cx: &mut Context<Self>) -> impl IntoElement {
        let has_action_or_dismiss = self.action.is_some() || self.show_dismiss;

        let mut root = div()
            .id("status-toast")
            .flex()
            .flex_row()
            .items_center()
            .gap_3()
            .py_2()
            .pl_3()
            .flex_none()
            .bg(rgb(0x2d2d2d))
            .rounded_lg()
            .shadow_lg()
            .border_1()
            .border_color(rgb(0x444444));

        if has_action_or_dismiss {
            root = root.pr_2();
        } else {
            root = root.pr_3();
        }

        let icon = div().size_6().flex().items_center().justify_center().child(
            div()
                .text_color(rgb(0xffd700))
                .text_size(px(16.))
                .child("✦"),
        );

        root = root.child(icon);

        let mut text_container = div().flex().flex_col().flex_1().gap_0p5().child(
            div()
                .text_color(rgb(0xffffff))
                .text_size(px(13.))
                .font_weight(FontWeight::MEDIUM)
                .child(self.title.clone()),
        );

        if let Some(subtitle) = &self.subtitle {
            text_container = text_container.child(
                div()
                    .text_color(rgb(0x888888))
                    .text_size(px(12.))
                    .child(subtitle.clone()),
            );
        }

        root = root.child(text_container);

        if let Some(action) = &self.action {
            let on_click = action.on_click.clone();
            let mut action_btn = div()
                .id(action.id.clone())
                .px_3()
                .py_1()
                .bg(rgb(0x0066ff))
                .rounded_md()
                .cursor_pointer()
                .child(
                    div()
                        .text_color(rgb(0xffffff))
                        .text_size(px(13.))
                        .font_weight(FontWeight::MEDIUM)
                        .child(action.label.clone()),
                );

            if let Some(handler) = on_click {
                action_btn = action_btn.on_click(move |_event, window, cx| {
                    handler(window, cx);
                });
            }

            root = root.child(action_btn);
        }

        if self.show_dismiss {
            let on_dismiss = self.on_dismiss.clone();
            let mut dismiss_btn = div()
                .id("dismiss")
                .px_2()
                .py_1()
                .cursor_pointer()
                .rounded_md()
                .child(
                    div()
                        .text_color(rgb(0x888888))
                        .text_size(px(13.))
                        .child("Dismiss"),
                );

            if let Some(handler) = on_dismiss {
                dismiss_btn = dismiss_btn.on_click(move |_event, window, cx| {
                    handler(window, cx);
                });
            }

            root = root.child(dismiss_btn);
        }

        root
    }
}

pub struct NotificationManager {
    toasts: Vec<Entity<StatusToast>>,
}

impl NotificationManager {
    pub fn show_toast(&mut self, toast: StatusToast, cx: &mut Context<Self>) {
        let entity = cx.new(|_cx| toast);
        self.toasts.push(entity);
        cx.notify();
    }

    pub fn dismiss_at(&mut self, index: usize, cx: &mut Context<Self>) {
        if index < self.toasts.len() {
            self.toasts.remove(index);
            cx.notify();
        }
    }

    pub fn dismiss_all(&mut self, cx: &mut Context<Self>) {
        self.toasts.clear();
        cx.notify();
    }
}

impl Render for NotificationManager {
    fn render(&mut self, _window: &mut Window, _cx: &mut Context<Self>) -> impl IntoElement {
        div()
            .absolute()
            .top(NOTIFICATION_MARGIN)
            .right(NOTIFICATION_MARGIN)
            .flex()
            .flex_col()
            .gap_2()
            .children(self.toasts.iter().cloned())
    }
}

pub fn window_options(_cx: &App) -> WindowOptions {
    let size = Size {
        width: NOTIFICATION_WIDTH,
        height: NOTIFICATION_HEIGHT,
    };

    WindowOptions {
        window_bounds: Some(WindowBounds::Windowed(Bounds {
            origin: point(px(100.), px(100.)),
            size,
        })),
        titlebar: Some(TitlebarOptions {
            appears_transparent: true,
            ..Default::default()
        }),
        window_background: WindowBackgroundAppearance::Transparent,
        focus: false,
        show: true,
        kind: WindowKind::PopUp,
        ..Default::default()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_toast_builder() {
        let toast = StatusToast::new("Test Title")
            .subtitle("Test subtitle")
            .action(ToastAction::new("action", "Click Me"))
            .show_dismiss(true);

        assert_eq!(toast.title.as_ref(), "Test Title");
        assert_eq!(
            toast.subtitle.as_ref().map(|s| s.as_ref()),
            Some("Test subtitle")
        );
        assert!(toast.action.is_some());
        assert!(toast.show_dismiss);
    }
}
