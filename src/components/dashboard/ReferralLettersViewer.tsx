import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Download, Eye, Loader2, Award } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import logoSrc from '@/assets/logo.png';

interface ReferralLetter {
  id: string;
  content: string;
  generated_by: string;
  created_at: string;
  employment_record_id: string;
  employer_id: string;
  employer?: {
    company_name: string;
    address: string | null;
    logo_url: string | null;
    country: string | null;
  };
  employment_record?: {
    job_title: string;
    start_date: string;
    end_date: string | null;
  };
}

export function ReferralLettersViewer() {
  const { user } = useAuth();
  const [letters, setLetters] = useState<ReferralLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewLetter, setPreviewLetter] = useState<ReferralLetter | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchLetters = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('referral_letters')
      .select(`
        id, content, generated_by, created_at, employment_record_id, employer_id,
        employer:employers(company_name, address, logo_url, country),
        employment_record:employment_records(job_title, start_date, end_date)
      `)
      .eq('employee_user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching referral letters:', error);
      toast.error('Failed to load referral letters');
    } else {
      setLetters((data as any) || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchLetters();
  }, [fetchLetters]);

  // Load an image as base64 data URL
  const loadImageAsBase64 = (src: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = reject;
      img.src = src;
    });
  };

  const generatePDF = async (letter: ReferralLetter) => {
    setDownloadingId(letter.id);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;

      // Load Global Career ID logo for watermark
      let gcidLogoBase64: string | null = null;
      try {
        gcidLogoBase64 = await loadImageAsBase64(logoSrc);
      } catch { /* skip if fails */ }

      // Load company logo if available
      let companyLogoBase64: string | null = null;
      if (letter.employer?.logo_url) {
        try {
          companyLogoBase64 = await loadImageAsBase64(letter.employer.logo_url);
        } catch { /* skip */ }
      }

      // --- WATERMARK LAYER ---
      pdf.saveGraphicsState();
      // Global Career ID watermark - center diagonal
      if (gcidLogoBase64) {
        // Faint logo watermark in center
        const wmSize = 80;
        const wmX = (pageWidth - wmSize) / 2;
        const wmY = (pageHeight - wmSize) / 2 - 10;
        pdf.setGState(pdf.GState({ opacity: 0.06 }));
        pdf.addImage(gcidLogoBase64, 'PNG', wmX, wmY, wmSize, wmSize);
      }

      // Company name watermark text (diagonal)
      const companyName = letter.employer?.company_name || 'Company';
      pdf.setGState(pdf.GState({ opacity: 0.04 }));
      pdf.setFontSize(60);
      pdf.setTextColor(100, 100, 100);
      // Rotate text diagonally
      const centerX = pageWidth / 2;
      const centerY = pageHeight / 2;
      pdf.text(companyName.toUpperCase(), centerX, centerY + 30, {
        align: 'center',
        angle: 35,
      });

      pdf.restoreGraphicsState();

      // --- HEADER ---
      let yPos = margin;

      // Company logo (top-left) if available
      if (companyLogoBase64) {
        try {
          pdf.addImage(companyLogoBase64, 'PNG', margin, yPos, 25, 25);
        } catch { /* skip */ }
      }

      // Global Career ID logo (top-right)
      if (gcidLogoBase64) {
        pdf.addImage(gcidLogoBase64, 'PNG', pageWidth - margin - 25, yPos, 25, 25);
      }

      // Company header text
      const headerX = companyLogoBase64 ? margin + 30 : margin;
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(33, 33, 33);
      pdf.text(companyName, headerX, yPos + 10);

      if (letter.employer?.address) {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 100, 100);
        const addrLines = pdf.splitTextToSize(letter.employer.address, contentWidth - 60);
        pdf.text(addrLines, headerX, yPos + 16);
      }

      if (letter.employer?.country) {
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.text(letter.employer.country, headerX, yPos + 22);
      }

      yPos += 32;

      // Divider line
      pdf.setDrawColor(0, 100, 180);
      pdf.setLineWidth(0.8);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 4;

      // Thin secondary line
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      // --- LETTER CONTENT ---
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(33, 33, 33);

      const lines = pdf.splitTextToSize(letter.content, contentWidth);
      const lineHeight = 5.5;

      for (const line of lines) {
        if (yPos + lineHeight > pageHeight - 50) {
          // New page with watermark
          pdf.addPage();
          yPos = margin;

          // Re-add watermark on new page
          pdf.saveGraphicsState();
          if (gcidLogoBase64) {
            const wmSize = 80;
            pdf.setGState(pdf.GState({ opacity: 0.06 }));
            pdf.addImage(gcidLogoBase64, 'PNG', (pageWidth - wmSize) / 2, (pageHeight - wmSize) / 2 - 10, wmSize, wmSize);
          }
          pdf.setGState(pdf.GState({ opacity: 0.04 }));
          pdf.setFontSize(60);
          pdf.setTextColor(100, 100, 100);
          pdf.text(companyName.toUpperCase(), pageWidth / 2, pageHeight / 2 + 30, { align: 'center', angle: 35 });
          pdf.restoreGraphicsState();

          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(33, 33, 33);
        }
        pdf.text(line, margin, yPos);
        yPos += lineHeight;
      }

      yPos += 10;

      // --- COMPANY STAMP ---
      if (yPos + 55 > pageHeight - 30) {
        pdf.addPage();
        yPos = margin;
      }

      // Generate stamp
      const stampX = pageWidth - margin - 50;
      const stampY = yPos;
      const stampRadius = 22;
      const stampCenterX = stampX + 25;
      const stampCenterY = stampY + 25;

      // Outer circle
      pdf.setDrawColor(0, 80, 160);
      pdf.setLineWidth(1.5);
      pdf.circle(stampCenterX, stampCenterY, stampRadius);

      // Inner circle
      pdf.setLineWidth(0.5);
      pdf.circle(stampCenterX, stampCenterY, stampRadius - 3);

      // Company name around the stamp (top arc text)
      pdf.setFontSize(6);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 80, 160);

      const stampName = companyName.toUpperCase();
      // Place company name at top of stamp
      pdf.text(stampName, stampCenterX, stampCenterY - 12, { align: 'center' });

      // Star or symbol in center
      pdf.setFontSize(14);
      pdf.text('★', stampCenterX, stampCenterY + 2, { align: 'center' });

      // "VERIFIED" text at bottom
      pdf.setFontSize(5);
      pdf.text('VERIFIED • OFFICIAL', stampCenterX, stampCenterY + 9, { align: 'center' });

      // Address line in stamp
      if (letter.employer?.address) {
        pdf.setFontSize(4);
        pdf.setFont('helvetica', 'normal');
        const shortAddr = letter.employer.address.length > 40
          ? letter.employer.address.substring(0, 40) + '...'
          : letter.employer.address;
        pdf.text(shortAddr, stampCenterX, stampCenterY + 14, { align: 'center' });
      }

      // --- FOOTER ---
      const footerY = pageHeight - 15;
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(150, 150, 150);
      pdf.text('This referral letter was generated and verified through Global Career ID platform.', margin, footerY);
      pdf.text(`Document ID: ${letter.id.substring(0, 8).toUpperCase()}`, pageWidth - margin, footerY, { align: 'right' });

      // Global Career ID branding footer
      if (gcidLogoBase64) {
        pdf.addImage(gcidLogoBase64, 'PNG', margin, footerY - 12, 8, 8);
      }
      pdf.setFontSize(6);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(150, 150, 150);
      pdf.text('Powered by Global Career ID', margin + 10, footerY - 6);

      // Save the PDF
      const fileName = `Referral_Letter_${companyName.replace(/\s+/g, '_')}_${new Date(letter.created_at).toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF generation error:', error);
      toast.error('Failed to generate PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (letters.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <h2 className="text-xl font-display font-semibold text-foreground mb-4">
          Referral Letters
        </h2>
        <div className="text-center py-12 text-muted-foreground">
          <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No referral letters yet.</p>
          <p className="text-sm">Letters will appear here when employers write them for you.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <h2 className="text-xl font-display font-semibold text-foreground mb-2">
        Referral Letters
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Letters from your employers — view or download as PDF
      </p>

      <div className="space-y-4">
        {letters.map((letter) => (
          <div
            key={letter.id}
            className="border border-border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {letter.employer?.company_name || 'Unknown Company'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {letter.employment_record?.job_title || 'Position'} •{' '}
                  {new Date(letter.created_at).toLocaleDateString()}
                </p>
                <Badge variant="outline" className="mt-1 text-xs">
                  {letter.generated_by === 'ai' ? 'AI Generated' : 'Manual'}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2 ml-auto sm:ml-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPreviewLetter(letter)}
              >
                <Eye className="w-4 h-4 mr-1" />
                View
              </Button>
              <Button
                size="sm"
                onClick={() => generatePDF(letter)}
                disabled={downloadingId === letter.id}
              >
                {downloadingId === letter.id ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-1" />
                )}
                PDF
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewLetter} onOpenChange={() => setPreviewLetter(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Referral Letter — {previewLetter?.employer?.company_name}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="prose prose-sm max-w-none p-4 bg-muted/30 rounded-lg whitespace-pre-wrap font-serif text-foreground leading-relaxed">
              {previewLetter?.content}
            </div>
          </ScrollArea>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setPreviewLetter(null)}>
              Close
            </Button>
            {previewLetter && (
              <Button
                onClick={() => generatePDF(previewLetter)}
                disabled={downloadingId === previewLetter.id}
              >
                {downloadingId === previewLetter.id ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-1" />
                )}
                Download PDF
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
