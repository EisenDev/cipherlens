import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client';

export interface ScanScheduleRecord {
  id: string;
  name: string;
  targetUrl: string;
  targetType: 'WEBSITE' | 'REPOSITORY';
  scanType: string;
  selectedModules?: string | null; // JSON list string
  advancedConfig?: string | null;  // JSON config string
  frequency: 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CRON';
  cronExpression?: string | null;
  startDate: string;
  startTime: string;
  timezone: string;
  isActive: boolean;
  lastRunAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleCreateParams {
  name: string;
  targetUrl: string;
  targetType: 'WEBSITE' | 'REPOSITORY';
  scanType?: string;
  modules?: string[];
  crawling?: Record<string, any>;
  auth?: Record<string, any>;
  proxy?: Record<string, any>;
  performance?: Record<string, any>;
  exclusions?: Record<string, any>;
  headers?: Array<Record<string, any>>;
  frequency: 'ONCE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'CRON';
  cronExpression?: string;
  startDate: string;
  startTime: string;
  timezone?: string;
  isActive?: boolean;
}

export function useSchedules() {
  return useQuery<ScanScheduleRecord[]>({
    queryKey: ['schedules'],
    queryFn: () => apiRequest('/api/schedules'),
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  return useMutation<ScanScheduleRecord, Error, ScheduleCreateParams>({
    mutationFn: (newSchedule) =>
      apiRequest('/api/schedules', {
        method: 'POST',
        body: JSON.stringify(newSchedule),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  return useMutation<ScanScheduleRecord, Error, { id: string; payload: Partial<ScheduleCreateParams> }>({
    mutationFn: ({ id, payload }) =>
      apiRequest(`/api/schedules/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      apiRequest(`/api/schedules/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });
}
