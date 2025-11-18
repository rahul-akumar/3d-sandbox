<script setup lang="ts">
import { useLoop } from '@tresjs/core'
import { ref, computed, onMounted, shallowRef } from 'vue'
import { BufferAttribute, Color, PlaneGeometry, PerspectiveCamera, Vector3 } from 'three'
import { useSceneControls } from '../composables/use-scene-controls'
import { OrbitControls } from '@tresjs/cientos'

const { state } = useSceneControls()

// Reference to our donut mesh for animation
const donutRef = ref()

// Reference to the Three.js camera controlled by OrbitControls
const cameraRef = ref<PerspectiveCamera | null>(null)

// Reference to OrbitControls so we can keep its target in sync when moving the camera
const controlsRef = ref<InstanceType<typeof OrbitControls> | null>(null)

// Terrain geometry (low-poly, noise-based)
const terrainGeometry = shallowRef<PlaneGeometry | null>(null)

const terrainSize = 60
const terrainSegments = 100
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

// Movement configuration for WASD controls
const moveSpeed = 60 // units per second

function clearSelection() {
  state.interaction.selectedObject = 'none'
}

function selectDonut() {
  // When the donut is selected, clear any active movement so the camera stops
  state.input.moveForward = false
  state.input.moveBackward = false
  state.input.moveLeft = false
  state.input.moveRight = false
  state.interaction.selectedObject = 'donut'
}

// Animation & update loop
const { onBeforeRender } = useLoop()

onBeforeRender(({ elapsed, delta, camera }) => {
  // Keep reactive camera state in sync with the actual Three.js camera
  const cam = (cameraRef.value ?? camera.value) as PerspectiveCamera | undefined
  if (!cam) return

  // WASD camera movement, relative to the camera's facing direction, when nothing is selected
  if (state.interaction.selectedObject === 'none') {
    const hasInput =
      state.input.moveForward ||
      state.input.moveBackward ||
      state.input.moveLeft ||
      state.input.moveRight

    if (hasInput) {
      const dt = typeof delta === 'number' ? delta : 0.016

      const forward = new Vector3()
      cam.getWorldDirection(forward)
      forward.y = 0
      if (forward.lengthSq() > 0) {
        forward.normalize()
      }

      const right = new Vector3().crossVectors(forward, cam.up).normalize()

      const moveDir = new Vector3()
      if (state.input.moveForward) moveDir.add(forward)
      if (state.input.moveBackward) moveDir.sub(forward)
      if (state.input.moveRight) moveDir.add(right)
      if (state.input.moveLeft) moveDir.sub(right)

      if (moveDir.lengthSq() > 0) {
        moveDir.normalize().multiplyScalar(moveSpeed * dt)
        cam.position.add(moveDir)

        // Keep OrbitControls' target in sync so orbiting still feels natural
        if (controlsRef.value && 'target' in controlsRef.value) {
          ; (controlsRef.value as any).target.add(moveDir)
        }
      }
    }
  }

  state.camera.position = [cam.position.x, cam.position.y, cam.position.z]
  state.camera.fov = cam.fov

  if (!animationEnabled.value || !donutRef.value) return

  donutRef.value.rotation.x = elapsed * rotationSpeedX.value
  donutRef.value.rotation.y = elapsed * rotationSpeedY.value
})
</script>

<template>
  <!-- Camera Setup -->
  <TresPerspectiveCamera ref="cameraRef" :position="cameraPosition" :fov="cameraFov" :look-at="[0, 0, 0]" />
  <OrbitControls ref="controlsRef" make-default :enable-pan="true" :enable-damping="true" :damping-factor="0.05"
    :enable-zoom="true" />
  <!-- Basic lighting for standard material -->
  <TresAmbientLight :intensity="ambientIntensity" :color="ambientColor" />
  <TresDirectionalLight :position="directionalPosition" :intensity="directionalIntensity" :color="directionalColor"
    cast-shadow />

  <!-- Low-poly terrain -->
  <TresMesh v-if="terrainGeometry" :geometry="terrainGeometry" :rotation="[-Math.PI / 2, 0, 0]" :position="[0, -3, 0]"
    receive-shadow @pointerdown="clearSelection">
    <TresMeshStandardMaterial vertex-colors flat-shading />
  </TresMesh>

  <!-- The Donut (solid + wireframe) -->
  <TresGroup ref="donutRef" :position="objectPosition" :scale="objectScale" @pointerdown.stop="selectDonut">
    <!-- Solid mesh -->
    <TresMesh cast-shadow>
      <TresIcosahedronGeometry :args="[1, 2]" />
      <TresMeshStandardMaterial :color="materialColor" :metalness="metalness" :roughness="roughness" />
    </TresMesh>
  </TresGroup>

  <!-- Visual Helpers -->
  <TresAxesHelper />
  <TresGridHelper />
</template>
