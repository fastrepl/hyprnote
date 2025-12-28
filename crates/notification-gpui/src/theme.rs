use gpui::{Hsla, hsla};

#[derive(Clone, Copy, Default, PartialEq)]
pub enum NotificationTheme {
    #[default]
    System,
    Light,
    Dark,
}

pub struct NotificationColors {
    pub bg: Hsla,
    pub text_primary: Hsla,
    pub text_secondary: Hsla,
    pub border_color: Hsla,
    pub close_button_bg: Hsla,
    pub close_button_bg_hover: Hsla,
    pub action_button_bg: Hsla,
    pub action_button_bg_hover: Hsla,
    pub action_button_border: Hsla,
    pub action_button_text: Hsla,
}

impl NotificationTheme {
    pub fn is_light(&self) -> bool {
        match self {
            NotificationTheme::System | NotificationTheme::Light => true,
            NotificationTheme::Dark => false,
        }
    }

    pub fn colors(&self) -> NotificationColors {
        let is_light = self.is_light();

        let (bg, text_primary, text_secondary, border_color) = if is_light {
            (
                hsla(0., 0., 0.85, 0.95),
                hsla(0., 0., 0., 1.),
                hsla(0., 0., 0., 0.55),
                hsla(0., 0., 1., 0.10),
            )
        } else {
            (
                hsla(0., 0., 0.24, 0.95),
                hsla(0., 0., 1., 1.),
                hsla(0., 0., 1., 0.6),
                hsla(0., 0., 1., 0.10),
            )
        };

        NotificationColors {
            bg,
            text_primary,
            text_secondary,
            border_color,
            close_button_bg: hsla(0., 0., 0., 0.5),
            close_button_bg_hover: hsla(0., 0., 0., 0.6),
            action_button_bg: hsla(0., 0., 0.95, 0.9),
            action_button_bg_hover: hsla(0., 0., 0.90, 0.9),
            action_button_border: hsla(0., 0., 0.7, 0.5),
            action_button_text: hsla(0., 0., 0.1, 1.),
        }
    }
}
