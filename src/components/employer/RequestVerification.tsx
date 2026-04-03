import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, Send, CheckCircle } from 'lucide-react';

interface RequestVerificationProps {
  employerId: string;
  companyName: string;
  verificationStatus: string;
}

export function RequestVerification({ employerId, companyName, verificationStatus }: RequestVerificationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('request-employer-verification', {
        body: { employerId },
      });

      if (error) throw error;

      // Update local verification status
      await supabase
        .from('employers')
        .update({ verification_status: 'pending' })
        .eq('id', employerId);

      setSubmitted(true);
      toast.success('Verification request submitted successfully');
    } catch (err) {
      console.error('Verification request failed:', err);
      toast.error('Failed to submit verification request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (verificationStatus === 'pending') {
    return null;
  }

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="gap-2 border-primary text-primary hover:bg-primary/10"
      >
        <ShieldCheck className="w-4 h-4" />
        Request Verification
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Request Company Verification
            </DialogTitle>
            <DialogDescription>
              Submit your company for verification to unlock employee management features.
            </DialogDescription>
          </DialogHeader>

          {submitted ? (
            <div className="text-center py-6">
              <CheckCircle className="w-12 h-12 text-verified mx-auto mb-3" />
              <p className="font-semibold text-foreground">Request Submitted!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Our team will review your company details within 24-48 hours.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3 py-2">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium text-foreground">{companyName}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Please ensure your company profile is complete before requesting verification.
                    Our team will review your registration number, industry, and contact details.
                  </p>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>✓ Company name and registration number</p>
                  <p>✓ Valid contact information</p>
                  <p>✓ Company logo uploaded</p>
                  <p>✓ Industry and country specified</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting} className="gap-2">
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
