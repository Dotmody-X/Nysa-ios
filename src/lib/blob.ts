/**
 * Deterministic organic "blob" path generator.
 *
 * Returns an SVG path string for a smooth closed shape centered on (0,0),
 * so it can be dropped into an SVG with a viewBox centered on the origin.
 * Same `seed` → same shape, so blobs stay stable across re-renders.
 */

const pseudo = (x: number): number => {
  const v = Math.sin(x * 127.1) * 43758.5453;
  return v - Math.floor(v);
};

export function blobPath(seed = 1, points = 6, radius = 90, variance = 0.32): string {
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < points; i++) {
    const angle = (Math.PI * 2 * i) / points;
    const r = radius * (1 + (pseudo(seed + i * 1.37) * 2 - 1) * variance);
    pts.push([Math.cos(angle) * r, Math.sin(angle) * r]);
  }

  const n = pts.length;
  // Catmull-Rom → cubic Bézier, closed loop, for a smooth blob.
  let d = `M ${pts[0][0].toFixed(2)} ${pts[0][1].toFixed(2)} `;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += `C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2[0].toFixed(
      2,
    )} ${p2[1].toFixed(2)} `;
  }
  return d + 'Z';
}
