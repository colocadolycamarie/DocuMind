import type {
  Analytics,
  AskQuestionRequest,
  AskQuestionResponse,
  CollectionSummary,
  Conversation,
  Document,
  Message,
  Settings,
  UpdateSettingsRequest,
} from "@docu-mind/shared";

// In production (Vercel), the API is served from the same origin via a
// rewrite, so a relative "/api" works without any env var. Local dev talks
// to the standalone Express server directly unless overridden.
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.PROD ? "/api" : "http://localhost:4000/api");

export class ApiRequestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers:
      init?.body instanceof FormData
        ? init.headers
        : { "Content-Type": "application/json", ...init?.headers },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiRequestError(response.status, body?.error?.message ?? response.statusText);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  documents: {
    list: () => request<{ documents: Document[] }>("/documents"),
    get: (id: string) => request<{ document: Document }>(`/documents/${id}`),
    collections: () => request<{ collections: CollectionSummary[] }>("/documents/collections"),
    upload: (file: File, options: { collection?: string; tags?: string[] } = {}) => {
      const formData = new FormData();
      formData.append("file", file);
      if (options.collection) formData.append("collection", options.collection);
      if (options.tags?.length) formData.append("tags", options.tags.join(","));
      return request<{ document: Document }>("/documents", { method: "POST", body: formData });
    },
    delete: (id: string) => request<void>(`/documents/${id}`, { method: "DELETE" }),
    fileUrl: (id: string) => `${API_BASE_URL}/documents/${id}/file`,
  },
  conversations: {
    list: () => request<{ conversations: Conversation[] }>("/conversations"),
    messages: (id: string) => request<{ messages: Message[] }>(`/conversations/${id}/messages`),
    setPinned: (id: string, pinned: boolean) =>
      request<void>(`/conversations/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ pinned }),
      }),
  },
  questions: {
    ask: (payload: AskQuestionRequest) =>
      request<AskQuestionResponse>("/questions", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },
  analytics: {
    get: () => request<Analytics>("/analytics"),
  },
  settings: {
    get: () => request<{ settings: Settings }>("/settings"),
    update: (payload: UpdateSettingsRequest) =>
      request<{ settings: Settings }>("/settings", {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
  },
};
