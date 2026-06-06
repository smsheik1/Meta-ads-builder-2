export const getMediaDurationSeconds = (
  url: string | null | undefined,
  type: 'audio' | 'video',
) => new Promise<number | null>((resolve) => {
  if (!url) {
    resolve(null);
    return;
  }

  const element = type === 'audio' ? document.createElement('audio') : document.createElement('video');
  element.preload = 'metadata';
  element.src = url;
  element.onloadedmetadata = () => {
    resolve(Number.isFinite(element.duration) ? element.duration : null);
    element.removeAttribute('src');
    element.load();
  };
  element.onerror = () => resolve(null);
});

export const getRemotionUploadExtension = (field: string, url: string, blob: Blob) => {
  const mimeType = (blob.type || (url.startsWith('data:') ? url.slice(5, url.indexOf(';')).toLowerCase() : '')).toLowerCase();
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('gif')) return 'gif';
  if (mimeType.includes('svg')) return 'svg';
  if (mimeType.includes('avif')) return 'avif';
  if (mimeType.includes('mp4')) return field === 'audio' ? 'm4a' : 'mp4';
  if (mimeType.includes('quicktime')) return 'mov';
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'mp3';
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('aac')) return 'aac';
  if (mimeType.includes('ogg')) return 'ogg';

  try {
    const sourceExtension = new URL(url, window.location.origin).pathname.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
    if (sourceExtension && ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'avif', 'mp4', 'mov', 'webm', 'mp3', 'wav', 'm4a', 'aac', 'ogg'].includes(sourceExtension)) {
      return sourceExtension === 'jpeg' ? 'jpg' : sourceExtension;
    }
  } catch {
    // Blob URLs and a few browser-generated URLs have no useful path.
  }

  if (field === 'introImage' || field.startsWith('elementImage:')) return 'png';
  if (field === 'bgMedia') return 'mp4';
  if (field === 'audio') return 'mp3';
  return 'bin';
};

export const removeWhiteFromImageBlob = async (blob: Blob) => {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  const objectUrl = URL.createObjectURL(blob);
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Failed to load image for transparency processing.'));
      image.src = objectUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return blob;

    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let index = 0; index < data.length; index += 4) {
      if (data[index] > 240 && data[index + 1] > 240 && data[index + 2] > 240) {
        data[index + 3] = 0;
      }
    }
    ctx.putImageData(imageData, 0, 0);

    return await new Promise<Blob>((resolve) => {
      canvas.toBlob(processed => resolve(processed || blob), 'image/png');
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export const appendMediaForRemotion = async (
  formData: FormData,
  field: string,
  url: string | null | undefined,
  applyUrl: (nextUrl: string) => void,
  options?: { forceUpload?: boolean; removeWhite?: boolean },
) => {
  if (!url) return;

  if (!options?.forceUpload && !url.startsWith('blob:') && !url.startsWith('data:')) {
    applyUrl(new URL(url, window.location.origin).href);
    return;
  }

  const response = await fetch(url);
  let blob = await response.blob();
  if (options?.removeWhite && blob.type.startsWith('image/')) {
    blob = await removeWhiteFromImageBlob(blob);
  }
  const extension = getRemotionUploadExtension(field, url, blob);
  formData.append(field, blob, `${field.replace(/[^a-zA-Z0-9_-]/g, '-')}.${extension}`);
  applyUrl('');
};

const MIN_VALID_MP4_BYTES = 1024;

export const isValidMp4Blob = async (blob: Blob) => {
  if (blob.size < MIN_VALID_MP4_BYTES) return false;

  const header = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const signature = String.fromCharCode(...header.slice(4, 8));
  return signature === 'ftyp';
};

export const ensureValidMp4Blob = async (blob: Blob, label: string) => {
  if (await isValidMp4Blob(blob)) return;
  throw new Error(`${label} returned an invalid MP4 (${blob.size} bytes).`);
};

export const getValidMp4Bytes = async (blob: Blob, label: string) => {
  await ensureValidMp4Blob(blob, label);
  return new Uint8Array(await blob.arrayBuffer());
};

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
