use gpui::*;
use notification2::{NotificationManager, StatusToast, ToastAction};

fn main() {
    App::new().run(|cx: &mut App| {
        cx.open_window(
            WindowOptions {
                window_bounds: Some(WindowBounds::Windowed(Bounds {
                    origin: point(px(100.), px(100.)),
                    size: Size {
                        width: px(500.),
                        height: px(300.),
                    },
                })),
                ..Default::default()
            },
            |window, cx| {
                let manager = NotificationManager::new(cx);

                manager.update(cx, |manager, cx| {
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

                    manager.show_toast(toast, cx);
                });

                manager
            },
        );
    });
}
