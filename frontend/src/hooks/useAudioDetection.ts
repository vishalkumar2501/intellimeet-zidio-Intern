import { useEffect, useRef } from "react";
import { useMeetingStore } from "@/stores/meetingStore";

export const useAudioDetection = (
  userId: string,
  stream: MediaStream | undefined,
) => {
  const { setSpeaking } = useMeetingStore();
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!stream || !userId) return;

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) {
      setSpeaking(userId, false);
      return;
    }

    try {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      sourceRef.current = source;

      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let lastSpeakingState = false;
      const THRESHOLD = 35;
      const SMOOTHING = 0.8;
      let currentVolume = 0;

      const checkAudio = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        currentVolume = average * (1 - SMOOTHING) + currentVolume * SMOOTHING;

        const isSpeaking = currentVolume > THRESHOLD;

        if (isSpeaking !== lastSpeakingState) {
          lastSpeakingState = isSpeaking;
          setSpeaking(userId, isSpeaking);
        }

        animationFrameRef.current = requestAnimationFrame(checkAudio);
      };

      checkAudio();
    } catch (err) {
      console.error("Audio detection error for user", userId, err);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      if (
        audioContextRef.current &&
        audioContextRef.current.state !== "closed"
      ) {
        audioContextRef.current.close();
      }
      setSpeaking(userId, false);
    };
  }, [userId, stream, setSpeaking]);
};
