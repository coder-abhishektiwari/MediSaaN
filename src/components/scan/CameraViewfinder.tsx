import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props { hint: string; frameWidth?: number; frameHeight?: number; }

export default function CameraViewfinder({ hint, frameWidth = 240, frameHeight = 240 }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.frame, { width: frameWidth, height: frameHeight }]}>
        <View style={[styles.corner, styles.TL]} />
        <View style={[styles.corner, styles.TR]} />
        <View style={[styles.corner, styles.BL]} />
        <View style={[styles.corner, styles.BR]} />
      </View>
      <Text style={styles.hint}>{hint}</Text>
    </View>
  );
}

const C = 28; const B = 3;
const styles = StyleSheet.create({
  wrap: { justifyContent: 'center', alignItems: 'center' },
  frame: { position: 'relative' },
  corner: { position: 'absolute', width: C, height: C, borderColor: '#fff', borderWidth: B },
  TL: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0 },
  TR: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0 },
  BL: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0 },
  BR: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0 },
  hint: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 20, textAlign: 'center' },
});
