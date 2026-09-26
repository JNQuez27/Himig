import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { colors, gradient } from '../theme/colors';

// Full-screen dark gradient behind every screen. Uses react-native-svg (already
// a dependency) so no extra native module is needed.
export default function GradientBackground({ children }) {
  const { width, height } = useWindowDimensions();
  return (
    <View style={styles.root}>
      <Svg
        width={width}
        height={height}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="0.4" y2="1">
            {gradient.bg.map((c, i) => (
              <Stop key={i} offset={gradient.locations[i]} stopColor={c} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#bg)" />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.ink },
});
