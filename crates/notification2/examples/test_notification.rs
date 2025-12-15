use gpui::{App, AppContext, Application, Entity};
use notification2::{NotificationEvent, StatusToast};

fn main() {
    Application::new().run(|cx: &mut App| {
        let screen = cx.primary_display().expect("No primary display found");

        let toast_entity: Entity<StatusToast> = cx.new(|_cx| {
            StatusToast::new("Meeting starting soon")
                .project_name("hyprnote")
                .subtitle("The meeting will start in 5 minutes")
        });

        cx.subscribe(
            &toast_entity,
            |_, event: &NotificationEvent, cx| match event {
                NotificationEvent::Accepted => {
                    println!("View Panel clicked!");
                    cx.quit();
                }
                NotificationEvent::Dismissed => {
                    println!("Toast dismissed!");
                    cx.quit();
                }
            },
        )
        .detach();

        cx.open_window(StatusToast::window_options(screen, cx), |_window, _cx| {
            toast_entity.clone()
        })
        .expect("Failed to open window");
    });
}
