const MAX_EDGE = 256;
const MAX_BASE64_CHARS = 350_000;

export async function fileToLogoBase64(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('请选择图片文件');
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('原图不能超过 5MB');
  }

  const dataUrl = await readAsDataUrl(file);
  const compressed = await compressDataUrl(dataUrl, MAX_EDGE, 0.85);
  const commaIndex = compressed.indexOf(',');
  const payloadLength = commaIndex >= 0 ? compressed.length - commaIndex - 1 : compressed.length;
  if (payloadLength > MAX_BASE64_CHARS) {
    throw new Error('图片压缩后仍过大，请换一张更小的图片');
  }
  return compressed;
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}

function compressDataUrl(dataUrl: string, maxEdge: number, quality: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
      const width = Math.max(1, Math.round(img.width * scale));
      const height = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('图片处理失败'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('图片格式无效'));
    img.src = dataUrl;
  });
}
