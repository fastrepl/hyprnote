import {
  RiRobot2Line,
  RiWifiLine,
  RiSparklingLine,
  RiLinkM,
  RiCheckboxCircleLine,
  RiFileTextLine,
  RiQuestionLine,
  RiShareLine,
} from "@remixicon/react";

const features = [
  {
    icon: RiSparklingLine,
    title: "Get Hy-lights",
    description:
      "Find out and remember exceptional moments based on expressions and feelings.",
  },
  {
    icon: RiLinkM,
    title: "Easy references",
    description:
      "Go to related parts in your transcript just by clicking on references.",
  },
  {
    icon: RiQuestionLine,
    title: "Ask questions",
    description:
      "If you can't remember something, just ask questions and get answers immediately.",
  },
  {
    icon: RiRobot2Line,
    title: "No meeting bots",
    description:
      "No need to invite AI bots to your meetings, Hypr transcribes directly from your computer.",
  },
  {
    icon: RiWifiLine,
    title: "Works offline",
    description:
      "Don't worry if you lose connection. Hypr automatically uses local AI models to keep you on the roll.",
  },

  {
    icon: RiCheckboxCircleLine,
    title: "Fact checks",
    description:
      "Find out if certain things are correct, based on public & internal information.",
  },
  {
    icon: RiFileTextLine,
    title: "Templates",
    description: "No need to re-format your notes. Just select a template.",
  },

  {
    icon: RiShareLine,
    title: "Share your note",
    description:
      "Share links to your notes with people you want or distribute publicly.",
  },
];

export default function Features() {
  return (
    <section className="py-24 bg-muted/50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">
            Everything you need for better meeting notes
          </h2>
          <p className="text-muted-foreground">
            Powerful features to help you capture, understand, and share meeting
            insights
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="p-6 bg-background rounded-lg shadow-sm">
              <feature.icon className="w-10 h-10 text-primary mb-4" />
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
