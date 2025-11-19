<script setup lang="ts">
import { shallowRef, watchEffect } from 'vue'
import * as THREE from 'three'
import { useLoop } from '@tresjs/core'

const props = defineProps<{
  count: number
  minRadius: number
  maxRadius: number
  size: number
}>()

const asteroidRef = shallowRef<THREE.InstancedMesh>()

watchEffect(() => {
  if (asteroidRef.value) {
    const dummy = new THREE.Object3D()
    for (let i = 0; i < props.count; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = props.minRadius + Math.random() * (props.maxRadius - props.minRadius)
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const y = (Math.random() - 0.5) * 2 // slight vertical spread

      const scale = props.size * (0.5 + Math.random() * 0.5)
      
      dummy.position.set(x, y, z)
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      dummy.scale.set(scale, scale, scale)
      dummy.updateMatrix()
      
      asteroidRef.value.setMatrixAt(i, dummy.matrix)
    }
    asteroidRef.value.instanceMatrix.needsUpdate = true
  }
})

const { onBeforeRender } = useLoop()

onBeforeRender(({ delta }) => {
  if (asteroidRef.value) {
    asteroidRef.value.rotation.y += 0.05 * delta
  }
})
</script>

<template>
  <TresInstancedMesh ref="asteroidRef" :args="[undefined, undefined, props.count]" cast-shadow receive-shadow>
    <TresDodecahedronGeometry :args="[1, 0]" />
    <TresMeshStandardMaterial color="#888" :roughness="0.8" :metalness="0.2" />
  </TresInstancedMesh>
</template>
