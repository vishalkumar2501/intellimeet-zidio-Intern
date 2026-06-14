import { useState, useRef, useCallback } from "react";
import { uploadMeetingRecording } from "@/services/meetingService";
import { toast } from "sonner";

export const useMeetingRecording = (meetingCode: string) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      });

      let micStream: MediaStream | null = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.warn("Could not capture mic for recording", err);
      }

      const audioContext = new window.AudioContext();
      const destination = audioContext.createMediaStreamDestination();

      if (displayStream.getAudioTracks().length > 0) {
        const displaySource =
          audioContext.createMediaStreamSource(displayStream);
        displaySource.connect(destination);
      }

      if (micStream && micStream.getAudioTracks().length > 0) {
        const micSource = audioContext.createMediaStreamSource(micStream);
        micSource.connect(destination);
      }

      const tracks = [
        ...displayStream.getVideoTracks(),
        ...destination.stream.getAudioTracks(),
      ];

      const combinedStream = new MediaStream(tracks);

      let options = { mimeType: "video/webm;codecs=vp8,opus" };
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        options = { mimeType: "video/webm" };
      }

      const mediaRecorder = new MediaRecorder(combinedStream, options);

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        displayStream.getTracks().forEach((track) => track.stop());
        micStream?.getTracks().forEach((track) => track.stop());

        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        setIsUploading(true);
        const toastId = toast.loading("Uploading recording...");
        try {
          await uploadMeetingRecording(meetingCode, blob);
          toast.success("Recording uploaded successfully!", { id: toastId });
        } catch (error: any) {
          toast.error(error.message || "Failed to upload recording", {
            id: toastId,
          });
        } finally {
          setIsUploading(false);
        }
      };

      displayStream.getVideoTracks()[0].onended = () => {
        if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === "recording"
        ) {
          mediaRecorderRef.current.stop();
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      toast.success("Recording started");
    } catch (error: any) {
      if (error.name !== "NotAllowedError") {
        toast.error(error.message || "Failed to start recording");
      }
      setIsRecording(false);
    }
  }, [meetingCode]);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  return { isRecording, isUploading, startRecording, stopRecording };
};
