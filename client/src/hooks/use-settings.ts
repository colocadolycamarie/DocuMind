import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { UpdateSettingsRequest } from "@docu-mind/shared";

const SETTINGS_KEY = ["settings"] as const;

export function useSettings() {
  return useQuery({
    queryKey: SETTINGS_KEY,
    queryFn: () => api.settings.get().then((res) => res.settings),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateSettingsRequest) => api.settings.update(payload),
    onSuccess: (result) => {
      queryClient.setQueryData(SETTINGS_KEY, result.settings);
    },
  });
}
