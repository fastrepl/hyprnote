use std::time::Instant;

use gpui::Pixels;

pub(crate) fn ease_out_quint(t: f32) -> f32 {
    1.0 - (1.0 - t).powi(5)
}

pub(crate) struct AnimationState {
    pub start_time: Instant,
    pub from_height: Pixels,
    pub to_height: Pixels,
}
