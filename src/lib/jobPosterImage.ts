import QRCode from 'qrcode';

export interface JobPosterData {
  companyName: string;
  jobTitle: string;
  responsibilities: string[]; // 3–5
  deadline?: string;
  applyUrl: string;
  location?: string;
}

// Brand colors (Navy / Teal / Gold)
const NAVY = '#0B2545';
const NAVY_DARK = '#081B33';
const TEAL = '#13A8A8';
const GOLD = '#E5B947';
const WHITE = '#FFFFFF';
const MUTED = '#CBD5E1';

const W = 1080;
const H = 1350; // 4:5 social-friendly

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const w of words) {
    const trial = current ? `${current} ${w}` : w;
    if (ctx.measureText(trial).width > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = trial;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function generateJobPosterImage(data: JobPosterData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, NAVY);
  bg.addColorStop(1, NAVY_DARK);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Header bar
  ctx.fillStyle = TEAL;
  ctx.fillRect(0, 0, W, 8);

  // Company name (header)
  ctx.fillStyle = MUTED;
  ctx.font = '600 28px Inter, system-ui, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('WE ARE HIRING', 64, 56);

  ctx.fillStyle = WHITE;
  ctx.font = '700 44px Inter, system-ui, sans-serif';
  const companyLines = wrapText(ctx, data.companyName.toUpperCase(), W - 128);
  let y = 96;
  companyLines.slice(0, 2).forEach((l) => {
    ctx.fillText(l, 64, y);
    y += 56;
  });

  // Hero band (solid color block — no role-image hallucination)
  const heroY = y + 24;
  const heroH = 220;
  const heroGrad = ctx.createLinearGradient(0, heroY, W, heroY + heroH);
  heroGrad.addColorStop(0, TEAL);
  heroGrad.addColorStop(1, '#0E7A7A');
  ctx.fillStyle = heroGrad;
  ctx.fillRect(64, heroY, W - 128, heroH);

  // Job title on hero
  ctx.fillStyle = WHITE;
  ctx.font = '800 64px Inter, system-ui, sans-serif';
  const titleLines = wrapText(ctx, data.jobTitle, W - 192);
  let ty = heroY + heroH / 2 - (titleLines.length * 36);
  titleLines.slice(0, 2).forEach((l) => {
    ctx.fillText(l, 96, ty);
    ty += 72;
  });

  if (data.location) {
    ctx.font = '500 24px Inter, system-ui, sans-serif';
    ctx.fillStyle = WHITE;
    ctx.fillText(`📍 ${data.location}`, 96, heroY + heroH - 44);
  }

  // Responsibilities
  let ry = heroY + heroH + 48;
  ctx.fillStyle = GOLD;
  ctx.font = '700 30px Inter, system-ui, sans-serif';
  ctx.fillText('KEY RESPONSIBILITIES', 64, ry);
  ry += 50;

  ctx.fillStyle = WHITE;
  ctx.font = '400 26px Inter, system-ui, sans-serif';
  const bullets = data.responsibilities.slice(0, 5);
  for (const b of bullets) {
    const lines = wrapText(ctx, b, W - 160);
    // Bullet dot
    ctx.fillStyle = TEAL;
    ctx.beginPath();
    ctx.arc(80, ry + 14, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = WHITE;
    lines.forEach((l, i) => {
      ctx.fillText(l, 104, ry + i * 34);
    });
    ry += lines.length * 34 + 14;
  }

  // Deadline (highlighted)
  if (data.deadline) {
    const dy = H - 360;
    ctx.fillStyle = GOLD;
    ctx.fillRect(64, dy, W - 128, 64);
    ctx.fillStyle = NAVY;
    ctx.font = '700 28px Inter, system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(`⏰ APPLY BY: ${data.deadline}`, 88, dy + 32);
    ctx.textBaseline = 'top';
  }

  // QR code
  const qrDataUrl = await QRCode.toDataURL(data.applyUrl, {
    width: 240,
    margin: 1,
    color: { dark: '#000000', light: '#FFFFFF' },
    errorCorrectionLevel: 'H',
  });
  const qrImg = new Image();
  await new Promise<void>((res, rej) => {
    qrImg.onload = () => res();
    qrImg.onerror = () => rej(new Error('QR load failed'));
    qrImg.src = qrDataUrl;
  });

  const qrSize = 220;
  const qrX = W - qrSize - 64;
  const qrY = H - qrSize - 64;
  // White card behind QR
  ctx.fillStyle = WHITE;
  ctx.fillRect(qrX - 16, qrY - 16, qrSize + 32, qrSize + 32);
  ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

  // Apply CTA text
  ctx.fillStyle = WHITE;
  ctx.font = '700 30px Inter, system-ui, sans-serif';
  ctx.fillText('APPLY NOW', 64, qrY);
  ctx.font = '400 22px Inter, system-ui, sans-serif';
  ctx.fillStyle = MUTED;
  const urlLines = wrapText(ctx, 'Scan QR or visit the link to apply via your Global Career ID', qrX - 96);
  urlLines.slice(0, 4).forEach((l, i) => {
    ctx.fillText(l, 64, qrY + 48 + i * 30);
  });

  // Footer brand
  ctx.fillStyle = TEAL;
  ctx.font = '600 20px Inter, system-ui, sans-serif';
  ctx.fillText('Powered by Global Career ID', 64, H - 40);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png');
  });
}

export function extractResponsibilities(description: string, postText?: string | null): string[] {
  // Prefer parsed bullets from generated post
  if (postText) {
    const lines = postText.split('\n').map((l) => l.trim());
    const bullets = lines
      .filter((l) => /^[-*•]\s+/.test(l))
      .map((l) => l.replace(/^[-*•]\s+/, '').trim())
      .filter(Boolean);
    if (bullets.length >= 3) return bullets.slice(0, 5);
  }
  // Fallback: split description sentences
  const sentences = description
    .split(/[.\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12 && s.length < 140);
  return sentences.slice(0, 5);
}
