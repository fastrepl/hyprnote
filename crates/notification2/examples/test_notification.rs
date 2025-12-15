use gpui::*;
use notification2::{StatusToast, ToastAction};

fn main() {
    Application::new().run(|cx: &mut App| {
        let _ = cx.open_window(
            WindowOptions {
                window_bounds: Some(WindowBounds::Windowed(Bounds {
                    origin: point(px(100.), px(100.)),
                    size: Size {
                        width: px(450.),
                        height: px(100.),
                    },
                })),
                titlebar: Some(TitlebarOptions {
                    appears_transparent: true,
                    ..Default::default()
                }),
                window_background: WindowBackgroundAppearance::Transparent,
                focus: true,
                show: true,
                kind: WindowKind::PopUp,
                ..Default::default()
            },
            |_window, cx| {
                let toast = StatusToast::new("Zed Agent")
                    .subtitle("hyprnote · Finished running tools")
                    .action(ToastAction::new("view-panel", "View Panel").on_click(
                        |_window, _cx| {
                            println!("View Panel clicked!");
                        },
                    ))
                    .on_dismiss(|_window, _cx| {
                        println!("Toast dismissed!");
                    });

                cx.new(|_cx| toast)
            },
        );
    });
}
