import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getErrorLogs, deleteErrorLog, clearErrorLogs } from '@/services/errorLogService';

const keys = { all: ['error-logs'] as const };

export function useErrorLogs() {
  return useQuery({ queryKey: keys.all, queryFn: () => getErrorLogs() });
}

export function useDeleteErrorLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteErrorLog(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
}

export function useClearErrorLogs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => clearErrorLogs(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: keys.all }),
  });
}
