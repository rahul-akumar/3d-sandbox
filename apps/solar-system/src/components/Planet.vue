<script setup lang="ts">
import { ref, inject, type Ref } from 'vue'
import { useLoop } from '@tresjs/core'
import * as THREE from 'three'
import Moon from './Moon.vue'
import SaturnRings from './SaturnRings.vue'

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
}>()

const planetRef = ref<THREE.Mesh>()
const angle = ref(Math.random() * Math.PI * 2)
const planetPosition = ref(new THREE.Vector3(props.distance, 0, 0))

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
    
    if (!isPaused.value) {
      angle.value += props.speed * delta * simulationSpeed.value
      const x = Math.cos(angle.value) * props.distance
      const z = Math.sin(angle.value) * props.distance
      planetRef.value.position.x = x
      planetRef.value.position.z = z
      planetPosition.value.set(x, 0, z)
      
      // On-axis rotation
      planetRef.value.rotation.y += (props.rotationSpeed || 0.5) * delta * simulationSpeed.value
    }
  }
})
</script>

<template>
  <!-- Orbit Path -->
  <TresMesh v-if="showOrbits" :rotation-x="-Math.PI / 2">
    <TresRingGeometry :args="[props.distance - 0.05, props.distance + 0.05, 64]" />
    <TresMeshBasicMaterial color="#444" :side="THREE.DoubleSide" />
  </TresMesh>

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
    :texture="moon.texture"
  />

  <!-- Rings (for Saturn) -->
  <SaturnRings 
    v-if="props.hasRings"
    :planet-size="props.size"
    :planet-position="planetPosition"
  />
</template>
