use std::rc::Rc;
use std::time::Instant;

use gpui::{prelude::*, *};

use crate::animation::{AnimationState, ease_out_quint};
use crate::constants::{
    ANIMATION_DURATION, NOTIFICATION_HEIGHT_COLLAPSED, NOTIFICATION_HEIGHT_EXPANDED,
    NOTIFICATION_MARGIN_X, NOTIFICATION_MARGIN_Y, NOTIFICATION_WIDTH,
};
use crate::event::NotificationEvent;

pub struct StatusToast {
    title: SharedString,
    subtitle: Option<SharedString>,
    project_name: Option<SharedString>,
    action_label: SharedString,
    expanded_content: Option<SharedString>,
    is_expanded: bool,
    animation: Option<AnimationState>,
}

impl StatusToast {
    pub fn new(title: impl Into<SharedString>) -> Self {
        Self {
            title: title.into(),
            subtitle: None,
            project_name: None,
            action_label: "View".into(),
            expanded_content: None,
            is_expanded: false,
            animation: None,
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

    pub fn expanded_content(mut self, content: impl Into<SharedString>) -> Self {
        self.expanded_content = Some(content.into());
        self
    }

    fn native_shadow() -> Vec<BoxShadow> {
        vec![
            BoxShadow {
                color: hsla(0., 0., 0., 0.35),
                offset: point(px(0.), px(8.)),
                blur_radius: px(24.),
                spread_radius: px(0.),
            },
            BoxShadow {
                color: hsla(0., 0., 0., 0.2),
                offset: point(px(0.), px(2.)),
                blur_radius: px(8.),
                spread_radius: px(0.),
            },
        ]
    }

    fn current_animated_height(&self) -> Pixels {
        if let Some(anim) = &self.animation {
            let elapsed = anim.start_time.elapsed().as_secs_f32();
            let duration = ANIMATION_DURATION.as_secs_f32();
            let progress = (elapsed / duration).min(1.0);
            let eased = ease_out_quint(progress);

            let from: f32 = anim.from_height.into();
            let to: f32 = anim.to_height.into();
            px(from + (to - from) * eased)
        } else if self.is_expanded {
            NOTIFICATION_HEIGHT_EXPANDED
        } else {
            NOTIFICATION_HEIGHT_COLLAPSED
        }
    }

    fn expanded_content_height(&self) -> Pixels {
        NOTIFICATION_HEIGHT_EXPANDED - NOTIFICATION_HEIGHT_COLLAPSED - px(24.)
    }

    fn current_content_clip_height(&self) -> Pixels {
        let current: f32 = self.current_animated_height().into();
        let base: f32 = NOTIFICATION_HEIGHT_COLLAPSED.into();
        px((current - base).max(0.0))
    }

    pub fn window_options(screen: Rc<dyn PlatformDisplay>, _cx: &App) -> WindowOptions {
        let size = Size {
            width: NOTIFICATION_WIDTH,
            height: NOTIFICATION_HEIGHT_COLLAPSED,
        };

        let screen_bounds = screen.bounds();
        let bounds = Bounds {
            origin: point(
                screen_bounds.origin.x + screen_bounds.size.width
                    - size.width
                    - NOTIFICATION_MARGIN_X,
                screen_bounds.origin.y + NOTIFICATION_MARGIN_Y,
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

    fn toggle_expanded(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        let from_height = self.current_animated_height();
        let to_height = if self.is_expanded {
            NOTIFICATION_HEIGHT_COLLAPSED
        } else {
            NOTIFICATION_HEIGHT_EXPANDED
        };

        self.is_expanded = !self.is_expanded;
        self.animation = Some(AnimationState {
            start_time: Instant::now(),
            from_height,
            to_height,
        });

        self.schedule_animation_frame(window, cx);
    }

    fn schedule_animation_frame(&self, window: &mut Window, cx: &mut Context<Self>) {
        cx.on_next_frame(window, |this, window, cx| {
            this.tick_animation(window, cx);
        });
    }

    fn tick_animation(&mut self, window: &mut Window, cx: &mut Context<Self>) {
        let Some(anim) = &self.animation else {
            return;
        };

        let elapsed = anim.start_time.elapsed();
        let is_done = elapsed >= ANIMATION_DURATION;

        let current_height = self.current_animated_height();
        window.resize(Size {
            width: NOTIFICATION_WIDTH,
            height: current_height,
        });

        if is_done {
            self.animation = None;
        } else {
            self.schedule_animation_frame(window, cx);
        }

        cx.notify();
    }
}

impl EventEmitter<NotificationEvent> for StatusToast {}

impl Render for StatusToast {
    fn render(&mut self, _window: &mut Window, cx: &mut Context<Self>) -> impl IntoElement {
        let bg = rgb(0x1e1e1e);
        let border = hsla(0., 0., 1., 0.1);
        let text_primary = rgb(0xf5f5f5);
        let text_secondary = rgb(0x999999);
        let accent = rgb(0x0a84ff);
        let accent_hover = rgb(0x409cff);

        let has_expandable_content = self.expanded_content.is_some();
        let is_expanded = self.is_expanded;
        let is_animating = self.animation.is_some();
        let content_clip_height = self.current_content_clip_height();

        div()
            .id("notification-container")
            .size_full()
            .bg(bg)
            .border_1()
            .border_color(border)
            .rounded_xl()
            .shadow(Self::native_shadow())
            .overflow_hidden()
            .flex()
            .flex_col()
            .child(
                div()
                    .flex_shrink_0()
                    .h(NOTIFICATION_HEIGHT_COLLAPSED)
                    .px_4()
                    .flex()
                    .flex_row()
                    .items_center()
                    .gap_3()
                    .child(
                        div()
                            .size(px(40.))
                            .rounded_lg()
                            .bg(accent)
                            .flex()
                            .items_center()
                            .justify_center()
                            .flex_shrink_0()
                            .child(
                                div()
                                    .text_color(white())
                                    .text_size(px(20.))
                                    .font_weight(FontWeight::BOLD)
                                    .child("✦"),
                            ),
                    )
                    .child(
                        div()
                            .flex()
                            .flex_col()
                            .gap_0p5()
                            .flex_1()
                            .min_w_0()
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
                                    .flex()
                                    .flex_row()
                                    .gap_1()
                                    .items_center()
                                    .text_size(px(12.))
                                    .text_color(text_secondary)
                                    .truncate()
                                    .when_some(self.project_name.clone(), |el, name| {
                                        el.child(div().truncate().child(name))
                                            .child(div().text_color(rgb(0x666666)).child("·"))
                                    })
                                    .when_some(self.subtitle.clone(), |el, sub| {
                                        el.child(div().flex_1().truncate().child(sub))
                                    }),
                            ),
                    )
                    .child(
                        div()
                            .flex()
                            .flex_row()
                            .gap_2()
                            .items_center()
                            .flex_shrink_0()
                            .child(
                                div()
                                    .id("action-button")
                                    .px_4()
                                    .py_1p5()
                                    .bg(accent)
                                    .hover(|s| s.bg(accent_hover))
                                    .rounded_lg()
                                    .cursor_pointer()
                                    .text_color(white())
                                    .text_size(px(13.))
                                    .font_weight(FontWeight::SEMIBOLD)
                                    .child(self.action_label.clone())
                                    .on_click(cx.listener(|this, _, window, cx| {
                                        if this.expanded_content.is_some() && !this.is_expanded {
                                            this.toggle_expanded(window, cx);
                                        } else {
                                            cx.emit(NotificationEvent::Accepted);
                                        }
                                    })),
                            )
                            .child(
                                div()
                                    .id("dismiss-button")
                                    .px_2()
                                    .py_1p5()
                                    .cursor_pointer()
                                    .text_color(text_secondary)
                                    .hover(|s| s.text_color(text_primary))
                                    .text_size(px(13.))
                                    .child("Dismiss")
                                    .on_click(cx.listener(|_, _, _, cx| {
                                        cx.emit(NotificationEvent::Dismissed);
                                    })),
                            ),
                    ),
            )
            .when(
                has_expandable_content && (is_expanded || is_animating),
                |el: Stateful<Div>| {
                    let full_content_height = self.expanded_content_height();

                    let content_opacity = if is_animating {
                        let clip: f32 = content_clip_height.into();
                        let full: f32 = full_content_height.into();
                        (clip / full).min(1.0)
                    } else {
                        1.0
                    };

                    el.child(
                        div()
                            .flex()
                            .flex_col()
                            .flex_1()
                            .overflow_hidden()
                            .child(
                                div()
                                    .id("expand-toggle")
                                    .w_full()
                                    .h(px(24.))
                                    .flex_shrink_0()
                                    .flex()
                                    .items_center()
                                    .justify_center()
                                    .cursor_pointer()
                                    .border_t_1()
                                    .border_color(hsla(0., 0., 1., 0.08))
                                    .hover(|s| s.bg(hsla(0., 0., 1., 0.05)))
                                    .on_click(cx.listener(|this, _, window, cx| {
                                        this.toggle_expanded(window, cx);
                                    }))
                                    .child(
                                        div()
                                            .text_size(px(11.))
                                            .text_color(text_secondary)
                                            .child("Show less ▲"),
                                    ),
                            )
                            .child(
                                div()
                                    .id("expanded-content-clip")
                                    .w_full()
                                    .overflow_hidden()
                                    .h(content_clip_height)
                                    .child(
                                        div()
                                            .id("expanded-content-inner")
                                            .w_full()
                                            .h(full_content_height)
                                            .px_4()
                                            .pb_4()
                                            .opacity(content_opacity)
                                            .child(
                                                self.render_expanded_content(text_secondary.into()),
                                            ),
                                    ),
                            ),
                    )
                },
            )
    }
}

impl StatusToast {
    fn render_expanded_content(&self, text_color: Hsla) -> impl IntoElement {
        let content = self.expanded_content.clone().unwrap_or_default();

        div()
            .id("expanded-content")
            .size_full()
            .p_2p5()
            .bg(hsla(0., 0., 1., 0.05))
            .rounded_lg()
            .text_size(px(12.))
            .text_color(text_color)
            .line_height(rems(1.5))
            .child(content)
    }
}
