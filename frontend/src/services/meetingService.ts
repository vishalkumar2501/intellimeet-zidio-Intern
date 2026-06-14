import { apiFetch } from "@/lib/apiFetch";

type ApiError = Error & { status?: number };

export type MeetingParticipantRecord = {
  user: string | { _id: string; name: string; email: string; avatar?: string };
  role: string;
  leftAt?: string | null;
};

export interface MeetingData {
  _id: string;
  title: string;
  meetingCode: string;
  status: "scheduled" | "ongoing" | "ended";
  createdAt: string;
  endTime?: string;
  recordingUrl?: string;
  createdBy?: { _id: string; name: string; email: string };
  participants: MeetingParticipantRecord[];
}

export interface MeetingDetails extends MeetingData {}

export const countActiveMeetingParticipants = (
  participants: MeetingParticipantRecord[] | undefined,
): number => {
  if (!participants?.length) return 0;
  const trackingLeave = participants.some((p) => p.leftAt != null);
  if (!trackingLeave) return participants.length;
  return participants.filter((p) => p.leftAt == null).length;
};

const createApiError = (status: number, message: string) => {
  const error = new Error(message) as ApiError;
  error.status = status;
  return error;
};

export const createMeeting = async (title: string): Promise<MeetingData> => {
  const res = await apiFetch("/api/meetings/create", {
    method: "POST",
    body: JSON.stringify({ title, startTime: new Date() }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(
      err.message || "Failed to create meeting",
    ) as ApiError;
    error.status = res.status;
    if (err.activeCode) {
      (error as any).activeCode = err.activeCode;
    }
    throw error;
  }
  return res.json();
};

export const joinMeeting = async (
  meetingCode: string,
): Promise<MeetingData> => {
  const res = await apiFetch("/api/meetings/join", {
    method: "POST",
    body: JSON.stringify({ meetingCode }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const error = new Error(err.message || "Meeting not found") as ApiError;
    error.status = res.status;
    if (err.activeCode) {
      (error as any).activeCode = err.activeCode;
    }
    throw error;
  }
  return res.json();
};

export const getMyMeetings = async (): Promise<MeetingData[]> => {
  const res = await apiFetch("/api/meetings/my-meetings");
  if (!res.ok) throw new Error("Failed to fetch meetings");
  return res.json();
};

export const getMeetingDetails = async (
  meetingCode: string,
): Promise<MeetingDetails> => {
  const res = await apiFetch(`/api/meetings/${meetingCode}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw createApiError(
      res.status,
      err.message || "Failed to fetch meeting details",
    );
  }
  return res.json();
};

export const endMeeting = async (
  meetingCode: string,
): Promise<MeetingDetails> => {
  const res = await apiFetch(`/api/meetings/${meetingCode}/end`, {
    method: "PATCH",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw createApiError(res.status, err.message || "Failed to end meeting");
  }
  const data = await res.json();
  return data.meeting;
};

export const uploadMeetingRecording = async (
  meetingCode: string,
  recording: Blob,
): Promise<{ recordingUrl: string; meeting: MeetingDetails }> => {
  const formData = new FormData();
  formData.append(
    "recording",
    recording,
    `meeting-recording-${Date.now()}.webm`,
  );

  const res = await apiFetch(`/api/meetings/${meetingCode}/recording`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw createApiError(
      res.status,
      err.message || "Failed to upload meeting recording",
    );
  }

  const data = await res.json();
  return {
    recordingUrl: data.recordingUrl,
    meeting: data.meeting,
  };
};
