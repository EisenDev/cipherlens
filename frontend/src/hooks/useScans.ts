import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client';

export interface ScanRecord {
  id: string;
  status: 'COMPLETED' | 'RUNNING' | 'QUEUED' | 'FAILED' | 'CANCELLED';
  scanType: string;
  score: number | null;
  duration: number | null;
  createdAt: string;
  scanName?: string | null;
  scanTags?: string | null;
  crawling?: Record<string, any> | null;
  auth?: Record<string, any> | null;
  proxy?: Record<string, any> | null;
  performance?: Record<string, any> | null;
  exclusions?: Record<string, any> | null;
  headers?: Array<Record<string, any>> | null;
  target: {
    name: string;
    url: string;
    type: 'WEBSITE' | 'REPOSITORY';
  };
}

export interface ScanSummary {
  total: number;
  completed: number;
  running: number;
  queued: number;
  failed: number;
}

export interface ScanCreateParams {
  targetUrl: string;
  targetType: 'WEBSITE' | 'REPOSITORY';
  scanType?: string;
  scanName?: string;
  scanTags?: string;
  modules?: string[];
  crawling?: Record<string, any>;
  auth?: Record<string, any>;
  proxy?: Record<string, any>;
  performance?: Record<string, any>;
  exclusions?: Record<string, any>;
  headers?: Array<Record<string, any>>;
}

export function useScans(params: {
  page: number;
  limit: number;
  status?: string;
  scanType?: string;
  assetType?: string;
  search?: string;
}) {
  return useQuery<{
    data: ScanRecord[];
    total: number;
    page: number;
    limit: number;
    last_page: number;
  }>({
    queryKey: ['scans', params],
    queryFn: () => {
      const query = new URLSearchParams({
        page: String(params.page),
        limit: String(params.limit),
      });
      if (params.status) query.append('status', params.status);
      if (params.scanType) query.append('scan_type', params.scanType);
      if (params.assetType) query.append('asset_type', params.assetType);
      if (params.search) query.append('search', params.search);

      return apiRequest(`/api/scans?${query.toString()}`);
    },
    placeholderData: (previousData) => previousData,
  });
}

export function useScanSummary() {
  return useQuery<ScanSummary>({
    queryKey: ['scanSummary'],
    queryFn: () => apiRequest('/api/dashboard/scan-summary'),
    refetchInterval: 10000, // Poll statistics every 10 seconds for real-time dashboard progress
  });
}

export function useCreateScan() {
  const queryClient = useQueryClient();
  return useMutation<ScanRecord, Error, ScanCreateParams>({
    mutationFn: (newScan) =>
      apiRequest('/api/scans', {
        method: 'POST',
        body: JSON.stringify(newScan),
      }),
    onSuccess: () => {
      // Invalidate queries so stats and table lists update immediately
      queryClient.invalidateQueries({ queryKey: ['scans'] });
      queryClient.invalidateQueries({ queryKey: ['scanSummary'] });
    },
  });
}

export function useDeleteScan() {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean; message: string }, Error, string>({
    mutationFn: (id) =>
      apiRequest(`/api/scans/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans'] });
      queryClient.invalidateQueries({ queryKey: ['scanSummary'] });
    },
  });
}

export function usePatchScan() {
  const queryClient = useQueryClient();
  return useMutation<ScanRecord, Error, { id: string; status?: string; score?: number; duration?: number }>({
    mutationFn: ({ id, ...body }) =>
      apiRequest(`/api/scans/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans'] });
      queryClient.invalidateQueries({ queryKey: ['scanSummary'] });
    },
  });
}

export interface ModuleProgress {
  name: string;
  status: 'WAITING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress: number;
}

export interface ScanProgress {
  scanId: string;
  status: string;
  targetUrl: string;
  startedAt: string | null;
  elapsedTime: number | null;
  currentlyExecuting: string | null;
  modules: ModuleProgress[];
}

export interface ScanLogItem {
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
}

export interface ScanLogs {
  scanId: string;
  logs: ScanLogItem[];
}

export function useScanProgress(id: string | null, enabled: boolean = false) {
  return useQuery<ScanProgress>({
    queryKey: ['scanProgress', id],
    queryFn: () => apiRequest(`/api/scans/${id}/progress`),
    enabled: !!id && enabled,
    refetchInterval: (_query) => {
      const data = _query.state.data;
      if (data && (data.status === 'RUNNING' || data.status === 'QUEUED')) {
        return 3000; // Poll progress every 3 seconds for active running scans
      }
      return false;
    },
  });
}

export function useScanLogs(id: string | null, enabled: boolean = false) {
  return useQuery<ScanLogs>({
    queryKey: ['scanLogs', id],
    queryFn: () => apiRequest(`/api/scans/${id}/logs`),
    enabled: !!id && enabled,
    refetchInterval: () => {
      // Invalidate/refetch logs during running scans
      return 3000;
    },
  });
}

export interface RealScanStatus {
  status: string;
  progress: number;
  score: number | null;
  overallScore?: number;
  posture?: string;
  confidence?: string;
  attackSurface?: number;
  positiveSignals?: number;
  negativeSignals?: number;
  criticalFindings?: number;
  highFindings?: number;
  mediumFindings?: number;
  lowFindings?: number;
  infoFindings?: number;
  totalFindings?: number;
  uniqueFindingCount?: number;
  topContributors?: any[];
  moduleScores?: Record<string, any>;
  scoreBreakdown?: any;
  postureColor?: string;
  postureIcon?: string;
  summary?: string;
  confidenceScore?: number;
  coverageScore?: number;
  recommendation?: string;
  targetUrl: string;
  scanType: string;
  targetType: string;
  currentModule: string | null;
  currentTool: string | null;
  startedAt: string | null;
  completedAt: string | null;
  elapsedTime: number | null;
  estimatedRemaining: number | null;
  completedModules: string[];
  failedModules: string[];
  queuedModules: string[];
  modules: Record<string, {
    status: 'WAITING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED' | 'CANCELLED';
    duration: number | null;
    error: string | null;
  }>;
}

export function useRealScanStatus(id: string | null, enabled: boolean = false) {
  return useQuery<RealScanStatus>({
    queryKey: ['realScanStatus', id],
    queryFn: () => apiRequest(`/api/scans/${id}/status`),
    enabled: !!id && enabled,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && ['RUNNING', 'QUEUED', 'PREPARING'].includes(data.status)) {
        return 2000;
      }
      return false;
    },
  });
}


export function useCancelScan() {
  const queryClient = useQueryClient();
  return useMutation<ScanRecord, Error, string>({
    mutationFn: (id) =>
      apiRequest(`/api/scans/${id}/cancel`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans'] });
      queryClient.invalidateQueries({ queryKey: ['scanSummary'] });
    },
  });
}

export function useRetryScan() {
  const queryClient = useQueryClient();
  return useMutation<ScanRecord, Error, string>({
    mutationFn: (id) =>
      apiRequest(`/api/scans/${id}/retry`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scans'] });
      queryClient.invalidateQueries({ queryKey: ['scanSummary'] });
    },
  });
}

export interface RegisteredScanner {
  name: string;
  version: string;
  description: string;
  tool: string;
  tool_version: string;
  target_types: string[];
  output_format: string;
}

export interface ScanProfileData {
  id: 'QUICK' | 'STANDARD' | 'ADVANCED' | 'CUSTOM';
  name: string;
  plan: string;
  badgeType: 'free' | 'basic' | 'premium';
  description: string;
  duration: string;
  configurable: boolean;
  modules: {
    WEBSITE: string[];
    REPOSITORY: string[];
  };
}

export function useRegisteredScanners() {
  return useQuery<RegisteredScanner[]>({
    queryKey: ['registeredScanners'],
    queryFn: () => apiRequest('/api/scans/scanners/registered'),
  });
}

export function useScanProfiles() {
  return useQuery<ScanProfileData[]>({
    queryKey: ['scanProfiles'],
    queryFn: () => apiRequest('/api/scans/scan-profiles/list'),
  });
}

export interface ScanResultItem {
  id: string;
  scanId: string;
  findingCode: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  description: string;
  evidence: string;
  filePath: string | null;
  lineNumber: number | null;
  remediation: string;
  module: string | null;
  tool: string | null;
  category: string | null;
  references: string | null;
  rawData: string | null;
  createdAt: string;
}

export interface ScanResultsResponse {
  scanId: string;
  results: ScanResultItem[];
}

export function useScanResults(id: string | null, enabled: boolean = false) {
  return useQuery<ScanResultsResponse>({
    queryKey: ['scanResults', id],
    queryFn: () => apiRequest(`/api/scans/${id}/results`),
    enabled: !!id && enabled,
  });
}

