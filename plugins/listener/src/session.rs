use statig::prelude::*;

pub struct Session {}

impl Session {
    fn new() -> Self {
        Self {}
    }
}

#[derive(Debug)]
pub enum Event {
    Start,
    Stop,
    Pause,
    Resume,
}

#[state_machine(
    initial = "State::inactive()",
    on_transition = "Self::on_transition",
    state(derive(Debug, PartialEq))
)]
impl Session {
    #[state]
    async fn running_active(event: &Event) -> Response<State> {
        match event {
            Event::Stop => Transition(State::inactive()),
            Event::Pause => Transition(State::running_paused()),
            _ => Handled,
        }
    }

    #[state]
    async fn running_paused(event: &Event) -> Response<State> {
        match event {
            Event::Resume => Transition(State::running_active()),
            _ => Handled,
        }
    }

    #[state(entry_action = "enter_inactive")]
    async fn inactive(event: &Event) -> Response<State> {
        match event {
            Event::Start => Transition(State::running_active()),
            _ => Handled,
        }
    }

    #[action]
    async fn enter_inactive(&mut self) {}

    fn on_transition(&mut self, source: &State, target: &State) {
        if *source == State::inactive() && *target == State::running_active() {
            println!("transitioned from `{:?}` to `{:?}`", source, target);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_state_machine() {
        let mut session = Session::new().state_machine();
        session.handle(&Event::Start).await;
        session.handle(&Event::Pause).await;
        session.handle(&Event::Resume).await;
        session.handle(&Event::Stop).await;
        assert_eq!(*session.state(), State::inactive());
    }
}
