// Define the transcript data types
export interface TimelineViewItem {
  start: number;
  end: number;
  speaker: string;
  text: string;
}

export interface TimelineView {
  items: TimelineViewItem[];
}

// Mock data for transcript
export const getMockTranscript = (sessionId: string): TimelineView => {
  // Return different transcript items based on the session ID
  // This simulates retrieving different transcript data for different sessions
  const lastChar = sessionId.charAt(sessionId.length - 1);
  const isEven = parseInt(lastChar, 16) % 2 === 0;
  
  return {
    items: isEven ? [
      {
        start: 0,
        end: 5000,
        speaker: "Speaker 1",
        text: "Hi everyone, thanks for joining today's meeting about the new product launch."
      },
      {
        start: 5100,
        end: 12000,
        speaker: "Speaker 2", 
        text: "I'm excited to share our progress. We've completed the initial testing phase and the results look promising."
      },
      {
        start: 12500,
        end: 18000,
        speaker: "Speaker 1",
        text: "That's great news! When can we expect to move to the beta testing phase?"
      },
      {
        start: 18500,
        end: 25000,
        speaker: "Speaker 2",
        text: "We're aiming to start beta testing next week. We'll need to finalize the participant list by Friday."
      },
      {
        start: 26000,
        end: 32000,
        speaker: "Speaker 3",
        text: "I've prepared a list of potential beta testers. I'll share it with everyone after this meeting for review."
      },
      {
        start: 33000,
        end: 40000,
        speaker: "Speaker 1",
        text: "Perfect. Let's also discuss the marketing strategy. We need to coordinate with the marketing team to prepare the launch materials."
      },
      {
        start: 41000,
        end: 48000,
        speaker: "Speaker 4",
        text: "I've been working with the marketing team on this. We've drafted press releases and social media announcements. We're also preparing a video demonstration of the key features."
      },
      {
        start: 49000,
        end: 55000,
        speaker: "Speaker 2",
        text: "The video demo is crucial. Can we ensure it highlights the improvements we've made based on user feedback from the alpha testing?"
      },
      {
        start: 56000,
        end: 62000,
        speaker: "Speaker 4",
        text: "Absolutely. We've structured the demo to emphasize those improvements. We're also creating comparison screenshots to show the before and after."
      },
      {
        start: 63000,
        end: 70000,
        speaker: "Speaker 3",
        text: "What about the pricing strategy? Have we finalized the subscription tiers and promotional offers for early adopters?"
      },
      {
        start: 71000,
        end: 80000,
        speaker: "Speaker 1",
        text: "Yes, we've settled on three tiers: Basic, Pro, and Enterprise. Early adopters will get a 30% discount for the first six months, and alpha testers will receive a full year of Pro features at the Basic price point."
      },
      {
        start: 81000,
        end: 88000,
        speaker: "Speaker 5",
        text: "I have concerns about the server infrastructure. With the expected increase in users after launch, we need to ensure our systems can handle the load."
      },
      {
        start: 89000,
        end: 96000,
        speaker: "Speaker 2",
        text: "Good point. We've been stress testing the infrastructure and have set up auto-scaling to handle traffic spikes. We're also implementing a phased rollout to manage the initial surge."
      },
      {
        start: 97000,
        end: 105000,
        speaker: "Speaker 5",
        text: "That's reassuring. Have we also considered the impact on customer support? We should prepare the team for an increase in inquiries."
      },
      {
        start: 106000,
        end: 115000,
        speaker: "Speaker 1",
        text: "We're expanding the support team and creating comprehensive documentation and FAQs. We're also implementing an improved ticketing system to better manage and prioritize support requests."
      },
      {
        start: 116000,
        end: 123000,
        speaker: "Speaker 3",
        text: "What about the onboarding experience? First impressions are crucial for user retention."
      },
      {
        start: 124000,
        end: 132000,
        speaker: "Speaker 4",
        text: "We've redesigned the onboarding flow with interactive tutorials and tooltips. We've also created short video guides for key features that users can access at any time."
      },
      {
        start: 133000,
        end: 140000,
        speaker: "Speaker 2",
        text: "Let's schedule a follow-up meeting next week to review the beta testing feedback and make any necessary adjustments before the official launch."
      },
      {
        start: 141000,
        end: 146000,
        speaker: "Speaker 1",
        text: "Agreed. I'll send out a calendar invite. Is there anything else we need to discuss today?"
      },
      {
        start: 147000,
        end: 155000,
        speaker: "Speaker 5",
        text: "Just a quick reminder that we need to finalize the accessibility compliance testing. It's essential that our product meets all accessibility standards."
      },
      {
        start: 156000,
        end: 163000,
        speaker: "Speaker 2",
        text: "You're right. I'll coordinate with the QA team to prioritize accessibility testing this week. We'll address any issues before the beta release."
      },
      {
        start: 164000,
        end: 170000,
        speaker: "Speaker 1",
        text: "Great. If there's nothing else, let's wrap up. Thank you all for your hard work and contributions. I'm confident we're on track for a successful launch."
      }
    ] : [
      {
        start: 0,
        end: 4500,
        speaker: "Alex",
        text: "Let's discuss the latest design updates for our mobile app."
      },
      {
        start: 5000,
        end: 10000,
        speaker: "Taylor", 
        text: "I've incorporated the feedback from our last user testing session. The navigation flow is much more intuitive now."
      },
      {
        start: 10500,
        end: 15000,
        speaker: "Jordan",
        text: "The color palette looks great. Have we conducted any accessibility testing yet?"
      },
      {
        start: 15500,
        end: 22000,
        speaker: "Taylor",
        text: "Yes, we ran it through our accessibility tools and made several improvements. The contrast ratios all meet WCAG AA standards now."
      },
      {
        start: 22500,
        end: 28000,
        speaker: "Alex",
        text: "Perfect. I think we're on track for the design handoff next week. Let's schedule another review on Friday."
      },
      {
        start: 29000,
        end: 36000,
        speaker: "Morgan",
        text: "I'd like to discuss the animation transitions between screens. I think they could be smoother and more consistent."
      },
      {
        start: 37000,
        end: 44000,
        speaker: "Taylor",
        text: "I agree. I've been experimenting with some new transition patterns. I can share my screen to show you what I've been working on."
      },
      {
        start: 45000,
        end: 52000,
        speaker: "Alex",
        text: "That would be great. While we're on the topic of animations, we should also consider reducing the animation duration on some elements to improve perceived performance."
      },
      {
        start: 53000,
        end: 60000,
        speaker: "Jordan",
        text: "Speaking of performance, have we run any benchmarks on the latest build? I'm concerned about the load time for the dashboard screen with all the new data visualizations."
      },
      {
        start: 61000,
        end: 70000,
        speaker: "Casey",
        text: "I've been monitoring performance metrics. The dashboard is indeed slower than our target. We're implementing lazy loading for the charts and considering a more efficient data fetching strategy."
      },
      {
        start: 71000,
        end: 78000,
        speaker: "Taylor",
        text: "Here's what I've been working on for the transitions. Notice how the elements maintain continuity between screens."
      },
      {
        start: 79000,
        end: 86000,
        speaker: "Morgan",
        text: "That looks much better. I especially like how the header transitions. Can we apply a similar pattern to the modal dialogs?"
      },
      {
        start: 87000,
        end: 94000,
        speaker: "Taylor",
        text: "Definitely. I'll update the modal component to use the same transition logic. It should create a more cohesive feel throughout the app."
      },
      {
        start: 95000,
        end: 102000,
        speaker: "Alex",
        text: "Let's also discuss the new onboarding flow. The user testing showed that some users were confused about the account creation process."
      },
      {
        start: 103000,
        end: 112000,
        speaker: "Jordan",
        text: "I've redesigned the onboarding screens to make the steps clearer. I've reduced it to three essential screens and added progress indicators. Each screen now focuses on one specific action."
      },
      {
        start: 113000,
        end: 120000,
        speaker: "Casey",
        text: "I like the simplified approach. Have we considered offering a 'skip for now' option? Some users prefer to explore the app before creating an account."
      },
      {
        start: 121000,
        end: 128000,
        speaker: "Jordan",
        text: "That's a good point. I can add a skip option that allows limited access to the app's features. We can then use subtle prompts to encourage account creation later."
      },
      {
        start: 129000,
        end: 136000,
        speaker: "Morgan",
        text: "What about the dark mode implementation? I noticed some inconsistencies in how components adapt to the theme change."
      },
      {
        start: 137000,
        end: 146000,
        speaker: "Taylor",
        text: "You're right. We need to standardize our approach. I propose creating a comprehensive theme system that components can hook into, rather than handling dark mode styles individually."
      },
      {
        start: 147000,
        end: 154000,
        speaker: "Alex",
        text: "That sounds like the right approach. It will make maintenance easier in the long run. Can you prepare a proposal for how this would work?"
      },
      {
        start: 155000,
        end: 162000,
        speaker: "Taylor",
        text: "Sure, I'll have something ready by tomorrow. I'll include examples of how existing components would migrate to the new system."
      },
      {
        start: 163000,
        end: 170000,
        speaker: "Casey",
        text: "While we're discussing technical improvements, I'd like to mention that we should update our icon system. The current approach of importing individual SVGs is causing bundle size issues."
      },
      {
        start: 171000,
        end: 180000,
        speaker: "Morgan",
        text: "I agree. We should consider using an icon font or an SVG sprite system. It would improve performance and make it easier to maintain consistency."
      },
      {
        start: 181000,
        end: 188000,
        speaker: "Alex",
        text: "Let's add that to our technical debt backlog. Casey, can you research the best approach and present options at our next meeting?"
      },
      {
        start: 189000,
        end: 195000,
        speaker: "Casey",
        text: "Will do. I'll compare the trade-offs between icon fonts, SVG sprites, and other approaches."
      },
      {
        start: 196000,
        end: 204000,
        speaker: "Alex",
        text: "Great. Let's wrap up for today. We've made good progress. Taylor will share the transition updates, Jordan will refine the onboarding flow, and we'll review everything again on Friday."
      }
    ]
  };
};

// Helper function to format milliseconds to mm:ss format
export function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}
