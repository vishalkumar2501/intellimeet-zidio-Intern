import { apiFetch } from "@/lib/apiFetch";

export interface ChatMessage {
  _id: string;
  content: string;
  sender: {
    _id: string;
    name: string;
    avatar?: string;
  };
  timestamp: string;
}

export const getChatHistory = async (meetingCode: string): Promise<ChatMessage[]> => {
  const res = await apiFetch(`/api/chats/${meetingCode}`);
  if (!res.ok) throw new Error("Failed to fetch chat history");
  return res.json();
};
