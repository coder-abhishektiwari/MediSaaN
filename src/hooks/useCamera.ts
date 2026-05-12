import { useRef, useState } from 'react';
import { type CameraRef } from 'react-native-vision-camera';
import { compressAndEncode } from '../utils/imageUtils';

export function useCamera() {
  const cameraRef = useRef<CameraRef>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const captureAndEncode = async (): Promise<string | null> => {
    if (!cameraRef.current) return null;
    try {
      setIsCapturing(true);
      const photo = await cameraRef.current.takePhoto({ flash: 'off', enableShutterSound: false });
      const base64 = await compressAndEncode('file://' + photo.path);
      return base64;
    } catch (e) {
      console.warn('Camera capture error:', e);
      return null;
    } finally {
      setIsCapturing(false);
    }
  };

  return { cameraRef, isCapturing, captureAndEncode };
}
