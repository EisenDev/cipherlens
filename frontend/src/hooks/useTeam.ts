import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client';

export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface TeamMemberInviteParams {
  fullName: string;
  email: string;
  role: string;
}

export interface TeamMemberUpdateParams {
  role?: string;
  isActive?: boolean;
}

export function useTeamMembers() {
  return useQuery<TeamMember[]>({
    queryKey: ['team-members'],
    queryFn: () => apiRequest('/api/teams'),
  });
}

export function useInviteTeamMember() {
  const queryClient = useQueryClient();
  return useMutation<TeamMember, Error, TeamMemberInviteParams>({
    mutationFn: (newMember) =>
      apiRequest('/api/teams/invite', {
        method: 'POST',
        body: JSON.stringify(newMember),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
  });
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();
  return useMutation<TeamMember, Error, { id: string; payload: TeamMemberUpdateParams }>({
    mutationFn: ({ id, payload }) =>
      apiRequest(`/api/teams/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
  });
}

export function useDeleteTeamMember() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) =>
      apiRequest(`/api/teams/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
    },
  });
}
