import { useRef, useState } from 'react';
import { usePhotoOutput, type CameraRef } from 'react-native-vision-camera';
import { compressAndEncode } from '../utils/imageUtils';

export function useCamera() {
  const cameraRef = useRef<CameraRef>(null);
  const photoOutput = usePhotoOutput({ quality: 0.75 });
  const [isCapturing, setIsCapturing] = useState(false);

  const captureAndEncode = async (): Promise<string | null> => {
    if (!cameraRef.current) return null;
    try {
      setIsCapturing(true);
      const photo = await photoOutput.capturePhotoToFile({ flashMode: 'off', enableShutterSound: false }, {});
      const base64 = await compressAndEncode('file://' + photo.filePath);
      return base64;
    } catch (e) {
      console.warn('Camera capture error:', e);
      return null;
    } finally {
      setIsCapturing(false);
    }
  };

  return { cameraRef, photoOutput, isCapturing, captureAndEncode };
}
