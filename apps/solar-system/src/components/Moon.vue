<script setup lang="ts">
import { ref, computed, inject, type Ref } from 'vue'
import { useLoop } from '@tresjs/core'
import * as THREE from 'three'

const isPaused = inject<Ref<boolean>>('isPaused', ref(false))

const props = defineProps<{
  size: number
  distance: number
  color: string
  speed: number
  planetPosition: THREE.Vector3
}>()

const moonRef = ref<THREE.Mesh>()
const angle = ref(Math.random() * Math.PI * 2)

const { onBeforeRender } = useLoop()

onBeforeRender(({ delta }) => {
  if (moonRef.value && props.planetPosition && !isPaused.value) {
    angle.value += props.speed * delta
    moonRef.value.position.x = props.planetPosition.x + Math.cos(angle.value) * props.distance
    moonRef.value.position.y = props.planetPosition.y
    moonRef.value.position.z = props.planetPosition.z + Math.sin(angle.value) * props.distance
  }
})

// Compute orbit ring position
const orbitPosition = computed(() => [
  props.planetPosition.x,
  props.planetPosition.y,
  props.planetPosition.z
])
</script>

<template>
  <!-- Moon Orbit Path -->
  <TresMesh :position="orbitPosition" :rotation-x="-Math.PI / 2">
    <TresRingGeometry :args="[props.distance - 0.02, props.distance + 0.02, 32]" />
    <TresMeshBasicMaterial color="#666" :side="THREE.DoubleSide" :transparent="true" :opacity="0.3" />
  </TresMesh>

  <!-- Moon -->
  <TresMesh ref="moonRef" cast-shadow receive-shadow>
    <TresSphereGeometry :args="[props.size, 16, 16]" />
    <TresMeshStandardMaterial 
      :color="props.color"
      :roughness="0.9"
      :metalness="0.1"
    />
  </TresMesh>
</template>
