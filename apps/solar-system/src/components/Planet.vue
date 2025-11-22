<script setup lang="ts">
import { ref, inject, computed, onMounted, markRaw, type Ref } from 'vue'
import { useLoop } from '@tresjs/core'
import * as THREE from 'three'
import Moon from './Moon.vue'
import SaturnRings from './SaturnRings.vue'
import { calculateOrbitalPosition, generateEllipsePoints, type OrbitalElements } from '../utils/orbitalMechanics'

const isPaused = inject<Ref<boolean>>('isPaused', ref(false))
const showOrbits = inject<Ref<boolean>>('showOrbits', ref(true))
const simulationSpeed = inject<Ref<number>>('simulationSpeed', ref(1))

interface MoonData {
  name: string
  size: number
  distance: number
  color: string
  speed: number
  rotationSpeed?: number
  texture?: string
  eccentricity?: number
  periapsisArgument?: number
}

const props = defineProps<{
  name: string
  size: number
  distance: number
  color: string
  speed: number
  rotationSpeed?: number
  texture?: string
  moons?: MoonData[]
  hasRings?: boolean
  axialTilt?: number // in degrees
  eccentricity?: number // orbital eccentricity (0 = circle, 0-1 = ellipse)
  periapsisArgument?: number // argument of periapsis in degrees
}>()

const planetRef = ref<THREE.Mesh>()

// Time accumulator for orbital calculations
const orbitTime = ref(0)

// Create orbital elements from props
const orbitalElements = computed<OrbitalElements>(() => ({
  semiMajorAxis: props.distance,
  eccentricity: props.eccentricity ?? 0,
  periapsisArgument: ((props.periapsisArgument ?? 0) * Math.PI) / 180,
  meanAnomalyAtEpoch: Math.random() * Math.PI * 2, // Random start position
}))

const planetPosition = ref(new THREE.Vector3(props.distance, 0, 0))

// Create orbit line
const orbitLine = ref<THREE.Line | null>(null)

onMounted(() => {
  // Create the orbit line on mount
  const points = generateEllipsePoints(orbitalElements.value, 128)
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  geometry.computeBoundingSphere() // Ensure bounding sphere is computed
  const material = new THREE.LineBasicMaterial({ color: 0x444444 })
  const line = new THREE.Line(geometry, material)
  // Disable frustum culling so the line doesn't disappear when camera is inside the orbit
  line.frustumCulled = false
  // Use markRaw to prevent Vue reactivity from wrapping Three.js objects
  orbitLine.value = markRaw(line)
})

// Convert axial tilt from degrees to radians
const axialTiltRadians = (props.axialTilt || 0) * (Math.PI / 180)

// Load texture if provided
const textureMap = ref<THREE.Texture | null>(null)
if (props.texture) {
  const loader = new THREE.TextureLoader()
  loader.load(props.texture, (texture) => {
    textureMap.value = texture
  })
}

const { onBeforeRender } = useLoop()

onBeforeRender(({ delta }) => {
  if (planetRef.value) {
    // Set userData for selection
    if (!planetRef.value.userData.type) {
      planetRef.value.userData.type = 'planet'
      planetRef.value.userData.name = props.name
    }
    
    // Apply axial tilt around X axis (tilts the planet's equator)
    planetRef.value.rotation.x = axialTiltRadians
    
    if (!isPaused.value) {
      // Update orbit time (controls position in ellipse)
      orbitTime.value += props.speed * delta * simulationSpeed.value
      
      // Calculate position using Kepler's laws
      const position = calculateOrbitalPosition(
        orbitalElements.value,
        orbitTime.value,
        1 // speedMultiplier is already in orbitTime
      )
      
      planetRef.value.position.copy(position)
      planetPosition.value.copy(position)
      
      // On-axis rotation (around tilted axis)
      planetRef.value.rotation.y += (props.rotationSpeed || 0.5) * delta * simulationSpeed.value
    }
  }
})
</script>

<template>
  <!-- Orbit Path (Ellipse) -->
  <primitive v-if="showOrbits && orbitLine" :object="orbitLine" />

  <!-- Planet -->
  <TresMesh ref="planetRef" :position="[distance, 0, 0]" cast-shadow receive-shadow>
    <TresSphereGeometry :args="[props.size, 32, 32]" />
    <TresMeshStandardMaterial 
      v-if="textureMap" 
      :map="textureMap"
      :roughness="0.8"
      :metalness="0.2"
    />
    <TresMeshStandardMaterial 
      v-else 
      :color="props.color"
      :roughness="0.8"
      :metalness="0.2"
    />
  </TresMesh>

  <!-- Moons -->
  <Moon 
    v-for="moon in props.moons" 
    :key="moon.name" 
    :name="moon.name"
    :size="moon.size" 
    :distance="moon.distance" 
    :color="moon.color" 
    :speed="moon.speed" 
    :rotation-speed="moon.rotationSpeed"
    :planet-position="planetPosition"
    :planet-axial-tilt="axialTiltRadians"
    :texture="moon.texture"
    :eccentricity="moon.eccentricity"
    :periapsis-argument="moon.periapsisArgument"
  />

  <!-- Rings (for Saturn) -->
  <SaturnRings 
    v-if="props.hasRings"
    :planet-size="props.size"
    :planet-position="planetPosition"
    :planet-axial-tilt="axialTiltRadians"
  />
</template>
