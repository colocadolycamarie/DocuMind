import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

const DOCUMENTS_KEY = ["documents"] as const;
const COLLECTIONS_KEY = ["documents", "collections"] as const;

export function useDocuments() {
  return useQuery({
    queryKey: DOCUMENTS_KEY,
    queryFn: () => api.documents.list().then((res) => res.documents),
    // Poll while any document is still processing so status updates reach the UI
    // without the user needing to refresh.
    refetchInterval: (query) => {
      const documents = query.state.data;
      const hasPending = documents?.some(
        (doc) => doc.status === "processing" || doc.status === "queued",
      );
      return hasPending ? 2000 : false;
    },
  });
}

export function useCollections() {
  return useQuery({
    queryKey: COLLECTIONS_KEY,
    queryFn: () => api.documents.collections().then((res) => res.collections),
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { file: File; collection?: string; tags?: string[] }) =>
      api.documents.upload(variables.file, {
        collection: variables.collection,
        tags: variables.tags,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
      queryClient.invalidateQueries({ queryKey: COLLECTIONS_KEY });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (documentId: string) => api.documents.delete(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY });
      queryClient.invalidateQueries({ queryKey: COLLECTIONS_KEY });
    },
  });
}
