<script setup lang="ts">
import { ref, inject, computed, onMounted, watch, markRaw, type Ref } from 'vue'
import { useLoop } from '@tresjs/core'
import * as THREE from 'three'
import { calculateOrbitalPosition, generateEllipsePoints, type OrbitalElements } from '../utils/orbitalMechanics'

const isPaused = inject<Ref<boolean>>('isPaused', ref(false))
const showOrbits = inject<Ref<boolean>>('showOrbits', ref(true))
const simulationSpeed = inject<Ref<number>>('simulationSpeed', ref(1))

const props = defineProps<{
  name: string
  size: number
  distance: number
  color: string
  speed: number
  rotationSpeed?: number
  planetPosition: THREE.Vector3
  planetAxialTilt: number // in radians
  texture?: string
  eccentricity?: number // orbital eccentricity
  periapsisArgument?: number // argument of periapsis in degrees
}>()

const moonRef = ref<THREE.Mesh>()

// Time accumulator for orbital calculations
const orbitTime = ref(0)

// Create orbital elements from props
const orbitalElements = computed<OrbitalElements>(() => ({
  semiMajorAxis: props.distance,
  eccentricity: props.eccentricity ?? 0,
  periapsisArgument: ((props.periapsisArgument ?? 0) * Math.PI) / 180,
  meanAnomalyAtEpoch: Math.random() * Math.PI * 2,
}))

// Create orbit line
const orbitLine = ref<THREE.Line | null>(null)

const updateOrbitLine = () => {
  if (!orbitLine.value) return
  
  const points = generateEllipsePoints(orbitalElements.value, 64)
  // Transform points to planet's position and apply axial tilt
  const transformedPoints = points.map(point => {
    const tiltedY = point.y * Math.cos(props.planetAxialTilt) - point.z * Math.sin(props.planetAxialTilt)
    const tiltedZ = point.y * Math.sin(props.planetAxialTilt) + point.z * Math.cos(props.planetAxialTilt)
    
    return new THREE.Vector3(
      props.planetPosition.x + point.x,
      props.planetPosition.y + tiltedY,
      props.planetPosition.z + tiltedZ
    )
  })
  
  orbitLine.value.geometry.setFromPoints(transformedPoints)
  orbitLine.value.geometry.computeBoundingSphere() // Recompute after updating points
}

onMounted(() => {
  // Create the orbit line on mount
  const points = generateEllipsePoints(orbitalElements.value, 64)
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  geometry.computeBoundingSphere() // Ensure bounding sphere is computed
  const material = new THREE.LineBasicMaterial({ color: 0x666666, transparent: true, opacity: 0.3 })
  const line = new THREE.Line(geometry, material)
  // Disable frustum culling so the line doesn't disappear when camera is close
  line.frustumCulled = false
  // Use markRaw to prevent Vue reactivity from wrapping Three.js objects
  orbitLine.value = markRaw(line)
  updateOrbitLine()
})

// Update orbit line when planet moves
watch(() => props.planetPosition, updateOrbitLine, { deep: true })

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
  if (moonRef.value && props.planetPosition) {
    // Set userData for selection
    if (!moonRef.value.userData.type) {
      moonRef.value.userData.type = 'moon'
      moonRef.value.userData.name = props.name
    }
    
    if (!isPaused.value) {
      // Update orbit time
      orbitTime.value += props.speed * delta * simulationSpeed.value
      
      // Calculate position using Kepler's laws (in local space)
      const localPosition = calculateOrbitalPosition(
        orbitalElements.value,
        orbitTime.value,
        1
      )
      
      // Apply planet's axial tilt rotation around X axis
      // This tilts the moon's orbital plane to match the planet's equatorial plane
      const tiltedY = localPosition.y * Math.cos(props.planetAxialTilt) - localPosition.z * Math.sin(props.planetAxialTilt)
      const tiltedZ = localPosition.y * Math.sin(props.planetAxialTilt) + localPosition.z * Math.cos(props.planetAxialTilt)
      
      // Set final position relative to planet
      moonRef.value.position.x = props.planetPosition.x + localPosition.x
      moonRef.value.position.y = props.planetPosition.y + tiltedY
      moonRef.value.position.z = props.planetPosition.z + tiltedZ
      
      // On-axis rotation
      moonRef.value.rotation.y += (props.rotationSpeed || 0.8) * delta * simulationSpeed.value
    }
  }
})

</script>

<template>
  <!-- Moon Orbit Path (Ellipse, tilted to match planet's equatorial plane) -->
  <primitive v-if="showOrbits && orbitLine" :object="orbitLine" />

  <!-- Moon -->
  <TresMesh ref="moonRef" cast-shadow receive-shadow>
    <TresSphereGeometry :args="[props.size, 16, 16]" />
    <TresMeshStandardMaterial 
      v-if="textureMap"
      :map="textureMap"
      :roughness="0.9"
      :metalness="0.1"
    />
    <TresMeshStandardMaterial 
      v-else
      :color="props.color"
      :roughness="0.9"
      :metalness="0.1"
    />
  </TresMesh>
</template>
