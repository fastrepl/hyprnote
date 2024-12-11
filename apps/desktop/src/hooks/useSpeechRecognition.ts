import { useState, useCallback } from "react";
import { mockPhrases } from "../mocks/data";

export const useSpeechRecognition = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [currentTranscript, setCurrentTranscript] = useState("");

  const startRecording = useCallback(() => {
    setIsRecording(true);
    setIsPaused(false);

    let index = 0;
    const interval = setInterval(() => {
      if (index < mockPhrases.length) {
        setCurrentTranscript(mockPhrases[index]);
        setTranscript((prev) => prev + "\n" + mockPhrases[index]);
        index++;
      } else {
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const pauseRecording = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeRecording = useCallback(() => {
    setIsPaused(false);
    startRecording();
  }, [startRecording]);

  const stopRecording = useCallback(() => {
    setIsRecording(false);
    setIsPaused(false);
    setCurrentTranscript("");
  }, []);

  return {
    isRecording,
    isPaused,
    transcript,
    currentTranscript,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  };
};
