<script setup lang="ts">
import { ref } from 'vue'
import { useLoop } from '@tresjs/core'
import * as THREE from 'three'

const props = defineProps<{
  size: number
  distance: number
  color: string
  speed: number
  texture?: string
}>()

const planetRef = ref<THREE.Mesh>()
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
  if (planetRef.value) {
    angle.value += props.speed * delta
    planetRef.value.position.x = Math.cos(angle.value) * props.distance
    planetRef.value.position.z = Math.sin(angle.value) * props.distance
  }
})
</script>

<template>
  <!-- Orbit Path -->
  <TresMesh :rotation-x="-Math.PI / 2">
    <TresRingGeometry :args="[props.distance - 0.05, props.distance + 0.05, 64]" />
    <TresMeshBasicMaterial color="#444" :side="THREE.DoubleSide" />
  </TresMesh>

  <!-- Planet -->
  <TresMesh ref="planetRef" :position="[distance, 0, 0]">
    <TresSphereGeometry :args="[props.size, 32, 32]" />
    <TresMeshStandardMaterial 
      v-if="textureMap" 
      :map="textureMap" 
    />
    <TresMeshStandardMaterial 
      v-else 
      :color="props.color" 
    />
  </TresMesh>
</template>
