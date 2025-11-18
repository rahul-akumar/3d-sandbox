<script setup lang="ts">
import { useLoop } from '@tresjs/core'
import { ref, computed, onMounted, shallowRef } from 'vue'
import { BufferAttribute, Color, PlaneGeometry } from 'three'
import { useSceneControls } from '../composables/use-scene-controls'

const { state } = useSceneControls()

// Reference to our donut mesh for animation
const donutRef = ref()

// Terrain geometry (low-poly, noise-based)
const terrainGeometry = shallowRef<PlaneGeometry | null>(null)

const terrainSize = 60
const terrainSegments = 120
const terrainHeight = 3

function heightNoise(x: number, y: number): number {
  // Cheap, deterministic pseudo-noise based on sines; good enough for a static demo
  const nx = x * 0.15
  const ny = y * 0.15
  return (
    Math.sin(nx) * Math.cos(ny * 0.7) +
    Math.sin(nx * 0.7 + ny * 1.3) * 0.5
  )
}

onMounted(() => {
  const geom = new PlaneGeometry(terrainSize, terrainSize, terrainSegments, terrainSegments)

  const position = geom.attributes.position
  const vertexCount = position.count
  const heights: number[] = new Array(vertexCount)

  for (let i = 0; i < vertexCount; i++) {
    const x = position.getX(i)
    const y = position.getY(i)
    const h = heightNoise(x, y) * terrainHeight
    position.setZ(i, h)
    heights[i] = h
  }

  position.needsUpdate = true

  const minH = Math.min(...heights)
  const maxH = Math.max(...heights)
  const range = maxH - minH || 1

  const colors = new Float32Array(vertexCount * 3)
  const color = new Color()

  for (let i = 0; i < vertexCount; i++) {
    const h = heights[i]
    const t = (h - minH) / range

    // Simple height-based gradient: darker green in valleys, lighter/yellowish on peaks
    color.setHSL(0.33 - t * 0.08, 0.7, 0.25 + t * 0.25)

    const idx = i * 3
    colors[idx] = color.r
    colors[idx + 1] = color.g
    colors[idx + 2] = color.b
  }

  geom.setAttribute('color', new BufferAttribute(colors, 3))
  geom.computeVertexNormals()

  terrainGeometry.value = geom
})

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
  <TresPerspectiveCamera :position="cameraPosition" :fov="cameraFov" :look-at="[0, 0, 0]" />

  <!-- Basic lighting for standard material -->
  <TresAmbientLight :intensity="ambientIntensity" :color="ambientColor" />
  <TresDirectionalLight
    :position="directionalPosition"
    :intensity="directionalIntensity"
    :color="directionalColor"
    cast-shadow
  />

  <!-- Low-poly terrain -->
  <TresMesh
    v-if="terrainGeometry"
    :geometry="terrainGeometry"
    :rotation="[-Math.PI / 2, 0, 0]"
    :position="[0, -3, 0]"
    receive-shadow
  >
    <TresMeshStandardMaterial vertex-colors flat-shading />
  </TresMesh>

  <!-- The Donut (solid + wireframe) -->
  <TresGroup ref="donutRef" :position="objectPosition" :scale="objectScale">
    <!-- Solid mesh -->
    <TresMesh cast-shadow>
      <TresIcosahedronGeometry :args="[1, 2]" />
      <TresMeshStandardMaterial :color="materialColor" :metalness="metalness" :roughness="roughness" />
    </TresMesh>

    <!-- Wireframe overlay -->
    <TresMesh :scale="[1.01, 1.01, 1.01]">
      <TresIcosahedronGeometry :args="[1, 2]" />
      <TresMeshBasicMaterial :color="wireframeColor" :wireframe="true" :depth-write="false" />
    </TresMesh>
  </TresGroup>

  <!-- Visual Helpers -->
  <TresAxesHelper />
  <TresGridHelper />
</template>
