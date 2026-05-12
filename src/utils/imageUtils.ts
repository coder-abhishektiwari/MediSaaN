import { Image as Compressor } from 'react-native-compressor';
import RNFS from 'react-native-fs';

export async function compressAndEncode(imagePath: string): Promise<string> {
  try {
    const compressed = await Compressor.compress(imagePath, {
      maxWidth: 1280,
      maxHeight: 1280,
      quality: 0.75,
    });
    // Remove file:// prefix if present
    const cleanPath = compressed.replace('file://', '');
    const base64 = await RNFS.readFile(cleanPath, 'base64');
    return base64;
  } catch (e) {
    // Fallback: try encoding original
    const cleanPath = imagePath.replace('file://', '');
    const base64 = await RNFS.readFile(cleanPath, 'base64');
    return base64;
  }
}

export async function savePermanentImage(imagePath: string): Promise<string> {
  try {
    const dir = `${RNFS.DocumentDirectoryPath}/scans`;
    if (!(await RNFS.exists(dir))) {
      await RNFS.mkdir(dir);
    }

    // 1. Compress to reduce size (around 200-400KB usually)
    const compressed = await Compressor.compress(imagePath, {
      maxWidth: 1600,
      maxHeight: 1600,
      quality: 0.8,
    });

    // 2. Generate permanent filename
    const filename = `scan_${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
    const destPath = `${dir}/${filename}`;

    // 3. Move from temp to permanent
    const sourcePath = compressed.replace('file://', '');
    await RNFS.moveFile(sourcePath, destPath);

    return `file://${destPath}`;
  } catch (e) {
    console.error('Failed to save permanent image:', e);
    return imagePath; // Fallback to original path
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
