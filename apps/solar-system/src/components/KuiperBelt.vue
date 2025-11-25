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
  count: 8000,
  minRadius: 650,   // Just beyond Neptune (~600)
  maxRadius: 1000,  // Extended Kuiper Belt region
  size: 0.8,
  verticalSpread: 15 // More spread than asteroid belt due to inclined orbits
})

const kuiperRef = shallowRef<THREE.InstancedMesh>()

// Store orbital data for each object
const orbitalData = ref<{ angle: number; radius: number; speed: number; inclination: number }[]>([])

watchEffect(() => {
  if (kuiperRef.value) {
    const dummy = new THREE.Object3D()
    const data: typeof orbitalData.value = []

    for (let i = 0; i < props.count; i++) {
      const angle = Math.random() * Math.PI * 2
      // Use power distribution to concentrate more objects in inner Kuiper Belt
      const t = Math.pow(Math.random(), 0.7)
      const radius = props.minRadius + t * (props.maxRadius - props.minRadius)

      // Kuiper Belt objects have various inclinations (up to ~30°)
      const inclination = (Math.random() - 0.5) * Math.PI * 0.3
      const y = Math.sin(inclination) * radius * 0.1 + (Math.random() - 0.5) * props.verticalSpread

      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius

      // Vary sizes - mostly small with occasional larger objects
      const sizeVariation = Math.pow(Math.random(), 3) // Bias toward smaller
      const scale = props.size * (0.3 + sizeVariation * 1.5)

      dummy.position.set(x, y, z)
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
      dummy.scale.set(scale, scale, scale)
      dummy.updateMatrix()

      kuiperRef.value.setMatrixAt(i, dummy.matrix)

      // Store orbital speed (slower for more distant objects - Kepler's 3rd law)
      const speed = 0.01 / Math.pow(radius / props.minRadius, 1.5)
      data.push({ angle, radius, speed, inclination })
    }

    orbitalData.value = data
    kuiperRef.value.instanceMatrix.needsUpdate = true
  }
})

const { onBeforeRender } = useLoop()

// Animate individual orbits
onBeforeRender(({ delta }) => {
  if (kuiperRef.value && !isPaused.value && orbitalData.value.length > 0) {
    const dummy = new THREE.Object3D()
    const speed = simulationSpeed.value

    for (let i = 0; i < props.count; i++) {
      const data = orbitalData.value[i]
      data.angle += data.speed * delta * speed

      const x = Math.cos(data.angle) * data.radius
      const z = Math.sin(data.angle) * data.radius
      const y = Math.sin(data.inclination) * data.radius * 0.1

      kuiperRef.value.getMatrixAt(i, dummy.matrix)
      dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale)
      dummy.position.set(x, y, z)
      dummy.updateMatrix()
      kuiperRef.value.setMatrixAt(i, dummy.matrix)
    }

    kuiperRef.value.instanceMatrix.needsUpdate = true
  }
})
</script>

<template>
  <TresInstancedMesh ref="kuiperRef" :args="[undefined, undefined, props.count]" :frustum-culled="false">
    <!-- Irregular icy shapes -->
    <TresIcosahedronGeometry :args="[1, 0]" />
    <!-- Bluish-gray icy appearance with emissive glow for visibility at distance -->
    <TresMeshStandardMaterial color="#8899aa" :emissive="0x334455" :emissive-intensity="0.9" :roughness="0.4"
      :metalness="0.2" />
  </TresInstancedMesh>
</template>
