export type Level = 'excellent' | 'good' | 'fair' | 'poor' | 'bad'

// Thresholds follow signalQualityTint in the desktop client and MetricQualityEvaluator on iOS.
export function level(label: string, value: number): Level {
  const up = (e: number, g: number, f: number, p: number): Level =>
    value >= e
      ? 'excellent'
      : value >= g
        ? 'good'
        : value >= f
          ? 'fair'
          : value >= p
            ? 'poor'
            : 'bad'
  if (label === 'RSRP') return up(-80, -90, -100, -110)
  if (label === 'RSRQ') return up(-10, -12, -15, -18)
  if (label === 'SINR') return up(20, 13, 0, -5)
  if (label === 'RSSI') return up(-65, -75, -85, -95)
  if (label === 'CQI') return up(13, 10, 7, 4)
  return value <= 0
    ? 'excellent'
    : value <= 10
      ? 'good'
      : value <= 15
        ? 'fair'
        : value <= 20
          ? 'poor'
          : 'bad'
}

export const score: Record<Level, number> = {
  excellent: 1,
  good: 0.78,
  fair: 0.56,
  poor: 0.34,
  bad: 0.16,
}

export const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))
/** Maps progress inside [start, end] to 0..1. */
export const span = (t: number, start: number, end: number) => clamp((t - start) / (end - start))
export const ease = (t: number) => 1 - Math.pow(1 - t, 3)
export const mix = (from: number, to: number, t: number) => from + (to - from) * t
