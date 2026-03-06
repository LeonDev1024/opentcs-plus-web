/**
 * 解析 PGM (P5) 栅格图像并转为可显示的 Data URL
 * 用于「导入栅格地图」时将 map.pgm 转为画布可绘制的图片
 */
export interface PgmParseResult {
  dataUrl: string;
  width: number;
  height: number;
}

export function parsePgmToDataUrl(arrayBuffer: ArrayBuffer): Promise<PgmParseResult> {
  return new Promise((resolve, reject) => {
    const view = new Uint8Array(arrayBuffer);
    let offset = 0;

    const readLine = (): string => {
      let line = '';
      while (offset < view.length && view[offset] !== 0x0a) {
        line += String.fromCharCode(view[offset]);
        offset++;
      }
      if (offset < view.length) offset++; // skip \n
      return line.trim();
    };

    const magic = readLine();
    if (magic !== 'P5') {
      reject(new Error('仅支持 PGM P5 格式'));
      return;
    }

    let line = readLine();
    while (line.startsWith('#')) line = readLine();
    const [wStr, hStr] = line.split(/\s+/);
    const width = parseInt(wStr || '0', 10);
    const height = parseInt(hStr || '0', 10);
    const maxval = parseInt(readLine(), 10) || 255;

    if (width <= 0 || height <= 0) {
      reject(new Error('无效的 PGM 宽高'));
      return;
    }

    // 二进制数据从 offset 开始
    const dataStart = offset;
    const dataLength = width * height * (maxval > 255 ? 2 : 1);
    if (dataStart + dataLength > view.length) {
      reject(new Error('PGM 数据长度不足'));
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('无法创建 Canvas 2D 上下文'));
      return;
    }

    const imageData = ctx.createImageData(width, height);
    const is16Bit = maxval > 255;

    for (let i = 0; i < width * height; i++) {
      let gray: number;
      if (is16Bit) {
        gray = (view[dataStart + i * 2] << 8) | view[dataStart + i * 2 + 1];
        gray = Math.floor((gray / 65535) * 255);
      } else {
        gray = Math.floor((view[dataStart + i] / maxval) * 255);
      }
      const j = i * 4;
      imageData.data[j] = gray;
      imageData.data[j + 1] = gray;
      imageData.data[j + 2] = gray;
      imageData.data[j + 3] = 255;
    }

    ctx.putImageData(imageData, 0, 0);
    const dataUrl = canvas.toDataURL('image/png');
    resolve({ dataUrl, width, height });
  });
}
