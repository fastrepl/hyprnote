use std::{
    collections::VecDeque,
    time::{Duration, Instant},
};

use ratatui::{
    layout::{Alignment, Constraint, Layout, Margin, Rect},
    style::{palette::tailwind, Modifier, Style},
    symbols,
    text::{Line, Span},
    widgets::{
        Block, BorderType, Borders, List, ListItem, Padding, Paragraph, Scrollbar,
        ScrollbarOrientation,
    },
    Frame,
};

use super::RunState;

pub fn calculate_rms(samples: &[f32]) -> f32 {
    if samples.is_empty() {
        return 0.0;
    }
    let sum: f32 = samples.iter().map(|&s| s * s).sum();
    (sum / samples.len() as f32).sqrt()
}

#[derive(Clone)]
pub struct AmplitudeData {
    current: f32,
    history: VecDeque<f32>,
    peak: f32,
    peak_hold_time: Option<Instant>,
    running_max: f32,
}

impl AmplitudeData {
    pub fn new() -> Self {
        Self {
            current: 0.0,
            history: VecDeque::from(vec![0.0; 60]),
            peak: 0.0,
            peak_hold_time: None,
            running_max: 1e-3,
        }
    }

    pub fn update(&mut self, amplitude: f32) {
        // Smooth updates to avoid flicker but remain responsive
        self.current = self.current * 0.7 + amplitude * 0.3;

        // Apply gentle decay to history so recent max falls back over time
        for v in self.history.iter_mut() {
            *v *= 0.98; // ~1% decay per update frame
        }

        // Exponentially decaying running max for stable normalization
        self.running_max *= 0.98;
        if self.current > self.running_max {
            self.running_max = self.current;
        }

        if self.history.len() >= 60 {
            self.history.pop_front();
        }
        self.history.push_back(self.current);

        if amplitude > self.peak {
            self.peak = amplitude;
            self.peak_hold_time = Some(Instant::now());
        } else if let Some(hold_time) = self.peak_hold_time {
            if hold_time.elapsed() > Duration::from_secs(2) {
                self.peak = amplitude;
                self.peak_hold_time = None;
            }
        }
    }

    fn get_normalized_level(&self) -> u16 {
        let denom = self.running_max.max(1e-6);
        let norm = (self.current / denom).clamp(0.0, 1.0);
        (norm * 100.0) as u16
    }
}

pub fn draw_ui(frame: &mut Frame, state: &mut RunState, amplitude_data: &AmplitudeData) {
    let chunks = Layout::vertical([
        Constraint::Length(3),
        Constraint::Min(8),
        Constraint::Length(2),
    ])
    .split(frame.area());

    draw_header(frame, chunks[0], state, amplitude_data);
    draw_transcripts(frame, chunks[1], state);
    draw_help(frame, chunks[2], state);

    if state.show_device_selector {
        draw_device_selector(frame, state);
    }
}

fn draw_header(frame: &mut Frame, area: Rect, state: &RunState, amplitude_data: &AmplitudeData) {
    let elapsed = state.elapsed();
    let level = amplitude_data.get_normalized_level();

    let inner_layout = Layout::horizontal([Constraint::Percentage(50), Constraint::Percentage(50)])
        .split(area.inner(Margin {
            vertical: 1,
            horizontal: 2,
        }));

    let header_text = Line::from(vec![
        Span::styled(
            "Owhisper",
            Style::default()
                .fg(tailwind::CYAN.c300)
                .add_modifier(Modifier::BOLD),
        ),
        Span::styled(" │ ", Style::default().fg(tailwind::SLATE.c600)),
        Span::styled(
            format!(
                "{:02}:{:02}",
                elapsed.as_secs() / 60,
                elapsed.as_secs() % 60
            ),
            Style::default().fg(tailwind::GREEN.c400),
        ),
    ]);
    let header_para = Paragraph::new(header_text).alignment(Alignment::Left);
    frame.render_widget(header_para, inner_layout[0]);

    let device_text = state.current_device.clone();
    let viz_width = 8u16; // Smaller width for mic level visual

    let filled_bars = ((level as f64 / 100.0 * viz_width as f64) as usize).min(viz_width as usize);
    let viz_chars: String = (0..viz_width)
        .map(|i| {
            if (i as usize) < filled_bars {
                '█'
            } else {
                '░'
            }
        })
        .collect();

    // Combine visualizer and device name in one line
    let combined_text = Line::from(vec![
        // Keep visualizer color consistent
        Span::styled(viz_chars, Style::default().fg(tailwind::BLUE.c400)),
        Span::styled(
            device_text,
            Style::default()
                .fg(tailwind::BLUE.c400)
                .add_modifier(Modifier::BOLD),
        ),
    ]);

    // Render as single right-aligned paragraph
    let combined_para = Paragraph::new(combined_text).alignment(Alignment::Right);
    frame.render_widget(combined_para, inner_layout[1]);

    // Border around the whole area
    let border = Block::default()
        .borders(Borders::ALL)
        .border_style(Style::default().fg(tailwind::SLATE.c700))
        .border_type(BorderType::Rounded)
        .style(Style::default().bg(tailwind::SLATE.c950));
    frame.render_widget(border, area);
}

fn draw_transcripts(frame: &mut Frame, area: Rect, state: &mut RunState) {
    let block = Block::default()
        .title(vec![
            Span::styled(" Transcripts ", Style::default().fg(tailwind::SLATE.c400)),
            Span::styled(
                format!(" ({}) ", state.transcripts.len()),
                Style::default().fg(tailwind::SLATE.c600),
            ),
        ])
        .title_alignment(Alignment::Center)
        .borders(Borders::ALL)
        .border_style(Style::default().fg(tailwind::SLATE.c700))
        .padding(Padding::horizontal(1));

    let inner = block.inner(area);

    // Calculate visible area
    let visible_height = inner.height as usize;
    let start_idx = state.scroll_position.saturating_sub(visible_height / 2);
    let end_idx = (start_idx + visible_height).min(state.transcripts.len());

    // Create list items with proper styling
    let items: Vec<ListItem> = state.transcripts[start_idx..end_idx]
        .iter()
        .rev()
        .enumerate()
        .map(|(i, entry)| {
            let age = entry.timestamp.elapsed();
            let style = if age < Duration::from_secs(2) {
                Style::default().fg(tailwind::WHITE)
            } else if age < Duration::from_secs(10) {
                Style::default().fg(tailwind::SLATE.c300)
            } else if age < Duration::from_secs(30) {
                Style::default().fg(tailwind::SLATE.c500)
            } else {
                Style::default().fg(tailwind::SLATE.c600)
            };

            let marker = if i == 0 && state.is_active() {
                Span::styled("▸ ", Style::default().fg(tailwind::CYAN.c400))
            } else {
                Span::styled("  ", Style::default())
            };

            ListItem::new(Line::from(vec![marker, Span::styled(&entry.text, style)]))
        })
        .collect();

    let list = List::new(items);

    frame.render_widget(block, area);
    frame.render_widget(list, inner);

    // Scrollbar
    if state.transcripts.len() > visible_height {
        frame.render_stateful_widget(
            Scrollbar::new(ScrollbarOrientation::VerticalRight)
                .symbols(symbols::scrollbar::VERTICAL)
                .style(Style::default().fg(tailwind::SLATE.c700))
                .thumb_style(Style::default().fg(tailwind::CYAN.c600)),
            inner.inner(Margin {
                vertical: 0,
                horizontal: 0,
            }),
            &mut state.scroll_state,
        );
    }
}

fn draw_device_selector(frame: &mut Frame, state: &mut RunState) {
    let area = frame.area();
    let popup_width = 60.min(area.width - 4);
    let popup_height = (state.available_devices.len() as u16 + 4).min(area.height - 4);

    let popup_area = Rect {
        x: (area.width - popup_width) / 2,
        y: (area.height - popup_height) / 2,
        width: popup_width,
        height: popup_height,
    };

    // Clear the popup area
    frame.render_widget(
        Block::default().style(Style::default().bg(tailwind::SLATE.c900)),
        popup_area,
    );

    // Create the device list items
    let items: Vec<ListItem> = state
        .available_devices
        .iter()
        .map(|device| {
            let is_current = device == &state.current_device;
            let prefix = if is_current {
                Span::styled("✓ ", Style::default().fg(tailwind::GREEN.c400))
            } else {
                Span::raw("  ")
            };

            let style = if is_current {
                Style::default()
                    .fg(tailwind::CYAN.c300)
                    .add_modifier(Modifier::BOLD)
            } else {
                Style::default().fg(tailwind::SLATE.c300)
            };

            ListItem::new(Line::from(vec![prefix, Span::styled(device, style)]))
        })
        .collect();

    let list = List::new(items)
        .block(
            Block::default()
                .title(" Select Audio Device ")
                .title_alignment(Alignment::Center)
                .borders(Borders::ALL)
                .border_style(Style::default().fg(tailwind::CYAN.c600))
                .style(Style::default().bg(tailwind::SLATE.c950)),
        )
        .highlight_style(
            Style::default()
                .bg(tailwind::SLATE.c800)
                .add_modifier(Modifier::BOLD),
        )
        .highlight_symbol("→ ");

    frame.render_stateful_widget(list, popup_area, &mut state.device_list_state);
}

fn draw_help(frame: &mut Frame, area: Rect, state: &RunState) {
    let help_items = if state.show_device_selector {
        vec![
            Span::styled(
                "↑↓",
                Style::default()
                    .fg(tailwind::CYAN.c400)
                    .add_modifier(Modifier::BOLD),
            ),
            Span::styled("/", Style::default().fg(tailwind::SLATE.c600)),
            Span::styled(
                "jk",
                Style::default()
                    .fg(tailwind::CYAN.c400)
                    .add_modifier(Modifier::BOLD),
            ),
            Span::styled(" navigate  ", Style::default().fg(tailwind::SLATE.c500)),
            Span::styled(
                "Enter",
                Style::default()
                    .fg(tailwind::CYAN.c400)
                    .add_modifier(Modifier::BOLD),
            ),
            Span::styled(" select  ", Style::default().fg(tailwind::SLATE.c500)),
            Span::styled(
                "ESC",
                Style::default()
                    .fg(tailwind::CYAN.c400)
                    .add_modifier(Modifier::BOLD),
            ),
            Span::styled(" cancel", Style::default().fg(tailwind::SLATE.c500)),
        ]
    } else {
        vec![
            Span::styled(
                "q",
                Style::default()
                    .fg(tailwind::CYAN.c400)
                    .add_modifier(Modifier::BOLD),
            ),
            Span::styled("/", Style::default().fg(tailwind::SLATE.c600)),
            Span::styled(
                "ESC",
                Style::default()
                    .fg(tailwind::CYAN.c400)
                    .add_modifier(Modifier::BOLD),
            ),
            Span::styled(" quit  ", Style::default().fg(tailwind::SLATE.c500)),
            Span::styled(
                "↑↓",
                Style::default()
                    .fg(tailwind::CYAN.c400)
                    .add_modifier(Modifier::BOLD),
            ),
            Span::styled("/", Style::default().fg(tailwind::SLATE.c600)),
            Span::styled(
                "jk",
                Style::default()
                    .fg(tailwind::CYAN.c400)
                    .add_modifier(Modifier::BOLD),
            ),
            Span::styled(" scroll  ", Style::default().fg(tailwind::SLATE.c500)),
            Span::styled(
                "d",
                Style::default()
                    .fg(tailwind::CYAN.c400)
                    .add_modifier(Modifier::BOLD),
            ),
            Span::styled(" devices  ", Style::default().fg(tailwind::SLATE.c500)),
            Span::styled(
                "Ctrl+C",
                Style::default()
                    .fg(tailwind::CYAN.c400)
                    .add_modifier(Modifier::BOLD),
            ),
        ]
    };

    let help = Paragraph::new(Line::from(help_items))
        .alignment(Alignment::Center)
        .block(
            Block::default()
                .borders(Borders::TOP)
                .border_style(Style::default().fg(tailwind::SLATE.c800)),
        );

    frame.render_widget(help, area);
}
