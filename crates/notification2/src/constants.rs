use std::time::Duration;

use gpui::{Pixels, px};

pub(crate) const NOTIFICATION_WIDTH: Pixels = px(450.);
pub(crate) const NOTIFICATION_HEIGHT_COLLAPSED: Pixels = px(72.);
pub(crate) const NOTIFICATION_HEIGHT_EXPANDED: Pixels = px(500.);
pub(crate) const NOTIFICATION_MARGIN_X: Pixels = px(16.);
pub(crate) const NOTIFICATION_MARGIN_Y: Pixels = px(12.);

pub(crate) const ANIMATION_DURATION: Duration = Duration::from_millis(200);
