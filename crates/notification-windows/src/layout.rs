#![cfg_attr(not(target_os = "windows"), allow(dead_code))]

use anlg_notification_interface::{Notification, PrimaryAction};

pub const NOTIFICATION_WIDTH: i32 = 360;
pub const COMPACT_HEIGHT: i32 = 64;
pub const COMPACT_FOOTER_HEIGHT: i32 = 28;
pub const EXPANDED_HEIGHT: i32 = 380;
pub const RIGHT_MARGIN: i32 = 24;
pub const TOP_MARGIN: i32 = 15;
pub const NOTIFICATION_SPACING: i32 = 10;
pub const MAX_NOTIFICATIONS: usize = 5;
pub const CLOSE_BUTTON_SIZE: i32 = 22;
pub const ICON_SIZE: i32 = 28;
pub const ACTION_BUTTON_WIDTH: i32 = 120;
pub const ACTION_BUTTON_HEIGHT: i32 = 28;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub width: i32,
    pub height: i32,
}

impl Rect {
    pub fn contains(self, x: i32, y: i32) -> bool {
        x >= self.x && y >= self.y && x < self.x + self.width && y < self.y + self.height
    }

    pub fn right(self) -> i32 {
        self.x + self.width
    }

    pub fn bottom(self) -> i32 {
        self.y + self.height
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum HitTarget {
    Close,
    Action,
    Options,
    Footer,
    Collapse,
    Body,
}

#[derive(Debug, Clone)]
pub struct NotificationLayout {
    pub dpi: u32,
    pub width: i32,
    pub height: i32,
    pub close: Rect,
    pub icon: Option<Rect>,
    pub title: Rect,
    pub message: Rect,
    pub action: Option<Rect>,
    pub footer_action: Option<Rect>,
    pub collapse: Option<Rect>,
    pub progress: Option<Rect>,
}

impl NotificationLayout {
    pub fn compact(notification: &Notification) -> Self {
        let has_footer = notification.footer.is_some();
        let height = if has_footer {
            COMPACT_HEIGHT + COMPACT_FOOTER_HEIGHT
        } else {
            COMPACT_HEIGHT
        };
        let has_icon = !matches!(
            notification.icon,
            Some(anlg_notification_interface::NotificationIcon::Hidden)
        );
        let icon = has_icon.then_some(Rect {
            x: 12,
            y: (COMPACT_HEIGHT - ICON_SIZE) / 2,
            width: ICON_SIZE,
            height: ICON_SIZE,
        });
        let text_x = if has_icon { 48 } else { 12 };
        let action = match notification.primary_action() {
            PrimaryAction::Accept { .. } | PrimaryAction::Options(_) => Some(Rect {
                x: NOTIFICATION_WIDTH - ACTION_BUTTON_WIDTH - 12,
                y: (COMPACT_HEIGHT - ACTION_BUTTON_HEIGHT) / 2,
                width: ACTION_BUTTON_WIDTH,
                height: ACTION_BUTTON_HEIGHT,
            }),
        };
        let text_right = action
            .map(|rect| rect.x - 8)
            .unwrap_or(NOTIFICATION_WIDTH - 12);
        let text_width = (text_right - text_x).max(48);

        Self {
            dpi: 96,
            width: NOTIFICATION_WIDTH,
            height,
            close: Rect {
                x: 6,
                y: 6,
                width: CLOSE_BUTTON_SIZE,
                height: CLOSE_BUTTON_SIZE,
            },
            icon,
            title: Rect {
                x: text_x,
                y: 12,
                width: text_width,
                height: 18,
            },
            message: Rect {
                x: text_x,
                y: 32,
                width: text_width,
                height: 16,
            },
            action,
            footer_action: has_footer.then_some(Rect {
                x: NOTIFICATION_WIDTH - 72,
                y: COMPACT_HEIGHT + 4,
                width: 60,
                height: 20,
            }),
            collapse: None,
            progress: notification
                .timeout
                .filter(|timeout| !timeout.is_zero())
                .map(|_| Rect {
                    x: 12,
                    y: height - 5,
                    width: NOTIFICATION_WIDTH - 24,
                    height: 3,
                }),
        }
    }

    pub fn expanded(_notification: &Notification) -> Self {
        Self {
            dpi: 96,
            width: NOTIFICATION_WIDTH,
            height: EXPANDED_HEIGHT,
            close: Rect {
                x: 6,
                y: 6,
                width: CLOSE_BUTTON_SIZE,
                height: CLOSE_BUTTON_SIZE,
            },
            icon: None,
            title: Rect {
                x: 16,
                y: 14,
                width: NOTIFICATION_WIDTH - 120,
                height: 22,
            },
            message: Rect {
                x: 16,
                y: 48,
                width: NOTIFICATION_WIDTH - 32,
                height: 240,
            },
            action: Some(Rect {
                x: 16,
                y: EXPANDED_HEIGHT - 72,
                width: NOTIFICATION_WIDTH - 32,
                height: 36,
            }),
            footer_action: None,
            collapse: Some(Rect {
                x: NOTIFICATION_WIDTH - 96,
                y: 14,
                width: 80,
                height: 24,
            }),
            progress: None,
        }
    }

    pub fn for_state(notification: &Notification, expanded: bool) -> Self {
        if expanded {
            Self::expanded(notification)
        } else {
            Self::compact(notification)
        }
    }

    pub fn at_dpi(mut self, dpi: u32) -> Self {
        self.dpi = dpi.max(96);
        self.width = self.scale(self.width);
        self.height = self.scale(self.height);
        self.close = self.scale_rect(self.close);
        self.icon = self.icon.map(|rect| self.scale_rect(rect));
        self.title = self.scale_rect(self.title);
        self.message = self.scale_rect(self.message);
        self.action = self.action.map(|rect| self.scale_rect(rect));
        self.footer_action = self.footer_action.map(|rect| self.scale_rect(rect));
        self.collapse = self.collapse.map(|rect| self.scale_rect(rect));
        self.progress = self.progress.map(|rect| self.scale_rect(rect));
        self
    }

    pub fn scale(&self, value: i32) -> i32 {
        ((i64::from(value) * i64::from(self.dpi) + 48) / 96) as i32
    }

    fn scale_rect(&self, rect: Rect) -> Rect {
        let x = self.scale(rect.x);
        let y = self.scale(rect.y);
        Rect {
            x,
            y,
            width: self.scale(rect.right()) - x,
            height: self.scale(rect.bottom()) - y,
        }
    }

    pub fn hit_test(&self, x: i32, y: i32) -> HitTarget {
        if self.close.contains(x, y) {
            return HitTarget::Close;
        }
        if self.collapse.is_some_and(|rect| rect.contains(x, y)) {
            return HitTarget::Collapse;
        }
        if self.action.is_some_and(|rect| rect.contains(x, y)) {
            return HitTarget::Action;
        }
        if self.footer_action.is_some_and(|rect| rect.contains(x, y)) {
            return HitTarget::Footer;
        }
        HitTarget::Body
    }

    pub fn action_hit(&self, notification: &Notification, x: i32, y: i32) -> HitTarget {
        match self.hit_test(x, y) {
            HitTarget::Action
                if notification.has_action_menu()
                    && self.collapse.is_none()
                    && self
                        .action
                        .is_some_and(|rect| x >= rect.right() - self.scale(28)) =>
            {
                HitTarget::Options
            }
            HitTarget::Action if notification.has_options() && self.collapse.is_none() => {
                HitTarget::Options
            }
            target => target,
        }
    }
}

pub fn try_expand(
    layouts: &mut [NotificationLayout],
    index: usize,
    notification: &Notification,
    work_height: i32,
) -> bool {
    let mut expanded = layouts.to_vec();
    expanded[index] = NotificationLayout::expanded(notification).at_dpi(layouts[index].dpi);
    if fit_stack(&mut expanded, work_height) != 0 {
        return false;
    }
    layouts.clone_from_slice(&expanded);
    true
}

pub fn fit_stack(layouts: &mut [NotificationLayout], work_height: i32) -> usize {
    let minimum_height = |layout: &NotificationLayout| {
        if layout.collapse.is_some() {
            // Keep one body line above the bottom action when space is limited.
            layout.scale(148)
        } else {
            layout.height
        }
    };
    let mut first = 0;
    while first < layouts.len() {
        let visible = &layouts[first..];
        let margin = visible
            .iter()
            .map(|layout| layout.scale(TOP_MARGIN))
            .max()
            .unwrap_or(0);
        let spacing = visible
            .iter()
            .map(|layout| layout.scale(NOTIFICATION_SPACING))
            .max()
            .unwrap_or(0);
        let minimum = visible.iter().map(minimum_height).sum::<i32>()
            + spacing * (visible.len() as i32 - 1)
            + margin;
        if minimum <= work_height {
            let expanded_count = visible
                .iter()
                .filter(|layout| layout.collapse.is_some())
                .count() as i32;
            let extra = (work_height - minimum) / expanded_count.max(1);
            for layout in &mut layouts[first..] {
                if layout.collapse.is_some() {
                    layout.height = layout.height.min(minimum_height(layout) + extra);
                    let action_y = layout.height - layout.scale(72);
                    if let Some(action) = &mut layout.action {
                        action.y = action_y;
                    }
                    layout.message.height = layout
                        .message
                        .height
                        .min(layout.height - layout.scale(84) - layout.message.y);
                }
            }
            return first;
        }
        first += 1;
    }
    first
}

pub fn stacked_origin(
    work_x: i32,
    work_y: i32,
    work_width: i32,
    occupied: i32,
    layout: &NotificationLayout,
) -> (i32, i32) {
    (
        work_x + work_width - layout.width - layout.scale(RIGHT_MARGIN),
        work_y + layout.scale(TOP_MARGIN) + occupied,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use anlg_notification_interface::{EventDetails, NotificationAction, NotificationSource};
    use std::time::Duration;

    fn compact_notification() -> Notification {
        Notification::builder()
            .title("Upcoming event")
            .message("Starting soon")
            .timeout(Duration::from_secs(8))
            .build()
    }

    #[test]
    fn compact_layout_keeps_actions_and_progress_in_bounds() {
        let notification = compact_notification();
        let layout = NotificationLayout::compact(&notification);
        assert_eq!(layout.height, COMPACT_HEIGHT);
        assert!(layout.close.contains(10, 10));
        assert_eq!(layout.hit_test(10, 10), HitTarget::Close);
        assert_eq!(
            layout.action_hit(
                &notification,
                layout.action.unwrap().x + 4,
                layout.action.unwrap().y + 4
            ),
            HitTarget::Action
        );
        assert!(layout.progress.is_some());
    }

    #[test]
    fn options_map_the_primary_button_to_the_options_hit_target() {
        let notification = Notification::builder()
            .title("Choose a meeting")
            .message("")
            .options(vec!["Design sync".to_string()])
            .build();
        let layout = NotificationLayout::compact(&notification);
        let action = layout.action.unwrap();
        assert_eq!(
            layout.action_hit(&notification, action.x + 2, action.y + 2),
            HitTarget::Options
        );
    }

    #[test]
    fn action_menu_only_maps_the_caret_to_options() {
        let notification = Notification::builder()
            .title("Design sync")
            .message("")
            .action(NotificationAction::JoinAndRecord)
            .action_menu("Open meeting", NotificationAction::OpenMeeting)
            .build();
        let layout = NotificationLayout::compact(&notification);
        let action = layout.action.unwrap();

        assert_eq!(
            layout.action_hit(&notification, action.x + 2, action.y + 2),
            HitTarget::Action
        );
        assert_eq!(
            layout.action_hit(&notification, action.right() - 2, action.y + 2),
            HitTarget::Options
        );
    }

    #[test]
    fn hidpi_notifications_keep_text_and_click_targets_inside_the_scaled_window() {
        let notification = Notification::builder()
            .title("Design sync")
            .message("Starting soon")
            .action(NotificationAction::JoinAndRecord)
            .action_menu("Open meeting", NotificationAction::OpenMeeting)
            .build();

        let layout = NotificationLayout::compact(&notification).at_dpi(192);
        assert_eq!((layout.width, layout.height), (720, 128));
        assert!(layout.title.height >= 28);
        assert!(layout.message.height >= 22);
        assert_eq!(layout.action_hit(&notification, 480, 60), HitTarget::Action);
        assert_eq!(
            layout.action_hit(&notification, 640, 60),
            HitTarget::Options
        );
    }

    #[test]
    fn expanded_hidpi_stack_keeps_every_action_on_a_short_work_area() {
        let notification = compact_notification();
        let mut layouts = vec![NotificationLayout::expanded(&notification).at_dpi(192)];
        layouts.extend((0..4).map(|_| NotificationLayout::compact(&notification).at_dpi(192)));
        assert_eq!(fit_stack(&mut layouts, 1080), 0);
        let mut occupied = 0;
        for layout in &layouts {
            let (_, y) = stacked_origin(0, 0, 1920, occupied, layout);
            assert!(y + layout.height <= 1080);
            for control in [Some(layout.close), layout.collapse, layout.action]
                .into_iter()
                .flatten()
            {
                assert!(control.y >= 0 && control.bottom() <= layout.height);
            }
            if layout.collapse.is_some() {
                assert!(layout.message.bottom() <= layout.action.unwrap().y);
            }
            occupied += layout.height + layout.scale(NOTIFICATION_SPACING);
        }
        assert!(layouts[0].message.height > 0);
        assert!(fit_stack(&mut layouts, 500) > 0);
    }

    #[test]
    fn refusing_expansion_keeps_the_clicked_oldest_notification_visible() {
        let notification = compact_notification();
        let mut layouts = vec![NotificationLayout::compact(&notification).at_dpi(192); 4];
        assert!(!try_expand(&mut layouts, 0, &notification, 720));
        assert_eq!(layouts[0].height, 128);
        assert!(layouts[0].collapse.is_none());
        assert_eq!(fit_stack(&mut layouts, 720), 0);
    }

    #[test]
    fn fitting_compact_notifications_do_not_require_an_unused_bottom_margin() {
        let notification = compact_notification();
        let mut layouts = vec![NotificationLayout::compact(&notification).at_dpi(192); 5];
        assert_eq!(fit_stack(&mut layouts, 768), 0);
        let last = layouts.last().unwrap();
        let (_, y) = stacked_origin(0, 0, 1920, 4 * (128 + 20), last);
        assert_eq!(y + last.height, 750);
    }

    #[test]
    fn fractional_dpi_rounds_the_progress_bottom_and_adjacent_hit_boundary_consistently() {
        let notification = compact_notification();
        let layout = NotificationLayout::compact(&notification).at_dpi(144);
        let progress = layout.progress.unwrap();
        assert_eq!(progress.y, 89);
        assert_eq!(progress.bottom(), 93);
        assert_eq!(progress.height, 4);
        let action = layout.action.unwrap();
        assert_eq!(
            layout.hit_test(action.right() - 1, action.y),
            HitTarget::Action
        );
        assert_eq!(layout.hit_test(action.right(), action.y), HitTarget::Body);
    }

    #[test]
    fn expanded_layout_exposes_collapse_and_accept_targets() {
        let notification = Notification::builder()
            .title("Design sync")
            .message("")
            .source(NotificationSource::Session {
                session_id: "sess".to_string(),
            })
            .event_details(EventDetails {
                what: "Design sync".to_string(),
                timezone: None,
                location: None,
            })
            .build();
        let layout = NotificationLayout::expanded(&notification);
        assert_eq!(layout.height, EXPANDED_HEIGHT);
        assert_eq!(
            layout.hit_test(layout.collapse.unwrap().x + 1, 16),
            HitTarget::Collapse
        );
        assert_eq!(
            layout.hit_test(layout.action.unwrap().x + 8, layout.action.unwrap().y + 8),
            HitTarget::Action
        );
    }
}
