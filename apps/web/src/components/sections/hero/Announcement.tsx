import AnimatedGradientText from "@/components/ui/animated-gradient-text";

export default function Announcement() {
  return (
    <AnimatedGradientText className="mb-4">
      ⚡️
      <span className="inline ml-1 animate-gradient bg-gradient-to-r from-[#ffaa40] via-[#9c40ff] to-[#ffaa40] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent">
        Hyprnote is now in public beta!
      </span>
    </AnimatedGradientText>
  );
}
