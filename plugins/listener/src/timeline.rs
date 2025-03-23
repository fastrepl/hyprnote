use intervaltree::IntervalTree;

type DiarizeOutputChunk = hypr_db_user::DiarizationChunk;
type TranscribeOutputChunk = hypr_db_user::TranscriptChunk;

pub trait Interval {
    fn start(&self) -> u64;
    fn end(&self) -> u64;

    fn overlaps<I: Interval>(&self, other: &I) -> Option<u64> {
        if self.start() < other.end() && self.end() > other.start() {
            let overlap_start = std::cmp::max(self.start(), other.start());
            let overlap_end = std::cmp::min(self.end(), other.end());
            Some(overlap_end - overlap_start)
        } else {
            None
        }
    }
}

impl Interval for DiarizeOutputChunk {
    fn start(&self) -> u64 {
        self.start
    }
    fn end(&self) -> u64 {
        self.end
    }
}

impl Interval for TranscribeOutputChunk {
    fn start(&self) -> u64 {
        self.start
    }
    fn end(&self) -> u64 {
        self.end
    }
}

impl Interval for std::ops::Range<u64> {
    fn start(&self) -> u64 {
        self.start
    }
    fn end(&self) -> u64 {
        self.end
    }
}

#[derive(Default)]
pub struct Timeline {
    transcripts: Vec<TranscribeOutputChunk>,
    diarizations: Vec<DiarizeOutputChunk>,
}

#[derive(Debug, Clone, Default, PartialEq, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct TimelineView {
    pub items: Vec<TimelineViewItem>,
}

#[derive(Debug, Clone, Default, PartialEq, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct TimelineViewItem {
    pub start: u64,
    pub end: u64,
    pub speaker: String,
    pub text: String,
}

#[derive(Debug, Clone, Default, PartialEq, serde::Serialize, serde::Deserialize, specta::Type)]
pub struct TimelineFilter {
    pub last_n_seconds: Option<u64>,
}

impl std::fmt::Display for TimelineView {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        for item in self.items.iter() {
            writeln!(f, "{}", item)?;
        }
        Ok(())
    }
}

impl std::fmt::Display for TimelineViewItem {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}\n{}\n", self.speaker, self.text)
    }
}

impl TimelineViewItem {
    fn eos(&self) -> bool {
        matches!(
            self.text.chars().last().unwrap(),
            '.' | '?' | '!' | '？' | '！'
        )
    }

    fn num_words(&self) -> usize {
        self.text.split_whitespace().count()
    }

    fn time_diff(&self, other: &TranscribeOutputChunk) -> u64 {
        self.end.abs_diff(other.start)
    }

    fn merge(&mut self, other: &TranscribeOutputChunk) {
        self.end = other.end;

        if self.eos() {
            self.text.push(' ');
        }

        self.text.push_str(&other.text);
    }
}

impl Timeline {
    pub fn add_transcription(&mut self, item: TranscribeOutputChunk) {
        self.transcripts.push(item);
    }

    pub fn add_diarization(&mut self, item: DiarizeOutputChunk) {
        if let Some(index) = self
            .diarizations
            .iter()
            .position(|x| x.start() == item.start())
        {
            self.diarizations[index] = item;
        } else {
            self.diarizations.push(item);
        }
    }

    pub fn view(&self, filter: TimelineFilter) -> TimelineView {
        let tree: IntervalTree<u64, String> = IntervalTree::from_iter(
            self.diarizations
                .iter()
                .map(|d| (d.start..d.end, d.speaker.clone())),
        );

        let mut items: Vec<TimelineViewItem> = vec![];

        let max_end = self.transcripts.iter().map(|t| t.end).max().unwrap_or(0);
        let filtered_transcripts = self.transcripts.iter().filter(|t| {
            filter
                .last_n_seconds
                .is_none_or(|n| t.end >= max_end.saturating_sub(n * 1000))
        });

        for transcript in filtered_transcripts {
            let range = transcript.start.saturating_sub(100)..transcript.end.saturating_add(100);
            let speakers: Vec<_> = tree.query(range).collect();

            if speakers.is_empty() {
                items.push(TimelineViewItem {
                    start: transcript.start,
                    end: transcript.end,
                    speaker: "UNKNOWN?".to_string(),
                    text: transcript.text.clone(),
                });

                continue;
            }

            let speaker = speakers
                .iter()
                .map(|entry| {
                    let diarization_interval = entry.range.start..entry.range.end;
                    let overlap = transcript.overlaps(&diarization_interval).unwrap_or(0);

                    (entry.value.clone(), overlap)
                })
                .max_by_key(|(_, overlap)| *overlap)
                .map(|(speaker, _)| speaker)
                .unwrap();

            if let Some(last_item) = items.last_mut() {
                if transcript.text.trim().is_empty() {
                    last_item.merge(transcript);
                    continue;
                }

                if last_item.speaker == speaker {
                    if last_item.num_words() < 5 && last_item.time_diff(transcript) < 5000 {
                        last_item.merge(transcript);
                        continue;
                    }

                    if !last_item.eos() && last_item.time_diff(transcript) < 2000 {
                        last_item.merge(transcript);
                        continue;
                    }

                    if last_item.eos()
                        && last_item.time_diff(transcript) < 500
                        && last_item.num_words() <= 20
                    {
                        last_item.merge(transcript);
                        continue;
                    }
                }
            }

            items.push(TimelineViewItem {
                start: transcript.start,
                end: transcript.end,
                speaker,
                text: transcript.text.clone(),
            });
        }

        TimelineView { items }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[cfg(test)]
    macro_rules! init_timeline {
        ($module:ident) => {{
            let transcripts: Vec<TranscribeOutputChunk> =
                serde_json::from_str(hypr_data::$module::TRANSCRIPTION_JSON).unwrap();
            let diarizations: Vec<DiarizeOutputChunk> =
                serde_json::from_str(hypr_data::$module::DIARIZATION_JSON).unwrap();

            let mut timeline = Timeline::default();
            for t in transcripts {
                timeline.add_transcription(t);
            }
            for d in diarizations {
                timeline.add_diarization(d);
            }
            timeline
        }};
    }

    #[test]
    fn test_korean_1() {
        let timeline = init_timeline!(korean_1);

        insta::assert_snapshot!(timeline.view(TimelineFilter::default()).to_string(), @r###"
        speaker0
        기관스터디 이민영 상담원입니다. 무엇을 도와드릴까요 

        speaker1
        안녕하세요. 제가 현재 영어 인터넷 수강 학습을 하고 있는데 학습과 교재 구매 관련해서 질문이 있습니다. 지금 상담 가능할까요 이번에 기가 스터디 간편 진단 학습 시스템을 이용해서 제가 10점 만점 만점 중에 70점을 받았는데 화면으로는 현재 당신의 레벨은 아마추어가 뜹니다라고 되어 있어요.  그런데 제가 그 레벨에 맞는 강의 목록이 있길래 들어보니까 실제 제가 하는 학습 속도를 따라가기가 너무 힘든 것 같아요. 

        speaker0
        그럼 현재 고객님은 어느 부분에서 따라가기가 힘들까요 

        speaker1
        이번에 새롭게 올라온 강의 중에 아마추어를 위한 영문법 강의가 있어요. 저는 레벨 테스트에 문법 부분이 다 맞아서 이 강의는 그래도 무난하게 들어볼 수 있겠다라는 생각이 들었어요. 예를 들어 현재 본사 과거 본사라든지 이런 걸 생각할 수 있겠는데 이렇게 제가 생각한 것과는 달라도 너무 달라요 

        speaker0
        어느 부분이 다를까요. 대

        speaker1
        학생 수준 같아 보이는 저를 구로 변환이라든지 이런 게 강의 끝날 때마다 나오는 잠깐의 평가 학습이나 이런 문제를 풀면 항상 기준점이 70점 아래 점수가 계속 나와요 

        speaker0
        예 알겠습니다. 그러면 제가 다른 수준으로 강의를 들을 수 있도록 제가 변경 신청을 도와드리겠습니다.  어떤 유형을 원하는지 잠시 설명 부탁드리겠습니다. 

        speaker1
        저는 일단 독해 능력은 거의 부족하니까 독해를 쉽게 할 수 있고 부담 없고 생각 없이 읽을 수 있는 그런 교재가 필요해요. 문법에서는 기초를 다시 복습하고 다져볼 수 있는 그런 감자랑 듣기는 지금 현재 레벨보다 더 느린 속도로 된 오디오 녹음 같은 게 있나요. 

        speaker0
        네 잠시만요 그러면 고객님이 원하는 사이트에 소개된 비기너 레벨은 어떨까요 

        speaker1
        레벨이라 일단 그 강좌가 아마추어 및 인 것 같고 우선 원하는 수준이랑 어울리는 것으로 보이는 것 같아요. 일단 이번과 같은 사태가 일어나지 않게끔 뭔가 미리 체험해볼 수 있는 그런 강좌 혹은 교재 같은 게 있나요. 

        speaker0
        잠시만 기다려 주세요. 네 그러면 먼저 고객님이 먼저 볼 수 있게끔 샘플 교재로 보내드릴까요 샘

        speaker1
        플 교재 먼저 보내주세요. 그러면 주소가 필요하나요 주소는 서울시 영어구 문법동 독해로 팔십2번지 828호입니다. 

        speaker0
        알겠습니다. 

        speaker1
        혹시 그러면 지금 비비너 레벨 강의료가 8만90원 정도 되고 아마추어 강의료가 6만 8490원 정도 되는데 차액은 지금 결제해도 될까요 네 

        speaker0
        그러면 회원 정보에 저장된 결제 수단으로 하겠습니다. 

        speaker1
        아니요 저 최근에 카드를 바꿔서 그 카드로 해도 될까요 

        speaker0
        카드 정보 부탁드립니다 

        speaker1
        카드 번호는 1 2 3 4 다시 5 6 7 팔 다시 구 영 일 이 다시 삼 4 오 육이고 유효기간은 2025년 12월까지이고 카드 뒷면에 cvc 자는 일 2 3입니다. 이름은 이준하 회원 정보랑 같아요.  

        speaker0
        기준 10% 할인 이벤트가 사라지는데 괜찮을까요 

        speaker1
        그때 오픈 이벤트 하느라 전체 강의료의 10% 할인은 지금 하고 있지 않은 거예요.  그러면 혹시 다른 할인 이벤트가 뭐가 있는지 알려주세요.  

        speaker0
        자동 이체 설정하면 5% 할인은 됩니다. 

        speaker1
        그러면 자동이체로 해야 되겠네요.  요즘에 생활비도 빠듯해서 비용 부담이 너무 커요.  그건 그렇고 제 통장번호 부르면 될까요. 네 통장 번호는 1 2 3 사 다시 5 6 7 8 구영 일 이 다시 3 4 다시 5 6 7 8 이렇게 됩니다. 은행명은 가나다 뱅크입니다.  

        speaker0
        네 감사합니다.  자동 이체 신청으로 해드리겠습니다. 

        speaker1
        추가로 궁금한 사항이 있어요. 한 달 기준으로 8만 90원인데 만약 제가 일주일만 듣다가 그만두고 싶어지거나 또 바꿀 수 있는 상황이 찾아올 수도 있을 것 같은데 이런 경우는 남은 금액은 어떻게 처리가 되나요. 

        speaker0
        루 나눕니다. 

        speaker1
        그러면 교재는 사용을 안 했다면 그거는 환불이 가능할까요 

        speaker0
        가능하다면 14일 이내로 해주셔야 합니다. 

        speaker1
        그러면 그렇게 해 주세요. 감사합니다. 수고하

        UNKNOWN?
        세요. 

        UNKNOWN?
        감사

        UNKNOWN?
        합니다. 

        UNKNOWN?
        이민영
        "###);
    }

    #[test]
    fn test_korean_2() {
        let timeline = init_timeline!(korean_2);

        insta::assert_snapshot!(timeline.view(TimelineFilter::default()).to_string(), @r###"
        speaker0
        개인적인 질문인데요. 네 웃으시니까 이빨에 

        speaker1
        투 

        speaker2
        투스

        speaker0
        잼이라고 하는 건가요 뭐 하시는 거예요. 

        speaker2
        신기하네요. 

        speaker0
        처음 봤어요. 

        speaker2
        진짜요 

        speaker0
        떼지나요. 이거 이렇게 하면 

        speaker2
        이게 거의 저 1년 받을 가는데 아직 한 번도 안 떨어졌고 

        speaker0
        양치할 때 안 떨어지나요. 

        speaker2
        네 안 떨어져요. 

        speaker0
        세게 안 닦아요. 

        speaker2
        세게 닦아도 

        speaker1
        안 닦아요. 그런데 이게 제가 

        speaker0
        뜯으려고 해

        speaker2
        봤는데 정말 안 떨어지더라고요. 

        speaker0
        잘 됐네요. 시술이 잘 됐나 보네요. 이거 박는 거구나 이게 이빨에 

        speaker1
        박으면 큰일 나고 치아이 걸레

        speaker2
        지 그걸로 붙이더라고

        speaker1
        요 

        speaker0
        독자 여러분들께 제 미소 한 번만 보여주세요. 

        speaker1
        이거 건데 보여요 

        speaker2
        감사합니다. 

        speaker0
        그거
        "###);
    }

    #[test]
    fn test_english_1() {
        let timeline = init_timeline!(english_1);

        insta::assert_snapshot!(timeline.view(TimelineFilter::default()).to_string(), @r###"
        speaker0
        Maybe this is me talking to the audience a little bit because I get these daysso many messages, advice on how to, like,learn stuff.

        speaker0
         Okay? Mythis this this is not me being mean.  I think this is quite profound, actually.

        speaker0
        Is you should Google it.  Oh, yeah.

        speaker0
        Like, 1 of thelike, skills that you should really acquire as an engineeras a researcher, as a thinker,like, 1 there's 22complementary skills, like 1 is with a blank sheet of paper with no Internetto think deeply,then the otheris to Google the crap out of the questions you have.

        speaker0
         Like, that's actually askill.  I I don't know what people often talk about, but, like, doing research, like, pulling at thethread, like, looking up different words, going into, like,GitHub repositories with 2 stars,and, like, looking how they did stuff, like, looking at the code,or going on Twitter, seeing, like, there's little pockets of brilliant people that are, like,having discussions.

        speaker0
         Like, if you'reneuroscientist, go into signal processing community.  If you're an AI

        speaker0
        psychology community.  Like,switch communities, like, keep searching, searching, searching becauseit'sso much better to invest in, like,finding somebody else who already solved your problemthan than it is to try to solve the problem.

        speaker0
        And because they've often invested years of their lifelike entire communities are probably already out there who have tried to solve your problem.

        speaker1
        I think they're the same thing. I thinkyou go try to solve the problem. And then in trying to solve the problem, if you'regood at solving problems, you'll stumble upon the person who solved it already.

        speaker0
        Yeah.  But the stumbling isn't really important.  I I think that's thethat people should really put, especially in undergrad.

        speaker0
        Like, search. If you ask me a question, how should I get started in deep learning, like, especially,

        speaker0
        Like, that is just so Googleable.  Like,the whole point is you Google that,you get a 1000000 pagesand just start looking at them.

        speaker0
        Yeah.  Start pulling at the threads, start exploring, start taking notes, startgetting advice from a 1000000 people that have already, like, spenttheir life answering that question, actually.

        speaker1
        Well, yeah.  I mean, that's definitely also yeah.  When people, like, ask me things like that, I'm like, trust me. The top answer on Google is much, much better than anything I'm going to tell you.

        speaker1
        Right?

        speaker0
         Yeah.
        "###);
    }

    #[test]
    fn test_english_2() {
        let timeline = init_timeline!(english_2);

        insta::assert_snapshot!(timeline.view(TimelineFilter::default()).to_string(), @r###"
        speaker0
        Hello? Hello?  Oh, hello.  I didn't know you were there.

        speaker1
         Neither did I.  I hear

        speaker0
         that.  I thoughtyou know, I heard a beep.  This is Diane in New Jersey.  And

        speaker1
         I'mSheila in Texas, originally from Chicago.

        speaker0
        Oh, I'm originally from Chicago also.  I'm in New Jersey now, though.

        speaker1
        Well, there isn't that much difference.  At least, you know, they

        UNKNOWN?
         all

        UNKNOWN?
        call

        UNKNOWN?
         me

        UNKNOWN?
         a

        UNKNOWN?
         Yankee

        UNKNOWN?
         down

        UNKNOWN?
         here.

        UNKNOWN?
         So

        UNKNOWN?
         what

        UNKNOWN?
         kind

        UNKNOWN?
         of

        UNKNOWN?
         thing?

        UNKNOWN?
         I

        UNKNOWN?
         don't

        UNKNOWN?
         hear

        UNKNOWN?
         that

        UNKNOWN?
         in

        UNKNOWN?
         New

        UNKNOWN?
         Jersey

        UNKNOWN?
         now.
        "###);
    }
}
