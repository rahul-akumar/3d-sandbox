<script setup lang="ts">
import { ref, computed, inject, type Ref } from 'vue'
import { useLoop } from '@tresjs/core'
import * as THREE from 'three'

const isPaused = inject<Ref<boolean>>('isPaused', ref(false))
const showOrbits = inject<Ref<boolean>>('showOrbits', ref(true))
const simulationSpeed = inject<Ref<number>>('simulationSpeed', ref(1))

const props = defineProps<{
  size: number
  distance: number
  color: string
  speed: number
  rotationSpeed?: number
  planetPosition: THREE.Vector3
  texture?: string
}>()

const moonRef = ref<THREE.Mesh>()
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
  if (moonRef.value && props.planetPosition && !isPaused.value) {
    angle.value += props.speed * delta * simulationSpeed.value
    moonRef.value.position.x = props.planetPosition.x + Math.cos(angle.value) * props.distance
    moonRef.value.position.y = props.planetPosition.y
    moonRef.value.position.z = props.planetPosition.z + Math.sin(angle.value) * props.distance
    
    // On-axis rotation
    moonRef.value.rotation.y += (props.rotationSpeed || 0.8) * delta * simulationSpeed.value
  }
})

// Compute orbit ring position
const orbitPosition = computed(() => new THREE.Vector3(
  props.planetPosition.x,
  props.planetPosition.y,
  props.planetPosition.z
))
</script>

<template>
  <!-- Moon Orbit Path -->
  <TresMesh v-if="showOrbits" :position="orbitPosition" :rotation-x="-Math.PI / 2">
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
