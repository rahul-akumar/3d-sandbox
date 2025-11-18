<script setup lang="ts">
import { useLoop } from '@tresjs/core'
import { ref, computed } from 'vue'
import { useSceneControls } from '../composables/useSceneControls'

const { state } = useSceneControls()

// Reference to our donut mesh for animation
const donutRef = ref()

const cameraPosition = computed(() => state.camera.position)
const cameraFov = computed(() => state.camera.fov)

const ambientIntensity = computed(() => state.lights.ambient.intensity)
const ambientColor = computed(() => state.lights.ambient.color)

const directionalPosition = computed(() => state.lights.directional.position)
const directionalIntensity = computed(() => state.lights.directional.intensity)
const directionalColor = computed(() => state.lights.directional.color)

const objectPosition = computed(() => state.object.position)
const objectScale = computed(() => state.object.scale)

const materialColor = computed(() => state.material.color)
const wireframeColor = computed(() => state.material.wireframeColor)
const metalness = computed(() => state.material.metalness)
const roughness = computed(() => state.material.roughness)

const animationEnabled = computed(() => state.animation.enabled)
const rotationSpeedX = computed(() => state.animation.rotationSpeedX)
const rotationSpeedY = computed(() => state.animation.rotationSpeedY)

// Animation loop
const { onBeforeRender } = useLoop()

onBeforeRender(({ elapsed }) => {
  if (!animationEnabled.value || !donutRef.value) return

  donutRef.value.rotation.x = elapsed * rotationSpeedX.value
  donutRef.value.rotation.y = elapsed * rotationSpeedY.value
})
</script>

<template>
  <!-- Camera Setup -->
  <TresPerspectiveCamera
    :position="cameraPosition"
    :fov="cameraFov"
    :look-at="[0, 0, 0]"
  />

  <!-- Basic lighting for standard material -->
  <TresAmbientLight :intensity="ambientIntensity" :color="ambientColor" />
  <TresDirectionalLight
    :position="directionalPosition"
    :intensity="directionalIntensity"
    :color="directionalColor"
  />

  <!-- The Donut (solid + wireframe) -->
  <TresGroup ref="donutRef" :position="objectPosition" :scale="objectScale">
    <!-- Solid mesh -->
    <TresMesh>
      <TresIcosahedronGeometry :args="[1, 2]" />
      <TresMeshStandardMaterial
        :color="materialColor"
        :metalness="metalness"
        :roughness="roughness"
      />
    </TresMesh>

    <!-- Wireframe overlay -->
    <TresMesh :scale="[1.01, 1.01, 1.01]">
      <TresIcosahedronGeometry :args="[1, 2]" />
      <TresMeshBasicMaterial
        :color="wireframeColor"
        :wireframe="true"
        :depth-write="false"
      />
    </TresMesh>
  </TresGroup>

  <!-- Visual Helpers -->
  <TresAxesHelper />
  <TresGridHelper />
</template>
