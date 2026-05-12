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

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
