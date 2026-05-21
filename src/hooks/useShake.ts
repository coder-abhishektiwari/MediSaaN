// hooks/useShake.ts
import { useEffect } from 'react';
import { Alert } from 'react-native';
import Shake from 'react-native-shake';
import { navigationRef } from '../navigation/navigationRef';

export function useShakeShortcut() {
  useEffect(() => {
    let subscription: any = null;
    
    try {
      subscription = Shake.addListener(() => {
        console.log('Shake detected!'); // Debug log
        
        // Check if navigation is ready
        if (navigationRef.current) {
          navigationRef.current?.navigate('QuickScan' as never);
        } else {
          Alert.alert('Debug', 'Navigation not ready yet');
        }
      });
    } catch (error) {
      console.error('Shake error:', error);
    }
    
    return () => {
      if (subscription) {
        subscription.remove();
      }
    };
  }, []);
}