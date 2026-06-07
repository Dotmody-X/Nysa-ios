import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { blobPath } from '@/lib/blob';

/**
 * Organic blob made of FLAT colors stacked as nested layers (no gradient),
 * like a topographic / paper-cut look. `colors` runs outer → inner.
 * Centered viewBox so the shape can bleed off its container's edges.
 */
export function Blob({
  colors,
  size = 200,
  seed = 1,
  opacity = 1,
  style,
}: {
  colors: string[];
  size?: number;
  seed?: number;
  opacity?: number;
  style?: object;
}) {
  return (
    <Svg width={size} height={size} viewBox="-110 -110 220 220" style={style}>
      {colors.map((color, i) => (
        <Path
          key={i}
          d={blobPath(seed + i * 0.7, 6, 92 * (1 - i * 0.17), 0.32)}
          fill={color}
          opacity={opacity}
        />
      ))}
    </Svg>
  );
}
