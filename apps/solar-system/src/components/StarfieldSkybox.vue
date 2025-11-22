<script setup lang="ts">
import { ref, onMounted, watch, inject, type Ref } from 'vue'
import { useLoop } from '@tresjs/core'
import * as THREE from 'three'

const isPaused = inject<Ref<boolean>>('isPaused', ref(false))

const props = withDefaults(defineProps<{
  texture: string
  radius?: number
  rotationY?: number // Rotate the starfield horizontally (radians)
  rotationX?: number // Tilt the starfield (radians)
  rotationSpeed?: number // Very slow rotation speed (radians per second)
}>(), {
  radius: 2000, // Large sphere to encompass entire solar system
  rotationY: 0, // Default: no rotation
  rotationX: 0,
  rotationSpeed: 0 // Default: static (set to ~0.00001 for subtle motion)
})

const skyboxRef = ref<THREE.Mesh | null>(null)
const textureMap = ref<THREE.Texture | null>(null)

// Load the star map texture with basic diagnostics
const loader = new THREE.TextureLoader()
loader.load(
  props.texture,
  (texture) => {
    // Improve visual quality for large textures
    texture.colorSpace = THREE.SRGBColorSpace
    texture.generateMipmaps = true
    texture.anisotropy = 16
    textureMap.value = texture
    console.log('[StarfieldSkybox] Loaded texture:', props.texture, texture.image?.width + 'x' + texture.image?.height)
  },
  undefined,
  (error) => {
    console.error('[StarfieldSkybox] Failed to load texture', props.texture, error)
  }
)

onMounted(() => {
  if (skyboxRef.value) {
    // Place skybox on bloom layer 2 for subtle glow effect
    skyboxRef.value.layers.set(2)
    // Ensure always considered in view
    skyboxRef.value.frustumCulled = false
    // Apply rotation to orient the starfield correctly
    skyboxRef.value.rotation.y = props.rotationY
    skyboxRef.value.rotation.x = props.rotationX
  }
})

watch(textureMap, (t) => {
  if (!t) return
  // Nothing to do, material reacts via v-if; log to aid debugging
  console.log('[StarfieldSkybox] Texture applied to skybox')
})

// Optional subtle rotation animation
const { onBeforeRender } = useLoop()

onBeforeRender(({ delta }) => {
  if (skyboxRef.value && props.rotationSpeed !== 0 && !isPaused.value) {
    skyboxRef.value.rotation.y += props.rotationSpeed * delta
  }
})
</script>

<template>
  <!-- Inverted sphere for skybox -->
  <TresMesh ref="skyboxRef" :position="[0, 0, 0]">
    <!-- Large sphere with inverted normals -->
    <TresSphereGeometry :args="[radius, 64, 64]" />
    <TresMeshBasicMaterial
      v-if="textureMap"
      :map="textureMap"
      :side="THREE.BackSide"
      :depth-write="false"
      :fog="false"
      :tone-mapped="false"
    />
    <!-- Fallback while loading -->
    <TresMeshBasicMaterial
      v-else
      color="#000000"
      :side="THREE.BackSide"
      :depth-write="false"
    />
  </TresMesh>
</template>
