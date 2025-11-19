<script setup lang="ts">
import { ref, provide, onMounted } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import { EffectComposerPmndrs, BloomPmndrs } from '@tresjs/post-processing'
import { BlendFunction, KernelSize } from 'postprocessing'
import Planet from './Planet.vue'
import AsteroidBelt from './AsteroidBelt.vue'
import FireSun from './FireSun.vue'
import RedShiftStars from './RedShiftStars.vue'
import * as THREE from 'three'

// Play/pause state
const isPaused = ref(false)
provide('isPaused', isPaused)

const togglePause = () => {
  isPaused.value = !isPaused.value
}

// Ref for sun mesh
const fireSunRef = ref<InstanceType<typeof FireSun> | null>(null)
const cameraRef = ref<THREE.PerspectiveCamera | null>(null)

// Configure camera to see all layers on mount
onMounted(() => {
  if (cameraRef.value) {
    cameraRef.value.layers.enableAll()
  }
})

const planets = [
  {
    name: 'Mercury',
    size: 0.4,
    distance: 30,
    color: '#8c8c8c',
    speed: 1.5,
    texture: '/textures/mercury.jpg',
    moons: []
  },
  {
    name: 'Venus',
    size: 0.9,
    distance: 50,
    color: '#e3bb76',
    speed: 1.2,
    texture: '/textures/venus.jpg',
    moons: []
  },
  {
    name: 'Earth',
    size: 1.0,
    distance: 70,
    color: '#2277ff',
    speed: 1.0,
    texture: '/textures/earth.jpg',
    moons: [
      { name: 'Moon', size: 0.27, distance: 3.5, color: '#aaaaaa', speed: 2.5, texture: '/textures/moon.jpg' }
    ]
  },
  {
    name: 'Mars',
    size: 0.5,
    distance: 100,
    color: '#df4020',
    speed: 0.8,
    texture: '/textures/mars.jpg',
    moons: [
      { name: 'Phobos', size: 0.08, distance: 2.0, color: '#8b7355', speed: 4.0, texture: '/textures/phobos.jpg' },
      { name: 'Deimos', size: 0.06, distance: 3.0, color: '#9d8568', speed: 3.0, texture: '/textures/deimos.jpg' }
    ]
  },
  {
    name: 'Jupiter',
    size: 5.0,
    distance: 200,
    color: '#d8ca9d',
    speed: 0.4,
    texture: '/textures/jupiter.jpg',
    moons: [
      { name: 'Io', size: 0.36, distance: 12, color: '#ffdd77', speed: 2.5 },
      { name: 'Europa', size: 0.31, distance: 14, color: '#ccbbaa', speed: 2.0 },
      { name: 'Ganymede', size: 0.53, distance: 17, color: '#998877', speed: 1.5 },
      { name: 'Callisto', size: 0.48, distance: 20, color: '#776655', speed: 1.2 }
    ]
  },
  {
    name: 'Saturn',
    size: 4.0,
    distance: 320,
    color: '#fcd900',
    speed: 0.3,
    texture: '/textures/saturn.jpg',
    moons: [
      { name: 'Titan', size: 0.51, distance: 14, color: '#cc8844', speed: 1.8, texture: '/textures/titan.jpg' },
      { name: 'Rhea', size: 0.15, distance: 16, color: '#aabbcc', speed: 1.5, },
      { name: 'Iapetus', size: 0.15, distance: 18, color: '#665544', speed: 1.2, }
    ]
  },
  {
    name: 'Uranus',
    size: 2.0,
    distance: 450,
    color: '#4fd0e7',
    speed: 0.2,
    texture: '/textures/uranus.jpg',
    moons: [
      { name: 'Miranda', size: 0.12, distance: 6, color: '#b0c4d0', speed: 3.0 },
      { name: 'Ariel', size: 0.12, distance: 7.5, color: '#c0d4e0', speed: 2.5 },
      { name: 'Umbriel', size: 0.12, distance: 9, color: '#8899aa', speed: 2.0 },
      { name: 'Titania', size: 0.16, distance: 10.5, color: '#9daabb', speed: 1.8 },
      { name: 'Oberon', size: 0.15, distance: 12, color: '#8899aa', speed: 1.5 }
    ]
  },
  {
    name: 'Neptune',
    size: 2.0,
    distance: 600,
    color: '#4b70dd',
    speed: 0.1,
    texture: '/textures/neptune.jpg',
    moons: [
      { name: 'Triton', size: 0.27, distance: 7, color: '#aaccee', speed: 2.0, texture: '/textures/triton.jpg' }
    ]
  },
]
</script>

<template>
  <div style="position: relative; width: 100%; height: 100vh;">
    <!-- Play/Pause Button -->
    <button @click="togglePause" class="play-pause-button" :class="{ paused: isPaused }">
      {{ isPaused ? '▶' : '⏸' }}
    </button>

    <TresCanvas clear-color="#000000" window-size :shadows="true">
      <TresPerspectiveCamera ref="cameraRef" :position="[0, 150, 450]" :look-at="[0, 0, 0]" />
      <OrbitControls />
      <RedShiftStars :count="15000" :radius="1200" :depth="800" :size="1.5" />

      <!-- Reduced ambient light to see shadows better -->
      <TresAmbientLight :intensity="0.05" />
      <!-- Sun Light with Shadows -->
      <TresPointLight :position="[0, 0, 0]" :intensity="1000" :distance="700" :decay="2" cast-shadow />

      <!-- Fire Sun -->
      <FireSun ref="fireSunRef" :radius="5" :position="[0, 0, 0]" />

      <!-- Planets -->
      <Planet v-for="planet in planets" :key="planet.name" :size="planet.size" :distance="planet.distance"
        :color="planet.color" :speed="planet.speed" :texture="planet.texture" :moons="planet.moons" />

      <!-- Asteroid Belt between Mars and Jupiter -->
      <AsteroidBelt :count="1000" :min-radius="130" :max-radius="170" :size="0.1" />

      <!-- Post-processing with separate bloom for sun and stars -->
      <EffectComposerPmndrs>
        <!-- Bloom for Sun (Layer 1) -->
        <BloomPmndrs :intensity="2.5" :luminance-threshold="0.1" :luminance-smoothing="0.9"
          :blend-function="BlendFunction.ADD" :kernel-size="KernelSize.LARGE" :layers="1" />
        <!-- Bloom for Stars (Layer 2) -->
        <BloomPmndrs :intensity="0.5" :luminance-threshold="0.2" :luminance-smoothing="0.7"
          :blend-function="BlendFunction.ADD" :kernel-size="KernelSize.MEDIUM" :layers="2" />
      </EffectComposerPmndrs>
    </TresCanvas>
  </div>
</template>

<style scoped>
.play-pause-button {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1000;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: rgba(100, 255, 100, 0.2);
  backdrop-filter: blur(10px);
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.play-pause-button:hover {
  transform: scale(1.1);
}

.play-pause-button.paused {
  background: rgba(255, 100, 100, 0.2);
}
</style>
