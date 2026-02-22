import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface PendingDocument {
  id: string;
  work_history_id: string;
  file_url: string;
  file_name: string | null;
  review_status: string;
  created_at: string;
  work_history: {
    company_name: string;
    role: string;
    start_date: string;
    end_date: string | null;
    user_id: string;
  } | null;
  user_profile: {
    first_name: string;
    last_name: string;
    profile_id: string;
  } | null;
}

export function AdminDocumentReview() {
  const [documents, setDocuments] = useState<PendingDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);

    const { data: docs, error } = await supabase
      .from('verification_documents')
      .select(`
        id,
        work_history_id,
        file_url,
        file_name,
        review_status,
        created_at,
        work_history:work_history!inner(company_name, role, start_date, end_date, user_id)
      `)
      .eq('review_status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching documents:', error);
      setIsLoading(false);
      return;
    }

    // Enrich with user profiles
    const userIds = [...new Set((docs || []).map((d: any) => d.work_history?.user_id).filter(Boolean))];
    let profiles: any[] = [];
    if (userIds.length > 0) {
      const { data } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, profile_id')
        .in('user_id', userIds);
      profiles = data || [];
    }

    const enriched: PendingDocument[] = (docs || []).map((d: any) => ({
      ...d,
      user_profile: profiles.find(p => p.user_id === d.work_history?.user_id) || null,
    }));

    setDocuments(enriched);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleReview = async (docId: string, workHistoryId: string, decision: 'approved' | 'rejected') => {
    setProcessing(docId);

    const { error: docError } = await supabase
      .from('verification_documents')
      .update({ 
        review_status: decision, 
        reviewed_at: new Date().toISOString() 
      })
      .eq('id', docId);

    if (docError) {
      toast.error('Failed to update document');
      setProcessing(null);
      return;
    }

    // Update work history verification status
    const newStatus = decision === 'approved' ? 'document_verified' : 'rejected';
    await supabase
      .from('work_history')
      .update({ 
        verification_status: newStatus,
        verification_method: 'document',
        verified_at: decision === 'approved' ? new Date().toISOString() : null,
      })
      .eq('id', workHistoryId);

    toast.success(`Document ${decision}`);
    setProcessing(null);
    fetchDocuments();
  };

  const getDocumentUrl = (filePath: string) => {
    const { data } = supabase.storage.from('verification-documents').getPublicUrl(filePath);
    return data.publicUrl;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-semibold text-foreground">Document Reviews</h2>
        <p className="text-sm text-muted-foreground">
          Review uploaded employment verification documents ({documents.length} pending)
        </p>
      </div>

      {documents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No documents pending review</p>
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map(doc => (
            <div key={doc.id} className="border border-border rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="font-medium text-foreground">{doc.file_name || 'Document'}</span>
                    <Badge variant="secondary">Pending Review</Badge>
                  </div>
                  {doc.work_history && (
                    <p className="text-sm text-muted-foreground mb-1">
                      <strong>{doc.work_history.role}</strong> at <strong>{doc.work_history.company_name}</strong>
                    </p>
                  )}
                  {doc.user_profile && (
                    <p className="text-xs text-muted-foreground">
                      Submitted by: {doc.user_profile.first_name} {doc.user_profile.last_name} ({doc.user_profile.profile_id})
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(getDocumentUrl(doc.file_url), '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-verified hover:text-verified"
                    onClick={() => handleReview(doc.id, doc.work_history_id, 'approved')}
                    disabled={processing === doc.id}
                  >
                    {processing === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                    Approve
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleReview(doc.id, doc.work_history_id, 'rejected')}
                    disabled={processing === doc.id}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
