<script setup lang="ts">
import { ref, inject, computed, onMounted, markRaw, type Ref, type ComputedRef } from 'vue'
import { useLoop } from '@tresjs/core'
import * as THREE from 'three'
import Moon from './Moon.vue'
import SaturnRings from './SaturnRings.vue'
import { calculateOrbitalPosition, generateEllipsePoints, type OrbitalElements } from '../utils/orbitalMechanics'
import { calculateMeanAnomaly } from '../data/ephemeris'

const isPaused = inject<Ref<boolean>>('isPaused', ref(false))
const showOrbits = inject<Ref<boolean>>('showOrbits', ref(true))
const simulationSpeed = inject<Ref<number>>('simulationSpeed', ref(1))
const daysSinceEpoch = inject<ComputedRef<number>>('daysSinceEpoch')

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

interface AtmosphereData {
  color: string
  glowColor: string
  scale?: number
  intensity?: number
  power?: number
  opacity?: number
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
  inclination?: number // orbital inclination in degrees
  longitudeOfAscendingNode?: number // longitude of ascending node in degrees
  atmosphere?: AtmosphereData // atmospheric scattering configuration
}>()

const planetRef = ref<THREE.Mesh>()
const atmosphereRef = ref<THREE.Mesh>()

// Calculate current mean anomaly based on simulation time
// Uses real J2000.0 ephemeris data for accurate positions
const currentMeanAnomaly = computed(() => {
  if (daysSinceEpoch?.value !== undefined) {
    // Use real ephemeris: M = M₀ + n × days_since_epoch
    return (calculateMeanAnomaly(props.name, daysSinceEpoch.value) * Math.PI) / 180
  }
  // Fallback if no simulation time available
  return 0
})

// Create orbital elements from props
const orbitalElements = computed<OrbitalElements>(() => ({
  semiMajorAxis: props.distance,
  eccentricity: props.eccentricity ?? 0,
  periapsisArgument: ((props.periapsisArgument ?? 0) * Math.PI) / 180,
  meanAnomalyAtEpoch: currentMeanAnomaly.value, // Real ephemeris position
  inclination: ((props.inclination ?? 0) * Math.PI) / 180,
  longitudeOfAscendingNode: ((props.longitudeOfAscendingNode ?? 0) * Math.PI) / 180,
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

// Atmosphere shader - convert hex to vec3
function hexToVec3(hex: string): THREE.Vector3 {
  const color = new THREE.Color(hex)
  return new THREE.Vector3(color.r, color.g, color.b)
}

// Atmosphere uniforms (only created if atmosphere exists)
const atmosphereUniforms = props.atmosphere ? {
  uAtmosphereColor: { value: hexToVec3(props.atmosphere.color) },
  uGlowColor: { value: hexToVec3(props.atmosphere.glowColor) },
  uIntensity: { value: props.atmosphere.intensity ?? 1.0 },
  uPower: { value: props.atmosphere.power ?? 4.0 },
  uOpacity: { value: props.atmosphere.opacity ?? 0.8 },
  uSunPosition: { value: new THREE.Vector3(0, 0, 0) }
} : null

// Atmosphere vertex shader
const atmosphereVertexShader = `
  varying vec3 vNormal;
  varying vec3 vPositionW;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vPositionW = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Atmosphere fragment shader
const atmosphereFragmentShader = `
  uniform vec3 uAtmosphereColor;
  uniform vec3 uGlowColor;
  uniform float uIntensity;
  uniform float uPower;
  uniform float uOpacity;
  uniform vec3 uSunPosition;
  
  varying vec3 vNormal;
  varying vec3 vPositionW;
  
  void main() {
    vec3 viewDirection = normalize(cameraPosition - vPositionW);
    
    // Fresnel effect - stronger at edges
    float fresnel = 1.0 - max(dot(viewDirection, vNormal), 0.0);
    fresnel = pow(fresnel, uPower);
    
    // Sun direction for day/night variation
    vec3 sunDir = normalize(uSunPosition - vPositionW);
    float sunFacing = max(dot(vNormal, sunDir), 0.0);
    
    // Mix colors based on fresnel
    vec3 color = mix(uAtmosphereColor, uGlowColor, fresnel);
    
    // Day/night factor
    float dayNightFactor = 0.3 + 0.7 * sunFacing;
    
    // Rayleigh-like scattering
    float scatter = pow(fresnel, 2.0);
    color = mix(color, uGlowColor * 1.2, scatter * 0.3);
    
    color *= uIntensity * dayNightFactor;
    float alpha = fresnel * uOpacity;
    
    gl_FragColor = vec4(color, alpha);
  }
`

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
      // Position is now computed from simulation time via currentMeanAnomaly
      // The orbitalElements.meanAnomalyAtEpoch is already the current mean anomaly
      // So we pass time=0 since the position is already computed for the current date
      const position = calculateOrbitalPosition(
        orbitalElements.value,
        0, // Time offset is 0 - position comes from simulation date
        1
      )
      
      planetRef.value.position.copy(position)
      planetPosition.value.copy(position)
      
      // Sync atmosphere position with planet
      if (atmosphereRef.value) {
        atmosphereRef.value.position.copy(position)
      }
      
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

  <!-- Atmosphere (separate mesh that follows planet position) -->
  <TresMesh v-if="props.atmosphere && atmosphereUniforms" ref="atmosphereRef" :position="[distance, 0, 0]">
    <TresSphereGeometry :args="[props.size * (props.atmosphere.scale ?? 1.15), 64, 64]" />
    <TresShaderMaterial
      :vertex-shader="atmosphereVertexShader"
      :fragment-shader="atmosphereFragmentShader"
      :uniforms="atmosphereUniforms"
      :transparent="true"
      :side="1"
      :depth-write="false"
      :blending="2"
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
