use std::rc::Rc;

use gpui::{prelude::*, *};

pub use gpui::PlatformDisplay;

const NOTIFICATION_WIDTH: Pixels = px(450.);
const NOTIFICATION_HEIGHT: Pixels = px(72.);
const NOTIFICATION_MARGIN_X: Pixels = px(16.);
const NOTIFICATION_MARGIN_Y: Pixels = px(-48.);

pub enum NotificationEvent {
    Accepted,
    Dismissed,
}

pub struct StatusToast {
    title: SharedString,
    subtitle: Option<SharedString>,
    project_name: Option<SharedString>,
    action_label: SharedString,
}

impl StatusToast {
    pub fn new(title: impl Into<SharedString>) -> Self {
        Self {
            title: title.into(),
            subtitle: None,
            project_name: None,
            action_label: "View Panel".into(),
        }
    }

    pub fn subtitle(mut self, subtitle: impl Into<SharedString>) -> Self {
        self.subtitle = Some(subtitle.into());
        self
    }

    pub fn project_name(mut self, name: impl Into<SharedString>) -> Self {
        self.project_name = Some(name.into());
        self
    }

    pub fn action_label(mut self, label: impl Into<SharedString>) -> Self {
        self.action_label = label.into();
        self
    }

    pub fn window_options(screen: Rc<dyn PlatformDisplay>, _cx: &App) -> WindowOptions {
        let size = Size {
            width: NOTIFICATION_WIDTH,
            height: NOTIFICATION_HEIGHT,
        };

        let bounds = Bounds {
            origin: screen.bounds().top_right()
                - point(size.width + NOTIFICATION_MARGIN_X, NOTIFICATION_MARGIN_Y),
            size,
        };

        WindowOptions {
            window_bounds: Some(WindowBounds::Windowed(bounds)),
            titlebar: None,
            focus: false,
            show: true,
            kind: WindowKind::PopUp,
            is_movable: false,
            display_id: Some(screen.id()),
            window_background: WindowBackgroundAppearance::Transparent,
            window_decorations: Some(WindowDecorations::Client),
            ..Default::default()
        }
    }
}

impl EventEmitter<NotificationEvent> for StatusToast {}

impl Render for StatusToast {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let bg = rgb(0x1e1e1e);
        let border = rgb(0x3d3d3d);
        let text_primary = rgb(0xe8e8e8);
        let text_muted = rgb(0x8b8b8b);
        let accent = rgb(0x0a84ff);
        let accent_hover = rgb(0x409cff);

        div()
            .id("agent-notification")
            .size_full()
            .p_3()
            .gap_4()
            .flex()
            .flex_row()
            .justify_between()
            .bg(bg)
            .border_1()
            .border_color(border)
            .rounded_xl()
            .shadow_lg()
            .child(
                div()
                    .flex()
                    .flex_row()
                    .items_start()
                    .gap_2()
                    .flex_1()
                    .child(
                        div()
                            .h(px(20.))
                            .flex()
                            .items_center()
                            .justify_center()
                            .child(div().text_color(text_muted).text_size(px(14.)).child("✦")),
                    )
                    .child(
                        div()
                            .flex()
                            .flex_col()
                            .flex_1()
                            .overflow_hidden()
                            .child(
                                div()
                                    .text_size(px(14.))
                                    .text_color(text_primary)
                                    .truncate()
                                    .child(self.title.clone()),
                            )
                            .child(
                                div()
                                    .flex()
                                    .flex_row()
                                    .gap_1p5()
                                    .text_size(px(12.))
                                    .text_color(text_muted)
                                    .truncate()
                                    .when_some(self.project_name.clone(), |el, name| {
                                        el.child(
                                            div()
                                                .flex()
                                                .flex_row()
                                                .gap_1p5()
                                                .items_center()
                                                .child(div().max_w_16().truncate().child(name))
                                                .child(
                                                    div()
                                                        .size(px(3.))
                                                        .rounded_full()
                                                        .bg(rgb(0x5a5a5a)),
                                                ),
                                        )
                                    })
                                    .when_some(self.subtitle.clone(), |el, sub| el.child(sub)),
                            ),
                    ),
            )
            .child(
                div()
                    .flex()
                    .flex_col()
                    .gap_1()
                    .child(
                        div()
                            .id("open")
                            .px_3()
                            .py_1()
                            .bg(accent)
                            .hover(|s| s.bg(accent_hover))
                            .rounded_md()
                            .cursor_pointer()
                            .text_color(rgb(0xffffff))
                            .text_size(px(13.))
                            .font_weight(FontWeight::MEDIUM)
                            .child(self.action_label.clone())
                            .on_click(cx.listener(|_, _, _, cx| {
                                cx.emit(NotificationEvent::Accepted);
                            })),
                    )
                    .child(
                        div()
                            .id("dismiss")
                            .px_3()
                            .py_0p5()
                            .hover(|s| s.bg(rgb(0x333333)))
                            .rounded_md()
                            .cursor_pointer()
                            .text_color(text_muted)
                            .text_size(px(13.))
                            .text_center()
                            .child("Dismiss")
                            .on_click(cx.listener(|_, _, _, cx| {
                                cx.emit(NotificationEvent::Dismissed);
                            })),
                    ),
            )
    }
}

#[cfg(test)]
mod tests {
    use super::StatusToast;

    #[test]
    fn test_toast_builder() {
        let toast = StatusToast::new("Test Title")
            .subtitle("Test subtitle")
            .project_name("hyprnote")
            .action_label("View Panel");

        assert_eq!(toast.title.as_ref(), "Test Title");
        assert_eq!(
            toast.subtitle.as_ref().map(|s| s.as_ref()),
            Some("Test subtitle")
        );
        assert_eq!(
            toast.project_name.as_ref().map(|s| s.as_ref()),
            Some("hyprnote")
        );
        assert_eq!(toast.action_label.as_ref(), "View Panel");
    }
}
