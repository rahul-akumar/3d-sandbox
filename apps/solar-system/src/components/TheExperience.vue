<script setup lang="ts">
import { ref } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls, Stars } from '@tresjs/cientos'
import Planet from './Planet.vue'
import AsteroidBelt from './AsteroidBelt.vue'
import * as THREE from 'three'

// Load sun texture
const sunTexture = ref<THREE.Texture | null>(null)
const loader = new THREE.TextureLoader()
loader.load('/textures/sun.jpg', (texture) => {
  sunTexture.value = texture
})

const planets = [
  { name: 'Mercury', size: 0.4, distance: 10, color: '#8c8c8c', speed: 1.5, texture: '/textures/mercury.jpg' },
  { name: 'Venus', size: 0.9, distance: 15, color: '#e3bb76', speed: 1.2, texture: '/textures/venus.jpg' },
  { name: 'Earth', size: 1.0, distance: 20, color: '#2277ff', speed: 1.0, texture: '/textures/earth.jpg' },
  { name: 'Mars', size: 0.5, distance: 25, color: '#df4020', speed: 0.8, texture: '/textures/mars.jpg' },
  { name: 'Jupiter', size: 5.0, distance: 40, color: '#d8ca9d', speed: 0.4, texture: '/textures/jupiter.jpg' },
  { name: 'Saturn', size: 4.0, distance: 60, color: '#fcd900', speed: 0.3, texture: '/textures/saturn.jpg' },
  { name: 'Uranus', size: 2.0, distance: 80, color: '#4fd0e7', speed: 0.2, texture: '/textures/uranus.jpg' },
  { name: 'Neptune', size: 2.0, distance: 100, color: '#4b70dd', speed: 0.1, texture: '/textures/neptune.jpg' },
]
</script>

<template>
  <TresCanvas clear-color="#000000" window-size>
    <TresPerspectiveCamera :position="[0, 50, 100]" :look-at="[0, 0, 0]" />
    <OrbitControls />
    <Stars />

    <TresAmbientLight :intensity="0.2" />
    <!-- Sun Light -->
    <TresPointLight :position="[0, 0, 0]" :intensity="2" :distance="1000" :decay="2" />

    <!-- Sun Visual -->
    <TresMesh :position="[0, 0, 0]">
      <TresSphereGeometry :args="[5, 32, 32]" />
      <TresMeshBasicMaterial 
        v-if="sunTexture" 
        :map="sunTexture" 
      />
      <TresMeshBasicMaterial 
        v-else 
        color="#ffff00" 
      />
    </TresMesh>

    <!-- Planets -->
    <Planet v-for="planet in planets" :key="planet.name" :size="planet.size" :distance="planet.distance"
      :color="planet.color" :speed="planet.speed" :texture="planet.texture" />

    <!-- Asteroid Belt between Mars and Jupiter -->
    <AsteroidBelt :count="1000" :min-radius="28" :max-radius="35" :size="0.1" />
  </TresCanvas>
</template>
