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
  verification_number: string;
  employer?: {
    company_name: string;
    address: string | null;
    logo_url: string | null;
    country: string | null;
    phone: string | null;
    website: string | null;
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
        id, content, generated_by, created_at, employment_record_id, employer_id, verification_number,
        employer:employers(company_name, address, logo_url, country, phone, website),
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
      const companyName = letter.employer?.company_name || 'Company';
      const companyAddress = letter.employer?.address || '';
      const companyPhone = letter.employer?.phone || '';
      const companyCountry = letter.employer?.country || '';
      const verificationNumber = letter.verification_number;
      const issueDate = new Date(letter.created_at).toLocaleDateString('en-GB', {
        day: '2-digit', month: 'long', year: 'numeric'
      });

      // Load logos
      let gcidLogoBase64: string | null = null;
      let companyLogoBase64: string | null = null;
      try { gcidLogoBase64 = await loadImageAsBase64(logoSrc); } catch {}
      if (letter.employer?.logo_url) {
        try { companyLogoBase64 = await loadImageAsBase64(letter.employer.logo_url); } catch {}
      }

      const addWatermarks = (p: jsPDF) => {
        p.saveGraphicsState();
        // GCID logo watermark center
        if (gcidLogoBase64) {
          const wmSize = 70;
          p.setGState(p.GState({ opacity: 0.05 }));
          p.addImage(gcidLogoBase64, 'PNG', (pageWidth - wmSize) / 2, (pageHeight - wmSize) / 2 - 10, wmSize, wmSize);
        }
        // Company name diagonal watermark
        p.setGState(p.GState({ opacity: 0.035 }));
        p.setFontSize(55);
        p.setTextColor(100, 100, 100);
        p.text(companyName.toUpperCase(), pageWidth / 2, pageHeight / 2 + 30, { align: 'center', angle: 35 });
        // Verification number watermark (repeated pattern)
        p.setGState(p.GState({ opacity: 0.03 }));
        p.setFontSize(8);
        for (let y = 40; y < pageHeight - 20; y += 35) {
          for (let x = 10; x < pageWidth; x += 60) {
            p.text(verificationNumber, x, y, { angle: 25 });
          }
        }
        // Micro-text border
        p.setGState(p.GState({ opacity: 0.08 }));
        p.setFontSize(4);
        const borderText = `GLOBAL CAREER ID • ${verificationNumber} • VERIFIED DOCUMENT • `;
        const repeatedBorder = borderText.repeat(8);
        p.text(repeatedBorder, margin, 12, { maxWidth: contentWidth });
        p.text(repeatedBorder, margin, pageHeight - 8, { maxWidth: contentWidth });
        p.restoreGraphicsState();

        // Decorative border lines
        pdf.setDrawColor(0, 80, 160);
        pdf.setLineWidth(0.3);
        pdf.rect(8, 8, pageWidth - 16, pageHeight - 16);
        pdf.setDrawColor(200, 200, 200);
        pdf.setLineWidth(0.15);
        pdf.rect(10, 10, pageWidth - 20, pageHeight - 20);
      };

      addWatermarks(pdf);

      // --- CENTERED HEADER ---
      let yPos = 22;

      // Company logo centered
      if (companyLogoBase64) {
        try {
          pdf.addImage(companyLogoBase64, 'PNG', (pageWidth - 20) / 2, yPos, 20, 20);
          yPos += 22;
        } catch { /* skip */ }
      }

      // Company name centered
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(33, 33, 33);
      pdf.text(companyName, pageWidth / 2, yPos, { align: 'center' });
      yPos += 6;

      // Address centered
      if (companyAddress) {
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(100, 100, 100);
        const addrLines = pdf.splitTextToSize(companyAddress, contentWidth - 20);
        for (const line of addrLines) {
          pdf.text(line, pageWidth / 2, yPos, { align: 'center' });
          yPos += 4;
        }
      }

      // Country
      if (companyCountry) {
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.text(companyCountry, pageWidth / 2, yPos, { align: 'center' });
        yPos += 4;
      }

      // Contact
      if (companyPhone) {
        pdf.setFontSize(9);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Tel: ${companyPhone}`, pageWidth / 2, yPos, { align: 'center' });
        yPos += 4;
      }

      yPos += 2;

      // Divider
      pdf.setDrawColor(0, 100, 180);
      pdf.setLineWidth(0.8);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 2;
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 6;

      // Verification number & GCID logo on right
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 80, 160);
      pdf.text(`Ref: ${verificationNumber}`, margin, yPos);
      if (gcidLogoBase64) {
        pdf.addImage(gcidLogoBase64, 'PNG', pageWidth - margin - 15, yPos - 5, 15, 15);
      }
      yPos += 10;

      // --- LETTER CONTENT ---
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(33, 33, 33);

      const lines = pdf.splitTextToSize(letter.content, contentWidth);
      const lineHeight = 5.5;

      for (const line of lines) {
        if (yPos + lineHeight > pageHeight - 55) {
          pdf.addPage();
          addWatermarks(pdf);
          yPos = margin + 5;
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(33, 33, 33);
        }
        pdf.text(line, margin, yPos);
        yPos += lineHeight;
      }

      yPos += 10;

      // --- DIGITAL STAMP ---
      if (yPos + 60 > pageHeight - 30) {
        pdf.addPage();
        addWatermarks(pdf);
        yPos = margin + 5;
      }

      const stampX = pageWidth - margin - 50;
      const stampRadius = 24;
      const stampCenterX = stampX + 25;
      const stampCenterY = yPos + 25;

      // Outer circle
      pdf.setDrawColor(0, 80, 160);
      pdf.setLineWidth(1.5);
      pdf.circle(stampCenterX, stampCenterY, stampRadius);
      // Inner circle
      pdf.setLineWidth(0.5);
      pdf.circle(stampCenterX, stampCenterY, stampRadius - 3);
      // Innermost circle
      pdf.setLineWidth(0.3);
      pdf.circle(stampCenterX, stampCenterY, stampRadius - 6);

      pdf.setFontSize(5.5);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 80, 160);

      // Company name at top of stamp
      const stampNameDisplay = companyName.length > 25 ? companyName.substring(0, 25) + '...' : companyName;
      pdf.text(stampNameDisplay.toUpperCase(), stampCenterX, stampCenterY - 14, { align: 'center' });

      // Star
      pdf.setFontSize(12);
      pdf.text('★', stampCenterX, stampCenterY, { align: 'center' });

      // VERIFIED
      pdf.setFontSize(5);
      pdf.text('VERIFIED • OFFICIAL', stampCenterX, stampCenterY + 7, { align: 'center' });

      // Address in stamp
      if (companyAddress) {
        pdf.setFontSize(3.5);
        pdf.setFont('helvetica', 'normal');
        const shortAddr = companyAddress.length > 45 ? companyAddress.substring(0, 45) + '...' : companyAddress;
        pdf.text(shortAddr, stampCenterX, stampCenterY + 11, { align: 'center' });
      }

      // Date in stamp
      pdf.setFontSize(4.5);
      pdf.setFont('helvetica', 'bold');
      pdf.text(issueDate, stampCenterX, stampCenterY + 15, { align: 'center' });

      // --- FOOTER ---
      const footerY = pageHeight - 18;
      pdf.setDrawColor(200, 200, 200);
      pdf.setLineWidth(0.3);
      pdf.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'italic');
      pdf.setTextColor(150, 150, 150);
      pdf.text('This referral letter was generated and verified through Global Career ID platform.', margin, footerY);
      pdf.text(`Verification: ${verificationNumber}`, pageWidth - margin, footerY, { align: 'right' });

      if (gcidLogoBase64) {
        pdf.addImage(gcidLogoBase64, 'PNG', margin, footerY - 14, 8, 8);
      }
      pdf.setFontSize(6);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Powered by Global Career ID', margin + 10, footerY - 8);
      pdf.text(`Verify at globalcareerid.com | ${verificationNumber}`, margin + 10, footerY - 4);

      const fileName = `Referral_Letter_${companyName.replace(/\s+/g, '_')}_${verificationNumber}.pdf`;
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
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {letter.verification_number}
                </p>
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
          <div className="text-xs text-muted-foreground font-mono mb-2">
            Verification: {previewLetter?.verification_number}
          </div>
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
