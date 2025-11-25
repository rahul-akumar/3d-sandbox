import * as THREE from 'three'

export interface OrbitalElements {
  semiMajorAxis: number // Semi-major axis (a)
  eccentricity: number // Eccentricity (e), 0 = circle, 0-1 = ellipse
  periapsisArgument: number // Argument of periapsis (ω) in radians
  meanAnomalyAtEpoch: number // Mean anomaly at epoch (M₀) in radians
  inclination?: number // Orbital inclination (i) in radians - tilt of orbital plane
  longitudeOfAscendingNode?: number // Longitude of ascending node (Ω) in radians
}

/**
 * Solves Kepler's equation: M = E - e*sin(E)
 * Uses Newton-Raphson iteration to find eccentric anomaly (E) from mean anomaly (M)
 * 
 * @param meanAnomaly - Mean anomaly (M) in radians
 * @param eccentricity - Orbital eccentricity (e)
 * @param tolerance - Convergence tolerance
 * @param maxIterations - Maximum number of iterations
 * @returns Eccentric anomaly (E) in radians
 */
export function solveKeplerEquation(
  meanAnomaly: number,
  eccentricity: number,
  tolerance = 1e-6,
  maxIterations = 50
): number {
  // Normalize mean anomaly to [0, 2π]
  let M = meanAnomaly % (2 * Math.PI)
  if (M < 0) M += 2 * Math.PI

  // Initial guess for eccentric anomaly
  let E = M + eccentricity * Math.sin(M)

  // Newton-Raphson iteration
  for (let i = 0; i < maxIterations; i++) {
    const dE = (E - eccentricity * Math.sin(E) - M) / (1 - eccentricity * Math.cos(E))
    E -= dE

    if (Math.abs(dE) < tolerance) {
      return E
    }
  }

  // If not converged, return best estimate
  return E
}

/**
 * Converts eccentric anomaly to true anomaly
 * True anomaly is the actual angle from periapsis to the body's current position
 * 
 * @param eccentricAnomaly - Eccentric anomaly (E) in radians
 * @param eccentricity - Orbital eccentricity (e)
 * @returns True anomaly (ν) in radians
 */
export function eccentricToTrueAnomaly(eccentricAnomaly: number, eccentricity: number): number {
  const sqrtTerm = Math.sqrt((1 + eccentricity) / (1 - eccentricity))
  const trueAnomaly = 2 * Math.atan(sqrtTerm * Math.tan(eccentricAnomaly / 2))
  return trueAnomaly
}

/**
 * Applies orbital inclination and longitude of ascending node to transform
 * a position from the orbital plane to the reference (ecliptic) plane
 * 
 * @param position - Position in orbital plane (y=0)
 * @param inclination - Orbital inclination in radians
 * @param longitudeOfAscendingNode - Longitude of ascending node in radians
 * @returns Transformed position in 3D space
 */
function applyOrbitalInclination(
  x: number,
  z: number,
  inclination: number,
  longitudeOfAscendingNode: number
): THREE.Vector3 {
  // First, rotate around Z-axis by -longitudeOfAscendingNode to align with ascending node
  const cosOmega = Math.cos(longitudeOfAscendingNode)
  const sinOmega = Math.sin(longitudeOfAscendingNode)
  
  // Then rotate around X-axis by inclination to tilt the orbital plane
  const cosI = Math.cos(inclination)
  const sinI = Math.sin(inclination)
  
  // Combined rotation: R_z(Ω) * R_x(i) * position
  // This rotates the orbital plane from XZ to the inclined plane
  const x1 = x * cosOmega - z * sinOmega * cosI
  const y1 = z * sinI
  const z1 = x * sinOmega + z * cosOmega * cosI
  
  return new THREE.Vector3(x1, y1, z1)
}

/**
 * Calculates orbital position from orbital elements at a given time
 * Implements Kepler's laws for elliptical motion
 * 
 * @param elements - Orbital elements
 * @param time - Time since epoch
 * @param speedMultiplier - Multiplier for orbital speed (for visual adjustment)
 * @returns Position vector in 3D space
 */
export function calculateOrbitalPosition(
  elements: OrbitalElements,
  time: number,
  speedMultiplier = 1
): THREE.Vector3 {
  const { 
    semiMajorAxis, 
    eccentricity, 
    periapsisArgument, 
    meanAnomalyAtEpoch,
    inclination = 0,
    longitudeOfAscendingNode = 0
  } = elements

  // Calculate mean anomaly at current time
  // Mean anomaly increases linearly with time (mean motion)
  const meanAnomaly = meanAnomalyAtEpoch + time * speedMultiplier

  // Solve Kepler's equation for eccentric anomaly
  const eccentricAnomaly = solveKeplerEquation(meanAnomaly, eccentricity)

  // Convert to true anomaly
  const trueAnomaly = eccentricToTrueAnomaly(eccentricAnomaly, eccentricity)

  // Calculate distance from focus (sun) using ellipse equation
  // r = a(1 - e²) / (1 + e*cos(ν))
  const distance = (semiMajorAxis * (1 - eccentricity * eccentricity)) / 
                   (1 + eccentricity * Math.cos(trueAnomaly))

  // Calculate position in orbital plane
  // Add periapsis argument to orient the ellipse
  const angleInOrbit = trueAnomaly + periapsisArgument

  const x = distance * Math.cos(angleInOrbit)
  const z = distance * Math.sin(angleInOrbit)

  // Apply orbital inclination to get 3D position
  return applyOrbitalInclination(x, z, inclination, longitudeOfAscendingNode)
}

/**
 * Generates points for drawing an elliptical orbit path
 * 
 * @param elements - Orbital elements
 * @param segments - Number of segments to divide the ellipse
 * @returns Array of 3D points forming the ellipse
 */
export function generateEllipsePoints(
  elements: OrbitalElements,
  segments = 128
): THREE.Vector3[] {
  const points: THREE.Vector3[] = []
  const { 
    semiMajorAxis, 
    eccentricity, 
    periapsisArgument,
    inclination = 0,
    longitudeOfAscendingNode = 0
  } = elements

  for (let i = 0; i <= segments; i++) {
    const trueAnomaly = (i / segments) * Math.PI * 2

    // Calculate distance at this true anomaly
    const distance = (semiMajorAxis * (1 - eccentricity * eccentricity)) / 
                     (1 + eccentricity * Math.cos(trueAnomaly))

    // Apply periapsis rotation
    const angleInOrbit = trueAnomaly + periapsisArgument

    const x = distance * Math.cos(angleInOrbit)
    const z = distance * Math.sin(angleInOrbit)

    // Apply orbital inclination
    const point = applyOrbitalInclination(x, z, inclination, longitudeOfAscendingNode)
    points.push(point)
  }

  return points
}

/**
 * Calculate the current orbital velocity magnitude
 * Using vis-viva equation: v² = μ(2/r - 1/a)
 * For visualization, we simplify by not using actual gravitational parameter
 * 
 * @param semiMajorAxis - Semi-major axis
 * @param currentDistance - Current distance from focus
 * @returns Relative velocity magnitude
 */
export function calculateOrbitalVelocity(
  semiMajorAxis: number,
  currentDistance: number
): number {
  // Simplified vis-viva equation (normalized, without gravitational parameter)
  // This gives relative velocity for visualization purposes
  const velocitySquared = (2 / currentDistance - 1 / semiMajorAxis)
  return Math.sqrt(Math.max(0, velocitySquared))
}
