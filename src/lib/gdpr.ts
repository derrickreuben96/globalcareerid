import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';

/**
 * Downloads user data as a JSON file via browser blob.
 */
export function exportDataAsJSON(data: object): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `global-career-id-data-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates a human-readable PDF of career data using jsPDF.
 */
export function exportDataAsPDF(data: object): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  const addText = (text: string, fontSize = 10, isBold = false) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, pageWidth - 30);
    doc.text(lines, 15, y);
    y += lines.length * (fontSize * 0.5) + 4;
  };

  // Title
  addText('Global Career ID — Data Export', 18, true);
  addText(`Generated: ${new Date().toLocaleString()}`, 9);
  y += 6;

  const sections = data as Record<string, unknown>;

  for (const [key, value] of Object.entries(sections)) {
    if (key === 'exportedAt' || key === 'userId') continue;

    addText(key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()), 14, true);
    y += 2;

    if (Array.isArray(value)) {
      if (value.length === 0) {
        addText('No records found.', 10);
      } else {
        value.forEach((item, idx) => {
          addText(`Record ${idx + 1}:`, 10, true);
          for (const [k, v] of Object.entries(item as Record<string, unknown>)) {
            if (v !== null && v !== undefined) {
              addText(`  ${k}: ${String(v)}`, 9);
            }
          }
          y += 2;
        });
      }
    } else if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (v !== null && v !== undefined) {
          addText(`${k}: ${String(v)}`, 10);
        }
      }
    }

    y += 6;
  }

  doc.save(`global-career-id-data-${Date.now()}.pdf`);
}

/**
 * Returns current consent status per type for a given user.
 */
export async function getConsentStatus(
  userId: string
): Promise<Record<string, boolean>> {
  const types = ['marketing', 'analytics', 'data_processing'] as const;
  const result: Record<string, boolean> = {};

  for (const type of types) {
    const { data } = await supabase
      .from('consent_log' as any)
      .select('granted')
      .eq('user_id', userId)
      .eq('consent_type', type)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    result[type] = data ? (data as any).granted : false;
  }

  return result;
}
