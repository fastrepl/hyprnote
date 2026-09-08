//! Radix `Tooltip` as the app styles it (`@anlg/ui`'s `TooltipContent`):
//! `rounded-md px-3 py-1.5 text-xs border border-neutral-200/50 bg-white/80
//! text-neutral-700 shadow-lg`, `sideOffset` 4, centred on the trigger's
//! side and shifted to stay inside the window, opening after the
//! `TooltipProvider`'s 700ms (or the trigger's own `delayDuration`) with the
//! provider's 300ms `skipDelayDuration` between triggers, and closing on
//! leave or any press.

use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;
use std::time::{Duration, Instant};

use gpui::{
    AnyElement, Bounds, Context, Div, Pixels, SharedString, Stateful, Window, div, prelude::*, px,
};

use super::Workspace;
use crate::theme::{alpha, over};
use crate::ui::TailwindText as _;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum Side {
    Top,
    Bottom,
    Right,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub(crate) enum Body {
    /// Plain text, wrapped under `max_width` when set.
    Text(SharedString),
    /// `flex items-center gap-2`: the label and a `Kbd` chip.
    TextKbd {
        text: SharedString,
        kbd: SharedString,
    },
    /// `flex flex-col gap-0.5` of `• reason` lines.
    Lines(Vec<SharedString>),
}

#[derive(Debug, Clone, PartialEq)]
pub(crate) struct TooltipSpec {
    pub id: SharedString,
    pub body: Body,
    pub side: Side,
    /// `delayDuration` in milliseconds (the provider's 700 by default).
    pub delay_ms: u64,
    /// `max-w-64` and the like.
    pub max_width: Option<f32>,
    /// `rounded-md` (6) unless a class overrides it.
    pub radius: f32,
}

impl TooltipSpec {
    pub fn text(id: impl Into<SharedString>, text: impl Into<SharedString>, side: Side) -> Self {
        Self {
            id: id.into(),
            body: Body::Text(text.into()),
            side,
            delay_ms: DEFAULT_DELAY_MS,
            max_width: None,
            radius: 6.0,
        }
    }

    pub fn kbd(
        id: impl Into<SharedString>,
        text: impl Into<SharedString>,
        kbd: impl Into<SharedString>,
        side: Side,
    ) -> Self {
        Self {
            id: id.into(),
            body: Body::TextKbd {
                text: text.into(),
                kbd: kbd.into(),
            },
            side,
            delay_ms: DEFAULT_DELAY_MS,
            max_width: None,
            radius: 6.0,
        }
    }

    pub fn lines(id: impl Into<SharedString>, lines: Vec<String>, side: Side) -> Self {
        Self {
            id: id.into(),
            body: Body::Lines(lines.into_iter().map(SharedString::from).collect()),
            side,
            delay_ms: DEFAULT_DELAY_MS,
            max_width: None,
            radius: 6.0,
        }
    }

    pub fn delay(mut self, delay_ms: u64) -> Self {
        self.delay_ms = delay_ms;
        self
    }

    pub fn max_width(mut self, width: f32) -> Self {
        self.max_width = Some(width);
        self
    }
}

/// `TooltipProvider`'s `delayDuration`.
pub(crate) const DEFAULT_DELAY_MS: u64 = 700;
/// `TooltipProvider`'s `skipDelayDuration`.
const SKIP_DELAY: Duration = Duration::from_millis(300);
/// `sideOffset`
const SIDE_OFFSET: f32 = 4.0;

pub(crate) struct TooltipState {
    spec: TooltipSpec,
    shown: bool,
    generation: u64,
}

/// The triggers' last painted bounds by id, written during prepaint and read
/// when the open tooltip is placed.
pub(crate) type TriggerBounds = Rc<RefCell<HashMap<SharedString, Bounds<Pixels>>>>;

impl Workspace {
    /// Wraps a trigger so hovering it opens `spec` after its delay.
    pub(crate) fn tooltip_trigger(
        &self,
        spec: TooltipSpec,
        trigger: impl IntoElement,
        cx: &Context<Self>,
    ) -> Stateful<Div> {
        let id = spec.id.clone();
        let bounds_id = id.clone();
        let bounds = self.tooltip_bounds.clone();
        div()
            .flex()
            .on_children_prepainted(move |children, _, _| {
                if let Some(first) = children.first() {
                    bounds.borrow_mut().insert(bounds_id.clone(), *first);
                }
            })
            .id(SharedString::from(format!("{id}-tooltip-trigger")))
            .on_hover(cx.listener(move |this, hovering: &bool, _, cx| {
                if *hovering {
                    this.open_tooltip(spec.clone(), cx);
                } else {
                    this.close_tooltip(&id, cx);
                }
            }))
            .child(trigger)
    }

    /// `tooltip_trigger` when `enabled`, the bare trigger otherwise (a
    /// disabled `IconButton` renders without its tooltip).
    pub(crate) fn tooltip_trigger_if(
        &self,
        enabled: bool,
        spec: TooltipSpec,
        trigger: impl IntoElement,
        cx: &Context<Self>,
    ) -> Stateful<Div> {
        if enabled {
            self.tooltip_trigger(spec, trigger, cx)
        } else {
            div()
                .id(SharedString::from(format!("{}-tooltip-trigger", spec.id)))
                .flex()
                .child(trigger)
        }
    }

    fn open_tooltip(&mut self, spec: TooltipSpec, cx: &mut Context<Self>) {
        if self
            .tooltip
            .as_ref()
            .is_some_and(|state| state.spec.id == spec.id)
        {
            return;
        }
        // Radix skips the delay while another tooltip closed moments ago.
        let skip = self
            .tooltip_closed_at
            .is_some_and(|at| at.elapsed() < SKIP_DELAY);
        let generation = self.tooltip_generation.wrapping_add(1);
        self.tooltip_generation = generation;
        let delay = if skip {
            Duration::ZERO
        } else {
            Duration::from_millis(spec.delay_ms)
        };
        self.tooltip = Some(TooltipState {
            spec,
            shown: delay.is_zero(),
            generation,
        });
        cx.notify();
        if delay.is_zero() {
            return;
        }
        cx.spawn(async move |this, cx| {
            cx.background_executor().timer(delay).await;
            this.update(cx, |this, cx| {
                if let Some(state) = this.tooltip.as_mut()
                    && state.generation == generation
                    && !state.shown
                {
                    state.shown = true;
                    cx.notify();
                }
            })
            .ok();
        })
        .detach();
    }

    fn close_tooltip(&mut self, id: &SharedString, cx: &mut Context<Self>) {
        if let Some(state) = self.tooltip.as_ref()
            && state.spec.id == *id
        {
            self.tooltip_closed_at = state.shown.then(Instant::now);
            self.tooltip = None;
            cx.notify();
        }
    }

    /// Radix closes the open tooltip on any pointer down.
    pub(crate) fn dismiss_tooltip(&mut self, cx: &mut Context<Self>) {
        if let Some(state) = self.tooltip.take() {
            self.tooltip_closed_at = state.shown.then(Instant::now);
            cx.notify();
        }
    }

    fn measure_in(&self, text: &str, size: Pixels, mono: bool, window: &Window) -> f32 {
        let mut style = window.text_style();
        style.font_size = size.into();
        let family = if mono {
            self.mono_font_family.clone()
        } else {
            self.font_family.clone()
        };
        if let Some(family) = family {
            style.font_family = family;
        }
        let run = style.to_run(text.len());
        f32::from(
            window
                .text_system()
                .shape_line(SharedString::from(text.to_string()), size, &[run], None)
                .width,
        )
    }

    /// Greedy word wrap of `text` at 12px inside `max_width`, like the
    /// tooltip's block layout; returns the lines and the widest one.
    fn wrap_tooltip_text(&self, text: &str, max_width: f32, window: &Window) -> (Vec<String>, f32) {
        let mut lines: Vec<String> = Vec::new();
        let mut current = String::new();
        for word in text.split_whitespace() {
            let candidate = if current.is_empty() {
                word.to_string()
            } else {
                format!("{current} {word}")
            };
            if !current.is_empty()
                && self.measure_in(&candidate, px(12.0), false, window) > max_width
            {
                lines.push(std::mem::take(&mut current));
                current = word.to_string();
            } else {
                current = candidate;
            }
        }
        if !current.is_empty() {
            lines.push(current);
        }
        let widest = lines
            .iter()
            .map(|line| self.measure_in(line, px(12.0), false, window))
            .fold(0.0_f32, f32::max);
        (lines, widest)
    }

    /// The open tooltip, placed against its trigger's painted bounds.
    pub(crate) fn render_tooltip(&self, window: &Window) -> Option<AnyElement> {
        let state = self.tooltip.as_ref().filter(|state| state.shown)?;
        let spec = &state.spec;
        let anchor = *self.tooltip_bounds.borrow().get(&spec.id)?;
        let theme = self.theme;

        // `px-3 py-1.5` inside a 1px border; `text-xs` lines are 16px.
        let content_max = spec.max_width.map(|width| width - 26.0);
        let (content_width, content_height, body): (f32, f32, AnyElement) =
            match &spec.body {
                Body::Text(text) => {
                    let natural = self.measure_in(text, px(12.0), false, window);
                    match content_max.filter(|max| natural > *max) {
                        Some(max) => {
                            // A wrapping block fills `max-w-*`, whatever its lines measure.
                            let (lines, _) = self.wrap_tooltip_text(text, max, window);
                            let count = lines.len() as f32;
                            (
                                max,
                                16.0 * count,
                                div()
                                    .flex()
                                    .flex_col()
                                    .children(lines.into_iter().map(|line| {
                                        div().h(px(16.0)).child(SharedString::from(line))
                                    }))
                                    .into_any_element(),
                            )
                        }
                        None => (natural, 16.0, div().child(text.clone()).into_any_element()),
                    }
                }
                Body::TextKbd { text, kbd } => {
                    let text_width = self.measure_in(text, px(12.0), false, window);
                    let kbd_width = (self.measure_in(kbd, px(12.0), true, window) + 10.0).max(20.0);
                    (
                        text_width + 8.0 + kbd_width,
                        20.0,
                        div()
                            .flex()
                            .items_center()
                            .gap_2()
                            .child(text.clone())
                            .child(crate::ui::kbd(
                                theme,
                                self.mono_font_family.clone(),
                                kbd.clone(),
                                false,
                            ))
                            .into_any_element(),
                    )
                }
                Body::Lines(lines) => {
                    let widest = lines
                        .iter()
                        .map(|line| self.measure_in(line, px(12.0), false, window))
                        .fold(0.0_f32, f32::max);
                    let count = lines.len() as f32;
                    (
                        widest,
                        16.0 * count + 2.0 * (count - 1.0).max(0.0),
                        div()
                            .flex()
                            .flex_col()
                            .gap(px(2.0))
                            .children(lines.iter().map(|line| div().child(line.clone())))
                            .into_any_element(),
                    )
                }
            };
        let width = (content_width + 26.0).ceil();
        let height = (content_height + 14.0).ceil();

        let viewport = window.viewport_size();
        let (viewport_w, viewport_h) = (f32::from(viewport.width), f32::from(viewport.height));
        let (ax, ay, aw, ah) = (
            f32::from(anchor.origin.x),
            f32::from(anchor.origin.y),
            f32::from(anchor.size.width),
            f32::from(anchor.size.height),
        );
        let (mut x, mut y) = match spec.side {
            Side::Top => (ax + (aw - width) / 2.0, ay - SIDE_OFFSET - height),
            Side::Bottom => (ax + (aw - width) / 2.0, ay + ah + SIDE_OFFSET),
            Side::Right => (ax + aw + SIDE_OFFSET, ay + (ah - height) / 2.0),
        };
        // `avoidCollisions`: flip to the other side when there is no room,
        // then shift along the other axis to stay inside the window.
        match spec.side {
            Side::Top if y < 0.0 => y = ay + ah + SIDE_OFFSET,
            Side::Bottom if y + height > viewport_h => y = ay - SIDE_OFFSET - height,
            Side::Right if x + width > viewport_w => x = ax - SIDE_OFFSET - width,
            _ => {}
        }
        x = x.clamp(0.0, (viewport_w - width).max(0.0)).round();
        y = y.clamp(0.0, (viewport_h - height).max(0.0)).round();

        // `bg-white/80` over the surface (no backdrop blur here) with the
        // `border-neutral-200/50` border on top of it.
        let fill = over(alpha(gpui::rgb(0xffffff), 0.8), theme.card);
        let border = over(alpha(gpui::rgb(0xe5e5e5), 0.5), fill);
        Some(
            gpui::deferred(
                div()
                    .id(SharedString::from(format!("{}-tooltip", spec.id)))
                    .absolute()
                    .left(px(x))
                    .top(px(y))
                    .w(px(width))
                    .h(px(height))
                    .flex()
                    .items_center()
                    .px_3()
                    .py(px(6.0))
                    .rounded(px(spec.radius))
                    .border_1()
                    .border_color(border)
                    .bg(fill)
                    .shadow_lg()
                    .tw_text_xs()
                    .text_color(gpui::rgb(0x404040))
                    .when_some(self.font_family.clone(), |tip, family| {
                        tip.font_family(family)
                    })
                    .child(body),
            )
            .with_priority(4)
            .into_any_element(),
        )
    }
}
