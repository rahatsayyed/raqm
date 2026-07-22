import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Canvas, Circle, BlurMask } from '@shopify/react-native-skia';
import { Colors } from '../theme';

const GLOW_SIZE = 420;

/** Large, softly blurred spotlight centered behind a hero metric — overflows its container, feathered via Skia's BlurMask. */
export function HeroGlow() {
  return (
    <View pointerEvents="none" style={styles.wrapper}>
      <Canvas style={styles.canvas}>
        <Circle cx={GLOW_SIZE / 2} cy={GLOW_SIZE / 2} r={GLOW_SIZE / 3.5} color={Colors.primary} opacity={0.08}>
          <BlurMask blur={80} style="normal" />
        </Circle>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -GLOW_SIZE / 2,
    marginTop: -GLOW_SIZE / 2,
  },
  canvas: {
    width: GLOW_SIZE,
    height: GLOW_SIZE,
  },
});
