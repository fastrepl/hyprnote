use gpui::{App, AppContext, Application, Entity};
use notification2::{NotificationEvent, StatusToast};

fn main() {
    Application::new().run(|cx: &mut App| {
        let screen = cx.primary_display().expect("No primary display found");

        let toast_entity: Entity<StatusToast> = cx.new(|_cx| {
            StatusToast::new("Meeting starting soon")
                .project_name("hyprnote")
                .subtitle("Daily standup in 5 minutes")
                .action_label("Join")
                .expanded_content(
                    "You have a scheduled meeting with the team. \
                     Click 'Join' to open the meeting room, or dismiss \
                     this notification to be reminded again later.",
                )
        });

        cx.subscribe(
            &toast_entity,
            |_, event: &NotificationEvent, cx| match event {
                NotificationEvent::Accepted => {
                    println!("Join clicked!");
                    cx.quit();
                }
                NotificationEvent::Dismissed => {
                    println!("Notification dismissed!");
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
