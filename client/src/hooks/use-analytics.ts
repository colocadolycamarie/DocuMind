import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

export function useAnalytics() {
  return useQuery({
    queryKey: ["analytics"],
    queryFn: () => api.analytics.get(),
  });
}
