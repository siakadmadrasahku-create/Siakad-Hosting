/**
 * Image Generation Service
 * Support untuk DALL-E 3, Stability AI, dan fallback ke canvas generation
 */

export interface ImageGenerationRequest {
  prompt: string;
  style?: 'logo' | 'poster' | 'banner' | 'pamflet' | 'infografis' | 'illustration';
  size?: '256x256' | '512x512' | '1024x1024' | '1024x1792' | '1792x1024';
  schoolName?: string;
  colors?: string[];
}

export interface ImageGenerationService {
  provider: 'dalle' | 'stability' | 'canvas' | 'local';
  imageUrl?: string;
  error?: string;
}

/**
 * Generate logo menggunakan AI dengan prompt yang dioptimalkan
 */
export async function generateLogo(schoolName: string, prompt: string, apiKey: string): Promise<ImageGenerationService> {
  const enhancedPrompt = `
Design a professional school logo for "${schoolName}". 
Requirements:
- Modern, clean design
- Educational theme
- Suitable for official documents
- Colors: green and white (school colors)
- Style: Professional, formal
- ${prompt}

Output should be a PNG image suitable for print and digital use.
  `.trim();

  try {
    // Try DALL-E 3 first
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: enhancedPrompt,
        n: 1,
        size: '1024x1024',
        quality: 'hd'
      })
    });

    if (response.ok) {
      const data = await response.json();
      return {
        provider: 'dalle',
        imageUrl: data.data[0].url
      };
    } else {
      throw new Error('DALL-E API failed');
    }
  } catch (err) {
    console.error('Image generation failed:', err);
    return {
      provider: 'canvas',
      error: 'Could not generate image. Please try again or use local template.'
    };
  }
}

/**
 * Generate poster/pamflet menggunakan template canvas
 */
export async function generatePosterCanvas(
  title: string,
  subtitle: string,
  details: string[],
  backgroundColor: string = '#22C55E'
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1600;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  // Background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // White header area
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, canvas.width, 300);

  // Title
  ctx.fillStyle = backgroundColor;
  ctx.font = 'bold 48px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, canvas.width / 2, 120);

  // Subtitle
  ctx.fillStyle = '#666666';
  ctx.font = '32px Arial, sans-serif';
  ctx.fillText(subtitle, canvas.width / 2, 200);

  // Details section
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '24px Arial, sans-serif';
  ctx.textAlign = 'left';

  let yPos = 400;
  details.forEach((detail) => {
    ctx.fillText(`• ${detail}`, 60, yPos);
    yPos += 80;
  });

  // Footer
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '18px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Dibuat: ${new Date().toLocaleDateString('id-ID')}`, canvas.width / 2, canvas.height - 40);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
    }, 'image/png');
  });
}

/**
 * Generate infografis sederhana
 */
export async function generateInfografis(
  title: string,
  sections: Array<{ label: string; value: string }>
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 600;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  // Background
  ctx.fillStyle = '#F3F4F6';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Title
  ctx.fillStyle = '#22C55E';
  ctx.font = 'bold 32px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, canvas.width / 2, 50);

  // Draw sections as boxes
  const boxWidth = 180;
  const boxHeight = 140;
  const startX = (canvas.width - (sections.length * (boxWidth + 20))) / 2;
  const startY = 150;

  sections.forEach((section, index) => {
    const x = startX + index * (boxWidth + 20);
    const y = startY;

    // Box background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, boxWidth, boxHeight);
    ctx.strokeStyle = '#22C55E';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, boxWidth, boxHeight);

    // Value (large number)
    ctx.fillStyle = '#22C55E';
    ctx.font = 'bold 40px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(section.value, x + boxWidth / 2, y + 60);

    // Label
    ctx.fillStyle = '#666666';
    ctx.font = '14px Arial, sans-serif';
    ctx.fillText(section.label, x + boxWidth / 2, y + 110);
  });

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
    }, 'image/png');
  });
}

/**
 * Convert data URL to blob
 */
export function dataURLToBlob(dataURL: string): Blob {
  const arr = dataURL.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Generate HTML canvas to image
 */
export async function generateFromHTML(htmlElement: HTMLElement): Promise<Blob> {
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(htmlElement, {
    scale: 2,
    backgroundColor: '#FFFFFF'
  });
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
    }, 'image/png');
  });
}

/**
 * Generate logo menggunakan template canvas (Fallback)
 */
export async function generateLogoCanvas(
  schoolName: string,
  tagline: string = "Sistem Informasi Akademik Madrasah",
  backgroundColor: string = '#22C55E'
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 800;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas context not available');

  // Clear background (Transparent)
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw Circle Background
  ctx.beginPath();
  ctx.arc(400, 400, 350, 0, Math.PI * 2);
  ctx.fillStyle = backgroundColor;
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 15;
  ctx.stroke();

  // Draw Inner Circle
  ctx.beginPath();
  ctx.arc(400, 400, 300, 0, Math.PI * 2);
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 5;
  ctx.stroke();

  // School Icon (Book Representation)
  ctx.fillStyle = '#FFFFFF';
  // Left page
  ctx.beginPath();
  ctx.moveTo(400, 450);
  ctx.quadraticCurveTo(300, 450, 250, 350);
  ctx.lineTo(250, 250);
  ctx.quadraticCurveTo(300, 350, 400, 350);
  ctx.fill();
  // Right page
  ctx.beginPath();
  ctx.moveTo(400, 450);
  ctx.quadraticCurveTo(500, 450, 550, 350);
  ctx.lineTo(550, 250);
  ctx.quadraticCurveTo(500, 350, 400, 350);
  ctx.fill();

  // Text: School Name (Circular)
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 60px Arial, sans-serif';
  ctx.textAlign = 'center';
  
  // Wrap text if too long
  const words = schoolName.split(' ');
  if (words.length > 2) {
    ctx.fillText(words.slice(0, 2).join(' '), 400, 550);
    ctx.fillText(words.slice(2).join(' '), 400, 620);
  } else {
    ctx.fillText(schoolName, 400, 580);
  }

  // Tagline
  ctx.font = 'italic 30px Arial, sans-serif';
  ctx.fillText(tagline, 400, 680);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
    }, 'image/png');
  });
}

/**
 * Download image blob
 */
export function downloadImage(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
