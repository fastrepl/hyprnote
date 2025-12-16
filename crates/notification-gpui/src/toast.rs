use std::rc::Rc;

use gpui::{prelude::*, *};
use gpui_squircle::{SquircleStyled, squircle};

use crate::constants::{
    NOTIFICATION_CORNER_RADIUS, NOTIFICATION_HEIGHT, NOTIFICATION_MARGIN_RIGHT,
    NOTIFICATION_MARGIN_TOP, NOTIFICATION_WIDTH,
};
use crate::event::NotificationEvent;
use crate::theme::NotificationTheme;

pub struct StatusToast {
    title: SharedString,
    message: SharedString,
    action_label: Option<SharedString>,
    theme: NotificationTheme,
}

impl StatusToast {
    pub fn new(title: impl Into<SharedString>, message: impl Into<SharedString>) -> Self {
        Self {
            title: title.into(),
            message: message.into(),
            action_label: None,
            theme: NotificationTheme::default(),
        }
    }

    pub fn theme(mut self, theme: NotificationTheme) -> Self {
        self.theme = theme;
        self
    }

    pub fn action_label(mut self, label: impl Into<SharedString>) -> Self {
        self.action_label = Some(label.into());
        self
    }

    fn native_shadow() -> Vec<BoxShadow> {
        vec![BoxShadow {
            color: hsla(0., 0., 0., 0.22),
            offset: point(px(0.), px(2.)),
            blur_radius: px(12.),
            spread_radius: px(0.),
        }]
    }

    pub fn window_options(screen: Rc<dyn PlatformDisplay>, _cx: &App) -> WindowOptions {
        let size = Size {
            width: NOTIFICATION_WIDTH,
            height: NOTIFICATION_HEIGHT,
        };

        let screen_bounds = screen.bounds();
        let bounds = Bounds {
            origin: point(
                screen_bounds.origin.x + screen_bounds.size.width
                    - size.width
                    - NOTIFICATION_MARGIN_RIGHT,
                screen_bounds.origin.y + NOTIFICATION_MARGIN_TOP,
            ),
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
        let colors = self.theme.colors();
        let has_action = self.action_label.is_some();

        div()
            .id("notification-container")
            .group("toast")
            .size_full()
            .shadow(Self::native_shadow())
            .overflow_hidden()
            .relative()
            .child(
                squircle()
                    .absolute()
                    .inset_0()
                    .rounded(NOTIFICATION_CORNER_RADIUS)
                    .bg(colors.bg)
                    .border(px(0.5))
                    .border_color(colors.border_color),
            )
            .child(
                div()
                    .id("close-button")
                    .absolute()
                    .top(px(5.))
                    .left(px(4.))
                    .size(px(15.))
                    .rounded_full()
                    .bg(colors.close_button_bg)
                    .hover(|s| s.bg(colors.close_button_bg_hover))
                    .cursor_pointer()
                    .flex()
                    .items_center()
                    .justify_center()
                    .opacity(0.0)
                    .group_hover("toast", |s| s.opacity(1.0))
                    .child(
                        div()
                            .text_size(px(10.))
                            .font_weight(FontWeight::SEMIBOLD)
                            .text_color(white())
                            .child("×"),
                    )
                    .on_click(cx.listener(|_, _, _, cx| {
                        cx.emit(NotificationEvent::Dismissed);
                    })),
            )
            .child(
                div()
                    .size_full()
                    .px(px(12.))
                    .py(px(9.))
                    .flex()
                    .flex_row()
                    .items_center()
                    .gap(px(8.))
                    .child(self.render_icon())
                    .child(self.render_text_content(colors.text_primary, colors.text_secondary))
                    .when_some(self.action_label.clone(), |el, label| {
                        el.child(self.render_action_button(
                            label,
                            colors.action_button_bg,
                            colors.action_button_bg_hover,
                            colors.action_button_border,
                            colors.action_button_text,
                            cx,
                        ))
                    })
                    .when(!has_action, |el| el.pr(px(35.))),
            )
    }
}

impl StatusToast {
    fn render_icon(&self) -> impl IntoElement {
        div()
            .size(px(32.))
            .flex_shrink_0()
            .flex()
            .items_center()
            .justify_center()
            .child(
                div()
                    .size(px(24.))
                    .rounded(px(6.))
                    .bg(rgb(0x5AC8FA))
                    .flex()
                    .items_center()
                    .justify_center()
                    .child(
                        svg()
                            .path("icons/folder.svg")
                            .size(px(16.))
                            .text_color(white()),
                    ),
            )
    }

    fn render_text_content(&self, text_primary: Hsla, text_secondary: Hsla) -> impl IntoElement {
        div()
            .flex()
            .flex_col()
            .flex_1()
            .min_w_0()
            .gap(px(2.))
            .child(
                div()
                    .text_size(px(14.))
                    .font_weight(FontWeight::SEMIBOLD)
                    .text_color(text_primary)
                    .truncate()
                    .child(self.title.clone()),
            )
            .child(
                div()
                    .text_size(px(11.))
                    .text_color(text_secondary)
                    .truncate()
                    .child(self.message.clone()),
            )
    }

    fn render_action_button(
        &self,
        label: SharedString,
        bg: Hsla,
        bg_hover: Hsla,
        border: Hsla,
        text: Hsla,
        cx: &mut Context<Self>,
    ) -> impl IntoElement {
        div()
            .id("action-button")
            .flex_shrink_0()
            .px(px(11.))
            .py(px(6.))
            .bg(bg)
            .hover(|s| s.bg(bg_hover))
            .rounded(px(10.))
            .border_1()
            .border_color(border)
            .cursor_pointer()
            .child(
                div()
                    .text_size(px(14.))
                    .font_weight(FontWeight::SEMIBOLD)
                    .text_color(text)
                    .child(label),
            )
            .on_click(cx.listener(|_, _, _, cx| {
                cx.emit(NotificationEvent::Accepted);
            }))
    }
}
