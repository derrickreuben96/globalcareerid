import { jsPDF } from 'jspdf';

/**
 * Format a deadline as a timezone-safe display string.
 * Example: "15 June 2026, 23:59 (Asia/Kuwait, UTC+03:00)"
 */
export function formatDeadlineDisplay(iso: string, timeZone?: string): string {
  const tz = timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const dateStr = new Intl.DateTimeFormat('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
    timeZone: tz,
  }).format(d);
  // Compute UTC offset for the given tz
  const offsetStr = (() => {
    try {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, timeZoneName: 'shortOffset',
      }).formatToParts(d);
      const off = parts.find(p => p.type === 'timeZoneName')?.value || '';
      return off.replace('GMT', 'UTC');
    } catch { return ''; }
  })();
  return `${dateStr} (${tz}${offsetStr ? `, ${offsetStr}` : ''})`;
}

/** Export job post markdown text as a clean, branded PDF. */
export function exportJobPostPdf(jobPostText: string, jobTitle: string): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 56;
  const maxWidth = pageWidth - margin * 2;

  // Header band (navy)
  doc.setFillColor(15, 23, 42); // navy
  doc.rect(0, 0, pageWidth, 70, 'F');
  doc.setTextColor(245, 197, 66); // gold
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('Global Career ID — Job Post', margin, 44);

  let y = 110;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  const titleLines = doc.splitTextToSize(jobTitle, maxWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 22 + 8;

  // Body — render markdown line by line with simple emphasis handling
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);

  const lines = jobPostText.split('\n');
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (y > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
    if (!line.trim()) { y += 8; continue; }

    // **Bold heading** lines
    const boldMatch = line.match(/^\*\*(.+)\*\*$/);
    if (boldMatch) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(13, 148, 136); // teal
      const wrapped = doc.splitTextToSize(boldMatch[1], maxWidth);
      doc.text(wrapped, margin, y);
      y += wrapped.length * 16 + 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);
      continue;
    }

    // bullets
    if (line.startsWith('- ')) {
      const wrapped = doc.splitTextToSize(`•  ${line.slice(2)}`, maxWidth - 12);
      doc.text(wrapped, margin + 12, y);
      y += wrapped.length * 14 + 2;
      continue;
    }

    // strip markdown emphasis markers for plain lines
    const plain = line.replace(/\*\*(.+?)\*\*/g, '$1');
    const wrapped = doc.splitTextToSize(plain, maxWidth);
    doc.text(wrapped, margin, y);
    y += wrapped.length * 14 + 2;
  }

  // Footer
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text('Generated via Global Career ID — globalcareerid.com', margin, pageHeight - 24);

  const safe = jobTitle.replace(/[^\w]+/g, '_');
  doc.save(`${safe}_job_post.pdf`);
}
