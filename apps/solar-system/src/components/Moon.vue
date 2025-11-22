<script setup lang="ts">
import { ref, inject, type Ref } from 'vue'
import { useLoop } from '@tresjs/core'
import * as THREE from 'three'

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
}>()

const moonRef = ref<THREE.Mesh>()
const moonOrbitRef = ref<THREE.Mesh>()
const angle = ref(Math.random() * Math.PI * 2)

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
      angle.value += props.speed * delta * simulationSpeed.value
      
      // Calculate position in planet's equatorial plane
      // Start with orbit in XZ plane
      const localX = Math.cos(angle.value) * props.distance
      const localY = 0
      const localZ = Math.sin(angle.value) * props.distance
      
      // Apply planet's axial tilt rotation around Z axis
      // This tilts the moon's orbital plane to match the planet's equatorial plane
      const tiltedY = localY * Math.cos(props.planetAxialTilt) - localZ * Math.sin(props.planetAxialTilt)
      const tiltedZ = localY * Math.sin(props.planetAxialTilt) + localZ * Math.cos(props.planetAxialTilt)
      
      // Set final position relative to planet
      moonRef.value.position.x = props.planetPosition.x + localX
      moonRef.value.position.y = props.planetPosition.y + tiltedY
      moonRef.value.position.z = props.planetPosition.z + tiltedZ
      
      // On-axis rotation
      moonRef.value.rotation.y += (props.rotationSpeed || 0.8) * delta * simulationSpeed.value
    }
  }
  
  // Update orbit ring to follow planet and match tilt
  if (moonOrbitRef.value && props.planetPosition) {
    moonOrbitRef.value.position.copy(props.planetPosition)
    // Rotation around X axis: -PI/2 to make horizontal, plus the planet's tilt
    moonOrbitRef.value.rotation.set(-Math.PI / 2 + props.planetAxialTilt, 0, 0)
  }
})

</script>

<template>
  <!-- Moon Orbit Path (tilted to match planet's equatorial plane) -->
  <TresMesh v-if="showOrbits" ref="moonOrbitRef">
    <TresRingGeometry :args="[props.distance - 0.02, props.distance + 0.02, 32]" />
    <TresMeshBasicMaterial color="#666" :side="THREE.DoubleSide" :transparent="true" :opacity="0.3" />
  </TresMesh>

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
