import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { AskQuestionRequest } from "@docu-mind/shared";

const CONVERSATIONS_KEY = ["conversations"] as const;
const messagesKey = (conversationId: string) => ["conversations", conversationId, "messages"] as const;

export function useConversations() {
  return useQuery({
    queryKey: CONVERSATIONS_KEY,
    queryFn: () => api.conversations.list().then((res) => res.conversations),
  });
}

export function useConversationMessages(conversationId: string | null) {
  return useQuery({
    queryKey: conversationId ? messagesKey(conversationId) : ["conversations", "none"],
    queryFn: () => api.conversations.messages(conversationId as string).then((res) => res.messages),
    enabled: Boolean(conversationId),
  });
}

export function useAskQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AskQuestionRequest) => api.questions.ask(payload),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
      queryClient.invalidateQueries({ queryKey: messagesKey(result.conversation.id) });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
  });
}

export function useTogglePinConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { id: string; pinned: boolean }) =>
      api.conversations.setPinned(variables.id, variables.pinned),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY }),
  });
}
