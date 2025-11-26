<script setup lang="ts">
import { shallowRef, watchEffect, inject, ref, type Ref } from 'vue'
import * as THREE from 'three'
import { useLoop } from '@tresjs/core'

const isPaused = inject<Ref<boolean>>('isPaused', ref(false))
const simulationSpeed = inject<Ref<number>>('simulationSpeed', ref(1))

const props = withDefaults(defineProps<{
  count?: number
  minRadius?: number
  maxRadius?: number
  size?: number
  verticalSpread?: number
}>(), {
  count: 10000,
  minRadius: 120,  // ~2.2 AU (Mars orbit ~1.5 AU)
  maxRadius: 170,  // ~3.2 AU (Jupiter orbit ~5.2 AU)
  size: 0.3,
  verticalSpread: 3 // Main belt is relatively flat
})

const asteroidRef = shallowRef<THREE.InstancedMesh>()

// Kirkwood gaps - orbital resonances with Jupiter that create empty bands
// These are at specific semi-major axis ratios relative to Jupiter's orbit
// Expressed as fractions of the belt range (0-1)
const KIRKWOOD_GAPS = [
  { center: 0.25, width: 0.04 },  // 4:1 resonance (~2.06 AU)
  { center: 0.42, width: 0.05 },  // 3:1 resonance (~2.50 AU)
  { center: 0.58, width: 0.04 },  // 5:2 resonance (~2.82 AU)
  { center: 0.72, width: 0.05 },  // 7:3 resonance (~2.95 AU)
  { center: 0.85, width: 0.04 },  // 2:1 resonance (~3.27 AU)
]

// Check if a normalized radius (0-1) falls within a Kirkwood gap
function isInKirkwoodGap(normalizedRadius: number): boolean {
  for (const gap of KIRKWOOD_GAPS) {
    if (Math.abs(normalizedRadius - gap.center) < gap.width / 2) {
      return true
    }
  }
  return false
}

// Generate a radius that avoids Kirkwood gaps
function generateRadius(): number {
  const range = props.maxRadius - props.minRadius
  let attempts = 0
  while (attempts < 10) {
    const normalized = Math.random()
    if (!isInKirkwoodGap(normalized)) {
      return props.minRadius + normalized * range
    }
    attempts++
  }
  // Fallback: just return a random radius
  return props.minRadius + Math.random() * range
}

// Store orbital data for each asteroid
interface AsteroidOrbit {
  angle: number           // Current orbital angle
  radius: number          // Semi-major axis (circular approximation)
  speed: number           // Angular velocity (radians per simulation day)
  inclination: number     // Orbital inclination
  eccentricity: number    // Orbital eccentricity
  periapsisArg: number    // Argument of periapsis
}

const orbitalData = ref<AsteroidOrbit[]>([])

watchEffect(() => {
  if (asteroidRef.value) {
    const dummy = new THREE.Object3D()
    const data: AsteroidOrbit[] = []

    for (let i = 0; i < props.count; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = generateRadius()
      
      // Orbital inclination: most asteroids are within ~20° of ecliptic
      // Use gaussian-like distribution centered at 0
      const inclination = (Math.random() + Math.random() + Math.random() - 1.5) * 0.35 // ~±20°
      
      // Eccentricity: most asteroids have e between 0.05 and 0.3
      const eccentricity = 0.05 + Math.random() * 0.25
      
      // Random argument of periapsis
      const periapsisArg = Math.random() * Math.PI * 2
      
      // Calculate initial position with eccentricity
      const trueAnomaly = angle
      const r = radius * (1 - eccentricity * eccentricity) / (1 + eccentricity * Math.cos(trueAnomaly))
      const orbitalAngle = trueAnomaly + periapsisArg
      
      const x = Math.cos(orbitalAngle) * r
      const z = Math.sin(orbitalAngle) * r
      // Apply inclination
      const y = Math.sin(inclination) * z + (Math.random() - 0.5) * props.verticalSpread
      const zInclined = Math.cos(inclination) * z

      // Vary sizes - power distribution favors smaller asteroids (realistic)
      const sizeVariation = Math.pow(Math.random(), 2)
      const scale = props.size * (0.3 + sizeVariation * 1.2)
      
      dummy.position.set(x, y, zInclined)
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      dummy.scale.set(scale, scale, scale)
      dummy.updateMatrix()
      
      asteroidRef.value.setMatrixAt(i, dummy.matrix)

      // Kepler's 3rd law: T² ∝ a³, so ω ∝ a^(-3/2)
      // Reference: at radius 145 (middle of belt), base speed of 0.15 rad/day
      const baseRadius = (props.minRadius + props.maxRadius) / 2
      const speed = 0.15 * Math.pow(baseRadius / radius, 1.5)
      
      data.push({ 
        angle, 
        radius, 
        speed, 
        inclination,
        eccentricity,
        periapsisArg
      })
    }

    orbitalData.value = data
    asteroidRef.value.instanceMatrix.needsUpdate = true
  }
})

const { onBeforeRender } = useLoop()

// Animate individual asteroid orbits
onBeforeRender(({ delta }) => {
  if (asteroidRef.value && !isPaused.value && orbitalData.value.length > 0) {
    const dummy = new THREE.Object3D()
    const simSpeed = simulationSpeed.value

    for (let i = 0; i < props.count; i++) {
      const orbit = orbitalData.value[i]
      
      // Update mean anomaly (simplified - treating angle as mean anomaly)
      orbit.angle += orbit.speed * delta * simSpeed
      
      // Calculate position with eccentricity (simplified Kepler)
      const trueAnomaly = orbit.angle // Approximation for low eccentricity
      const r = orbit.radius * (1 - orbit.eccentricity * orbit.eccentricity) / 
                (1 + orbit.eccentricity * Math.cos(trueAnomaly))
      
      const orbitalAngle = trueAnomaly + orbit.periapsisArg
      const x = Math.cos(orbitalAngle) * r
      const zFlat = Math.sin(orbitalAngle) * r
      
      // Apply inclination
      const y = Math.sin(orbit.inclination) * zFlat
      const z = Math.cos(orbit.inclination) * zFlat

      // Preserve rotation and scale from matrix
      asteroidRef.value.getMatrixAt(i, dummy.matrix)
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale)
      dummy.position.set(x, y, z)
      dummy.updateMatrix()
      asteroidRef.value.setMatrixAt(i, dummy.matrix)
    }

    asteroidRef.value.instanceMatrix.needsUpdate = true
  }
})
</script>

<template>
  <TresInstancedMesh 
    ref="asteroidRef" 
    :args="[undefined, undefined, props.count]" 
    :frustum-culled="false"
    receive-shadow
  >
    <TresDodecahedronGeometry :args="[1, 0]" />
    <TresMeshStandardMaterial 
      color="#7a7a72" 
      :roughness="0.9" 
      :metalness="0.1"
    />
  </TresInstancedMesh>
</template>
