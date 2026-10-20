export function configureCenteredPlayback(
  media: HTMLMediaElement,
  createContext: () => AudioContext = () => new AudioContext(),
): AudioContext | null {
  let context: AudioContext;
  try {
    context = createContext();
  } catch {
    return null;
  }

  try {
    const gainNode = context.createGain();
    gainNode.channelCount = 1;
    gainNode.channelCountMode = "explicit";
    gainNode.channelInterpretation = "speakers";
    gainNode.connect(context.destination);
    context.createMediaElementSource(media).connect(gainNode);
  } catch {
    void context.close().catch(() => {});
    return null;
  }

  return context;
}

// WebKitGTK creates contexts in the non-standard "interrupted" state, so any
// state other than running needs a resume() before the media graph emits sound.
export function shouldResumeBeforePlay(
  context: AudioContext | null,
): context is AudioContext {
  return (
    context !== null &&
    context.state !== "running" &&
    context.state !== "closed"
  );
}
