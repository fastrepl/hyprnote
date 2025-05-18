// https://docs.rs/minijinja/latest/minijinja/filters/trait.Filter.html

use codes_iso_639::part_1::LanguageCode;
use hypr_listener_interface::{SpeakerIdentity, Word};
use itertools::Itertools;
use std::str::FromStr;

pub fn language(value: String) -> String {
    let lang_str = value.to_lowercase();
    let lang_code = LanguageCode::from_str(&lang_str).unwrap();
    lang_code.language_name().to_string()
}

pub fn timeline(words: String) -> String {
    let words: Vec<Word> = serde_json::from_str(&words).unwrap();

    words
        .iter()
        .chunk_by(|word| word.speaker.clone())
        .into_iter()
        .map(|(speaker, group)| {
            let speaker_label = match speaker {
                Some(SpeakerIdentity::Index(index)) => format!("SPEAKER {}", index),
                Some(SpeakerIdentity::Human { label, .. }) => label.to_string(),
                None => "UNKNOWN".to_string(),
            };

            format!(
                "[{}]\n{}",
                speaker_label,
                group.map(|word| word.text.as_str()).join(" ")
            )
        })
        .join("\n\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_language() {
        assert_eq!(language("en".to_string()), "English");
        assert_eq!(language("ko".to_string()), "Korean");
    }

    #[test]
    fn test_timeline() {
        insta::assert_snapshot!(timeline(hypr_data::english_3::WORDS_JSON.to_string()), @r###"
        [SPEAKER 0]
        -okay michael why don't you start us off

        [SPEAKER 1]
        -that wasn't much of an introduction -ladies and gentlemen

        [SPEAKER 0]
        your boss michael

        [SPEAKER 1]
        scott still lame okay alright thank you ryan for that wonderful introduction okay today we're going to be talking about powerpoint powerpoint powerpoint powerpoint yes i forgot about ryan's presentation and yes it would have been nice to do well with the first presentation that he'd given me but you know what else would have been nice winning the lottery and the best way to start is to hit start and up comes the toolbar that's what she said what we have to do here is go to run and then you look up to powerpoint and we are in we are going to register you hit register updates are ready i should update estimated time twelve minutes so this should take about five or ten minutes

        [SPEAKER 0]
        this is the first time you've opened powerpoint why -you didn't prepare a presentation at all did you

        [SPEAKER 2]
        know what

        [SPEAKER 1]
        i had a really rough night and my boss can back me up on that

        [SPEAKER 0]
        -i'm your boss -my other boss mr figaro -you have another job

        [SPEAKER 1]
        -what i do between 05:30 p m and one a m is nobody's business but mine and my other businesses

        [SPEAKER 0]
        -are you going to waitress -you cannot have a second job if it affects your work here

        [SPEAKER 1]
        -it won't -it did already -okay honestly it is unlikely that i was gonna figure this out anyway

        [SPEAKER 0]
        that is so funny why is daryl here he works in a warehouse i invited him it's not a party daryl back downstairs this isn't the information you need

        [SPEAKER 2]
        this information here yeah you're right i don't need this okay hey come on

        [SPEAKER 0]
        see you later tonight

        [SPEAKER 2]
        i got plans later

        [SPEAKER 0]
        okay bye honey how long until you actually get this presentation ready

        [SPEAKER 1]
        don't you do this presentation because i you know how to do it

        [SPEAKER 0]
        what i really want honestly michael is for you to know it so that you can communicate it to the people here to your clients to whomever

        [SPEAKER 1]
        okay what it's whoever not whomever not whomever no whomever is never actually right

        [SPEAKER 0]
        well sometimes it's right

        [SPEAKER 1]
        michael is right it's a made up word used to trick students

        [SPEAKER 3]
        no actually whomever is the formal version of the word

        [SPEAKER 0]
        obviously it's a real word but i don't know when to use it correctly

        [SPEAKER 1]
        not a native speaker

        [SPEAKER 2]
        i know what's right but i'm not gonna say because you're all jerks who didn't come see my band last night

        [SPEAKER 0]
        do you really know which one is correct

        [SPEAKER 2]
        i don't know

        [SPEAKER 0]
        it's whom when it's the object of the sentence and who when it's the subject subject that sounds right

        [SPEAKER 1]
        well sounds right but is it

        [SPEAKER 2]
        how did ryan use it as an object as

        [SPEAKER 0]
        an object ryan used me as an object

        [SPEAKER 2]
        is he writing about the

        [SPEAKER 0]
        how did he use it again

        [SPEAKER 3]
        it was ryan wanted michael the subject to explain the computer system the object

        [SPEAKER 1]
        thank you

        [SPEAKER 3]
        to whomever meaning us the indirect object which is the correct usage of the word

        [SPEAKER 1]
        no one asked you anything ever so whomever's name is toby why don't you take

        [SPEAKER 0]
        a letter opener and stick it in your skull hey this doesn't matter and i don't even care michael you quit the other job or you're fired here
        "###);
    }
}
