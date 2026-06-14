import { apiFetch } from "@/lib/apiFetch";
import { useAuthStore } from "@/stores/authStore";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const updateUsername = async (username: string): Promise<void> => {
  const res = await apiFetch("/api/auth/profile", {
    method: "PATCH",
    body: JSON.stringify({ username }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to update username");
  }
  const data = await res.json();
  useAuthStore.getState().updateUser({ username: data.username });
};

export const uploadAvatar = async (
  file: File,
  onProgress?: (percent: number) => void,
): Promise<string> => {
  const store = useAuthStore.getState();
  let token = store.accessToken;

  const formData = new FormData();
  formData.append("avatar", file);

  const xhrRequest = (t: string | null): Promise<any> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", `${API_BASE}/api/auth/avatar-upload`);
      xhr.withCredentials = true;

      if (t) xhr.setRequestHeader("Authorization", `Bearer ${t}`);

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject({ status: xhr.status, response: xhr.responseText });
        }
      };

      xhr.onerror = () =>
        reject({ status: xhr.status, message: "Network error" });
      xhr.send(formData);
    });
  };

  try {
    let data;
    try {
      data = await xhrRequest(token);
    } catch (err: any) {
      if (err.status === 401) {
        const newToken = await store.refreshAccessToken();
        if (newToken) {
          data = await xhrRequest(newToken);
        } else {
          throw new Error("Session expired. Please login again.");
        }
      } else {
        const parsed = JSON.parse(err.response || "{}");
        throw new Error(parsed.message || "Failed to upload avatar");
      }
    }

    useAuthStore.getState().updateUser({ avatar: data.avatar });
    return data.avatar;
  } catch (error: any) {
    throw error;
  }
};
