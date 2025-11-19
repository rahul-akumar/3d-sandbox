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
  { 
    name: 'Mercury', 
    size: 0.4, 
    distance: 10, 
    color: '#8c8c8c', 
    speed: 1.5, 
    texture: '/textures/mercury.jpg',
    moons: []
  },
  { 
    name: 'Venus', 
    size: 0.9, 
    distance: 15, 
    color: '#e3bb76', 
    speed: 1.2, 
    texture: '/textures/venus.jpg',
    moons: []
  },
  { 
    name: 'Earth', 
    size: 1.0, 
    distance: 20, 
    color: '#2277ff', 
    speed: 1.0, 
    texture: '/textures/earth.jpg',
    moons: [
      { name: 'Moon', size: 0.27, distance: 2, color: '#aaaaaa', speed: 2.5 }
    ]
  },
  { 
    name: 'Mars', 
    size: 0.5, 
    distance: 25, 
    color: '#df4020', 
    speed: 0.8, 
    texture: '/textures/mars.jpg',
    moons: [
      { name: 'Phobos', size: 0.08, distance: 1.2, color: '#8b7355', speed: 4.0 },
      { name: 'Deimos', size: 0.06, distance: 1.8, color: '#9d8568', speed: 3.0 }
    ]
  },
  { 
    name: 'Jupiter', 
    size: 5.0, 
    distance: 40, 
    color: '#d8ca9d', 
    speed: 0.4, 
    texture: '/textures/jupiter.jpg',
    moons: [
      { name: 'Io', size: 0.36, distance: 7, color: '#ffdd77', speed: 2.5 },
      { name: 'Europa', size: 0.31, distance: 8.5, color: '#ccbbaa', speed: 2.0 },
      { name: 'Ganymede', size: 0.53, distance: 10, color: '#998877', speed: 1.5 },
      { name: 'Callisto', size: 0.48, distance: 12, color: '#776655', speed: 1.2 }
    ]
  },
  { 
    name: 'Saturn', 
    size: 4.0, 
    distance: 60, 
    color: '#fcd900', 
    speed: 0.3, 
    texture: '/textures/saturn.jpg',
    moons: [
      { name: 'Titan', size: 0.51, distance: 8, color: '#cc8844', speed: 1.8 },
      { name: 'Rhea', size: 0.15, distance: 9.5, color: '#aabbcc', speed: 1.5 },
      { name: 'Iapetus', size: 0.15, distance: 11, color: '#665544', speed: 1.2 }
    ]
  },
  { 
    name: 'Uranus', 
    size: 2.0, 
    distance: 80, 
    color: '#4fd0e7', 
    speed: 0.2, 
    texture: '/textures/uranus.jpg',
    moons: [
      { name: 'Miranda', size: 0.12, distance: 3.5, color: '#b0c4d0', speed: 3.0 },
      { name: 'Ariel', size: 0.12, distance: 4.5, color: '#c0d4e0', speed: 2.5 },
      { name: 'Umbriel', size: 0.12, distance: 5.5, color: '#8899aa', speed: 2.0 },
      { name: 'Titania', size: 0.16, distance: 6.5, color: '#9daabb', speed: 1.8 },
      { name: 'Oberon', size: 0.15, distance: 7.5, color: '#8899aa', speed: 1.5 }
    ]
  },
  { 
    name: 'Neptune', 
    size: 2.0, 
    distance: 100, 
    color: '#4b70dd', 
    speed: 0.1, 
    texture: '/textures/neptune.jpg',
    moons: [
      { name: 'Triton', size: 0.27, distance: 4, color: '#aaccee', speed: 2.0 }
    ]
  },
]
</script>

<template>
  <TresCanvas clear-color="#000000" window-size :shadows="true">
    <TresPerspectiveCamera :position="[0, 50, 100]" :look-at="[0, 0, 0]" />
    <OrbitControls />
    <Stars />

    <!-- Reduced ambient light to see shadows better -->
    <TresAmbientLight :intensity="0.05" />
    <!-- Sun Light with Shadows -->
    <TresPointLight :position="[0, 0, 0]" :intensity="500" :distance="100" :decay="2" cast-shadow />
    <!-- Helper to visualize light (optional - can remove later) -->
    <TresMesh :position="[0, 0, 0]">
      <TresSphereGeometry :args="[0.5, 16, 16]" />
      <TresMeshBasicMaterial color="#ff0000" wireframe />
    </TresMesh>

    <!-- Sun Visual -->
    <TresMesh :position="[0, 0, 0]">
      <TresSphereGeometry :args="[5, 32, 32]" />
      <TresMeshBasicMaterial v-if="sunTexture" :map="sunTexture" />
      <TresMeshBasicMaterial v-else color="#ffff00" />
    </TresMesh>

    <!-- Planets -->
    <Planet v-for="planet in planets" :key="planet.name" :size="planet.size" :distance="planet.distance"
      :color="planet.color" :speed="planet.speed" :texture="planet.texture" :moons="planet.moons" />

    <!-- Asteroid Belt between Mars and Jupiter -->
    <AsteroidBelt :count="1000" :min-radius="28" :max-radius="35" :size="0.1" />
  </TresCanvas>
</template>
