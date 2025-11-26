/**
 * J2000.0 Epoch Ephemeris Data
 * 
 * Reference epoch: January 1, 2000, 12:00 TT (Terrestrial Time)
 * Julian Date: 2451545.0
 * 
 * Data sources: NASA JPL Horizons, IAU
 */

// J2000.0 epoch as Julian Date
export const J2000_EPOCH = 2451545.0

// Milliseconds per day
export const MS_PER_DAY = 86400000

/**
 * Convert a JavaScript Date to Julian Date
 */
export function dateToJulianDate(date: Date): number {
  return date.getTime() / MS_PER_DAY + 2440587.5
}

/**
 * Convert Julian Date to JavaScript Date
 */
export function julianDateToDate(jd: number): Date {
  return new Date((jd - 2440587.5) * MS_PER_DAY)
}

/**
 * Calculate days since J2000.0 epoch
 */
export function daysSinceJ2000(date: Date): number {
  return dateToJulianDate(date) - J2000_EPOCH
}

/**
 * J2000.0 Orbital Elements for Planets
 * 
 * meanAnomalyAtEpoch: Mean anomaly at J2000.0 (degrees)
 * meanMotion: Mean motion (degrees/day) - how fast mean anomaly increases
 * 
 * Mean motion n = 360° / orbital_period_days
 */
export const PLANET_EPHEMERIS: Record<string, { meanAnomalyAtEpoch: number; meanMotion: number }> = {
  // Inner planets
  Mercury: {
    meanAnomalyAtEpoch: 174.796,
    meanMotion: 4.09233445, // 360 / 87.969 days
  },
  Venus: {
    meanAnomalyAtEpoch: 50.115,
    meanMotion: 1.60213034, // 360 / 224.701 days
  },
  Earth: {
    meanAnomalyAtEpoch: 357.529,
    meanMotion: 0.98560028, // 360 / 365.256 days
  },
  Mars: {
    meanAnomalyAtEpoch: 19.373,
    meanMotion: 0.52402068, // 360 / 686.980 days
  },
  
  // Outer planets
  Jupiter: {
    meanAnomalyAtEpoch: 20.020,
    meanMotion: 0.08308529, // 360 / 4332.59 days
  },
  Saturn: {
    meanAnomalyAtEpoch: 317.020,
    meanMotion: 0.03344414, // 360 / 10759.22 days
  },
  Uranus: {
    meanAnomalyAtEpoch: 142.238,
    meanMotion: 0.01172834, // 360 / 30688.5 days
  },
  Neptune: {
    meanAnomalyAtEpoch: 256.228,
    meanMotion: 0.00598103, // 360 / 60182 days
  },
  
  // Dwarf planets
  Ceres: {
    meanAnomalyAtEpoch: 95.989,
    meanMotion: 0.21408157, // 360 / 1681.63 days
  },
  Pluto: {
    meanAnomalyAtEpoch: 14.53,
    meanMotion: 0.00397570, // 360 / 90560 days
  },
  Haumea: {
    meanAnomalyAtEpoch: 218.205,
    meanMotion: 0.00348432, // 360 / 103410 days (283.28 years)
  },
  Makemake: {
    meanAnomalyAtEpoch: 165.514,
    meanMotion: 0.00318097, // 360 / 113183 days (309.88 years)
  },
  Eris: {
    meanAnomalyAtEpoch: 204.16,
    meanMotion: 0.00176328, // 360 / 204199 days (559 years)
  },
}

/**
 * Sidereal rotation periods in Earth days
 * Negative values indicate retrograde rotation
 * 
 * Sources: NASA Planetary Fact Sheets
 */
export const ROTATION_PERIODS: Record<string, number> = {
  // Inner planets
  Mercury: 58.646,      // 58.646 Earth days
  Venus: -243.025,      // 243.025 days retrograde (rotates backwards)
  Earth: 0.99727,       // 23h 56m 4s sidereal day
  Mars: 1.02596,        // 24h 37m 22s
  
  // Outer planets (gas giants rotate fast!)
  Jupiter: 0.41354,     // 9h 55m 30s
  Saturn: 0.44401,      // 10h 39m 22s
  Uranus: -0.71833,     // 17h 14m retrograde (rotates on its side, backwards)
  Neptune: 0.67125,     // 16h 6m 36s
  
  // Dwarf planets
  Ceres: 0.3781,        // 9h 4m 27s
  Pluto: -6.3872,       // 6.387 days retrograde
  Haumea: 0.163,        // 3h 55m (one of the fastest rotating large bodies)
  Makemake: 0.9375,     // ~22.5 hours (estimated)
  Eris: 1.08,           // ~26 hours (estimated)
}

/**
 * Get rotation period for a body (returns 1 day if not found)
 */
export function getRotationPeriod(bodyName: string): number {
  return ROTATION_PERIODS[bodyName] ?? 1
}

/**
 * Calculate current mean anomaly for a body
 * M = M₀ + n × Δt (mod 360°)
 * 
 * @param bodyName - Name of the celestial body
 * @param daysSinceEpoch - Days since J2000.0
 * @returns Mean anomaly in degrees
 */
export function calculateMeanAnomaly(bodyName: string, daysSinceEpoch: number): number {
  const ephemeris = PLANET_EPHEMERIS[bodyName]
  if (!ephemeris) {
    console.warn(`No ephemeris data for ${bodyName}, using 0`)
    return 0
  }
  
  const meanAnomaly = ephemeris.meanAnomalyAtEpoch + ephemeris.meanMotion * daysSinceEpoch
  // Normalize to [0, 360)
  return ((meanAnomaly % 360) + 360) % 360
}
