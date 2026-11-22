export type Level = 'excellent' | 'good' | 'fair' | 'poor' | 'bad'

// Mirrors MetricDisplay.signalQuality in the Android client: thresholds, scores and the
// "lower is better" rule for uplink power. Labels match by metric name, e.g. "SS-RSRP".
export function level(label: string, value: number): Level | null {
  const name = label.toUpperCase()
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
  if (name.includes('RSRP')) return up(-80, -90, -100, -110)
  if (name.includes('RSRQ')) return up(-10, -12, -15, -18)
  if (name.includes('SINR')) return up(20, 13, 0, -5)
  if (name.includes('RSSI')) return up(-65, -75, -85, -95)
  if (name.includes('CQI')) return up(13, 10, 7, 4)
  if (['PUSCH', 'PUCCH', 'SRS', 'PRACH'].some((n) => name.includes(n)))
    return value <= 0
      ? 'excellent'
      : value <= 10
        ? 'good'
        : value <= 15
          ? 'fair'
          : value <= 20
            ? 'poor'
            : 'bad'
  return null
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
/** Ease-out with a small overshoot, for things that land. */
export const pop = (t: number) => {
  const c = 1.70158
  return t <= 0 ? 0 : t >= 1 ? 1 : 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2)
}
export const mix = (from: number, to: number, t: number) => from + (to - from) * t
