import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface IssueCredentialParams {
  profileId: string;
  employerId: string;
  role: string;
  startDate: string;
  endDate?: string;
}

export function useCredential() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const credentialsQuery = useQuery({
    queryKey: ['credentials', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('credentials' as any)
        .select('*')
        .eq('profile_id', user.id)
        .order('issued_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const issueCredential = useMutation({
    mutationFn: async (params: IssueCredentialParams) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/sign-credential`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(params),
        }
      );

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to issue credential');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials', user?.id] });
    },
  });

  const revokeCredential = useMutation({
    mutationFn: async (credentialId: string) => {
      const { error } = await supabase
        .from('credentials' as any)
        .update({ revoked_at: new Date().toISOString(), revoked_by: user?.id } as any)
        .eq('id', credentialId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials', user?.id] });
    },
  });

  return {
    credentials: credentialsQuery.data,
    isLoading: credentialsQuery.isLoading,
    issueCredential,
    revokeCredential,
  };
}
