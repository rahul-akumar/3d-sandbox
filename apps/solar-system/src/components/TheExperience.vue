<script setup lang="ts">
import { ref, provide, onMounted, onUnmounted } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { EffectComposerPmndrs, BloomPmndrs } from '@tresjs/post-processing'
import { BlendFunction, KernelSize } from 'postprocessing'
import Planet from './Planet.vue'
import AsteroidBelt from './AsteroidBelt.vue'
import FireSun from './FireSun.vue'
import RedShiftStars from './RedShiftStars.vue'
import { useFirstPersonCamera } from '../composables/useFirstPersonCamera'
import { useCelestialSelection } from '../composables/useCelestialSelection'
import * as THREE from 'three'

// Play/pause state
const isPaused = ref(false)
provide('isPaused', isPaused)

const togglePause = () => {
  isPaused.value = !isPaused.value
}

// Simulation speed state
const speedMultipliers = [1, 2, 4, 6, 8, 10]
const currentSpeedIndex = ref(0)
const simulationSpeed = ref(speedMultipliers[0])
provide('simulationSpeed', simulationSpeed)

const cycleSpeed = () => {
  currentSpeedIndex.value = (currentSpeedIndex.value + 1) % speedMultipliers.length
  simulationSpeed.value = speedMultipliers[currentSpeedIndex.value]
}

// Orbit visibility state
const showOrbits = ref(true)
provide('showOrbits', showOrbits)

const toggleOrbits = () => {
  showOrbits.value = !showOrbits.value
}

// Star visibility state
const showStars = ref(true)

const toggleStars = () => {
  showStars.value = !showStars.value
}

// Refs for camera and scene
const fireSunRef = ref<InstanceType<typeof FireSun> | null>(null)
const cameraRef = ref<THREE.PerspectiveCamera | null>(null)

// Help overlay visibility
const showHelp = ref(false)

// Setup camera controls and selection
// Note: scene is optional in composables, raycasting will work once scene is available
const { updateCamera, resetCamera, isPointerLocked } = useFirstPersonCamera({
  camera: cameraRef,
})

const { selectedBody, focusOnSelected, updateFocus } = useCelestialSelection({
  camera: cameraRef,
  getScene: () => {
    // Get scene from camera's parent hierarchy
    if (cameraRef.value && cameraRef.value.parent) {
      let current: any = cameraRef.value
      while (current) {
        if (current.type === 'Scene') {
          return current as THREE.Scene
        }
        current = current.parent
      }
    }
    return null
  },
})

// Handle keyboard shortcuts
const onKeyDown = (event: KeyboardEvent) => {
  if (event.code === 'KeyH') {
    showHelp.value = !showHelp.value
  } else if (event.code === 'KeyR') {
    resetCamera()
  } else if (event.code === 'KeyF' && selectedBody.value) {
    focusOnSelected()
  }
}

// Animation loop
let lastTime = performance.now()
let animationFrameId: number

const animate = () => {
  const currentTime = performance.now()
  const delta = (currentTime - lastTime) / 1000 // Convert to seconds
  lastTime = currentTime

  updateCamera(delta)
  updateFocus(delta)

  animationFrameId = requestAnimationFrame(animate)
}

// Configure camera to see all layers and setup controls on mount
onMounted(() => {
  if (cameraRef.value) {
    cameraRef.value.layers.enableAll()
  }
  document.addEventListener('keydown', onKeyDown)
  
  // Start animation loop
  lastTime = performance.now()
  animate()
})

onUnmounted(() => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  document.removeEventListener('keydown', onKeyDown)
})

const planets = [
  {
    name: 'Mercury',
    size: 0.4,
    distance: 30,
    color: '#8c8c8c',
    speed: 0.3,
    texture: '/textures/mercury.jpg',
    moons: []
  },
  {
    name: 'Venus',
    size: 0.9,
    distance: 50,
    color: '#e3bb76',
    speed: 0.25,
    texture: '/textures/venus.jpg',
    moons: []
  },
  {
    name: 'Earth',
    size: 1.0,
    distance: 70,
    color: '#2277ff',
    speed: 0.2,
    texture: '/textures/earth.jpg',
    moons: [
      { name: 'Moon', size: 0.27, distance: 3.5, color: '#aaaaaa', speed: 0.5, texture: '/textures/moon.jpg' }
    ]
  },
  {
    name: 'Mars',
    size: 0.5,
    distance: 100,
    color: '#df4020',
    speed: 0.16,
    texture: '/textures/mars.jpg',
    moons: [
      { name: 'Phobos', size: 0.08, distance: 2.0, color: '#8b7355', speed: 0.8, texture: '/textures/phobos.jpg' },
      { name: 'Deimos', size: 0.06, distance: 3.0, color: '#9d8568', speed: 0.6, texture: '/textures/deimos.jpg' }
    ]
  },
  {
    name: 'Jupiter',
    size: 5.0,
    distance: 200,
    color: '#d8ca9d',
    speed: 0.08,
    texture: '/textures/jupiter.jpg',
    moons: [
      { name: 'Io', size: 0.36, distance: 12, color: '#ffdd77', speed: 0.5 },
      { name: 'Europa', size: 0.31, distance: 14, color: '#ccbbaa', speed: 0.4 },
      { name: 'Ganymede', size: 0.53, distance: 17, color: '#998877', speed: 0.3 },
      { name: 'Callisto', size: 0.48, distance: 20, color: '#776655', speed: 0.25 }
    ]
  },
  {
    name: 'Saturn',
    size: 4.0,
    distance: 320,
    color: '#fcd900',
    speed: 0.06,
    texture: '/textures/saturn.jpg',
    hasRings: true,
    moons: [
      { name: 'Titan', size: 0.51, distance: 14, color: '#cc8844', speed: 0.36, texture: '/textures/titan.jpg' },
      { name: 'Rhea', size: 0.15, distance: 16, color: '#aabbcc', speed: 0.3, },
      { name: 'Iapetus', size: 0.15, distance: 18, color: '#665544', speed: 0.24, }
    ]
  },
  {
    name: 'Uranus',
    size: 2.0,
    distance: 450,
    color: '#4fd0e7',
    speed: 0.04,
    texture: '/textures/uranus.jpg',
    moons: [
      { name: 'Miranda', size: 0.12, distance: 6, color: '#b0c4d0', speed: 0.6 },
      { name: 'Ariel', size: 0.12, distance: 7.5, color: '#c0d4e0', speed: 0.5 },
      { name: 'Umbriel', size: 0.12, distance: 9, color: '#8899aa', speed: 0.4 },
      { name: 'Titania', size: 0.16, distance: 10.5, color: '#9daabb', speed: 0.36 },
      { name: 'Oberon', size: 0.15, distance: 12, color: '#8899aa', speed: 0.3 }
    ]
  },
  {
    name: 'Neptune',
    size: 2.0,
    distance: 600,
    color: '#4b70dd',
    speed: 0.02,
    texture: '/textures/neptune.jpg',
    moons: [
      { name: 'Triton', size: 0.27, distance: 7, color: '#aaccee', speed: 0.4, texture: '/textures/triton.jpg' }
    ]
  },
]
</script>

<template>
  <div style="position: relative; width: 100%; height: 100vh;">
    <!-- HUD Control Bar -->
    <div class="hud-bar">
      <!-- Play/Pause Button -->
      <button @click="togglePause" class="control-button play-pause-button" :class="{ paused: isPaused }">
        {{ isPaused ? '▶' : '⏸' }}
      </button>

      <!-- Speed Control Button -->
      <button @click="cycleSpeed" class="control-button speed-button">
        {{ simulationSpeed }}×
      </button>

      <!-- Orbit Toggle Button -->
      <button @click="toggleOrbits" class="control-button orbit-toggle-button" :class="{ hidden: !showOrbits }">
        {{ showOrbits ? '○' : '◉' }}
      </button>

      <!-- Star Toggle Button -->
      <button @click="toggleStars" class="control-button star-toggle-button" :class="{ hidden: !showStars }">
        {{ showStars ? '★' : '☆' }}
      </button>
    </div>

    <!-- Selected Body Info -->
    <div v-if="selectedBody" class="selected-info">
      <div class="selected-label">{{ selectedBody.type.toUpperCase() }}</div>
      <div class="selected-name">{{ selectedBody.name }}</div>
      <div class="selected-hint">Press F to focus</div>
    </div>

    <!-- Help Overlay -->
    <div v-if="showHelp" class="help-overlay">
      <div class="help-content">
        <h2>Controls</h2>
        <div class="help-section">
          <h3>Movement</h3>
          <div class="help-item"><kbd>W A S D</kbd> Move around</div>
          <div class="help-item"><kbd>Space</kbd> Move up</div>
          <div class="help-item"><kbd>Shift</kbd> Move down</div>
          <div class="help-item"><kbd>Mouse</kbd> Look around (click to lock)</div>
          <div class="help-item"><kbd>Scroll</kbd> Zoom to cursor</div>
        </div>
        <div class="help-section">
          <h3>Actions</h3>
          <div class="help-item"><kbd>Click</kbd> Select celestial body</div>
          <div class="help-item"><kbd>F</kbd> Focus on selected body</div>
          <div class="help-item"><kbd>R</kbd> Reset camera to sun view</div>
        </div>
        <div class="help-section">
          <h3>Simulation</h3>
          <div class="help-item"><kbd>⏸/▶</kbd> Play/Pause</div>
          <div class="help-item"><kbd>Speed</kbd> Change simulation speed</div>
          <div class="help-item"><kbd>○</kbd> Toggle orbits</div>
          <div class="help-item"><kbd>★</kbd> Toggle stars</div>
        </div>
        <div class="help-close">Press <kbd>H</kbd> to close</div>
      </div>
    </div>

    <!-- Pointer Lock Hint -->
    <div v-if="!isPointerLocked" class="pointer-hint">
      Click to enable free camera • Press <kbd>H</kbd> for controls
    </div>

    <TresCanvas clear-color="#000000" window-size :shadows="true">
      <TresPerspectiveCamera ref="cameraRef" :position="[0, 150, 450]" :look-at="[0, 0, 0]" />
      <RedShiftStars v-if="showStars" :count="15000" :radius="1200" :depth="800" :size="1.5" />

      <!-- Reduced ambient light to see shadows better -->
      <TresAmbientLight :intensity="0.05" />
      <!-- Sun Light with Shadows -->
      <TresPointLight :position="[0, 0, 0]" :intensity="1000" :distance="700" :decay="2" cast-shadow />

      <!-- Fire Sun -->
      <FireSun ref="fireSunRef" :radius="5" :position="[0, 0, 0]" />

      <!-- Planets -->
      <Planet v-for="planet in planets" :key="planet.name" :name="planet.name" :size="planet.size" :distance="planet.distance"
        :color="planet.color" :speed="planet.speed" :texture="planet.texture" :moons="planet.moons" 
        :has-rings="planet.hasRings" />

      <!-- Asteroid Belt between Mars and Jupiter -->
      <AsteroidBelt :count="10000" :min-radius="120" :max-radius="170" :size="0.3" />

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
.hud-bar {
  position: absolute;
  bottom: max(80px, calc(20px + env(safe-area-inset-bottom)));
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  display: flex;
  flex-direction: row;
  gap: 15px;
  align-items: center;
  padding: 10px 20px;
  background: rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  border-radius: 50px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

/* Desktop - bring controls closer to bottom */
@media (min-width: 768px) {
  .hud-bar {
    bottom: calc(20px + env(safe-area-inset-bottom));
  }
}

.control-button {
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

.control-button:hover {
  transform: scale(1.1);
}

.play-pause-button.paused {
  background: rgba(255, 100, 100, 0.2);
}

.speed-button {
  background: rgba(100, 200, 255, 0.2);
}

.orbit-toggle-button.hidden {
  background: rgba(255, 255, 100, 0.2);
}

.star-toggle-button.hidden {
  background: rgba(150, 100, 255, 0.2);
}

/* Selected Body Info */
.selected-info {
  position: absolute;
  top: 40px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  text-align: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  padding: 15px 30px;
  border-radius: 15px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  color: white;
}

.selected-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 5px;
}

.selected-name {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 8px;
}

.selected-hint {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

/* Help Overlay */
.help-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2000;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(5px);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.help-content {
  max-width: 600px;
  padding: 40px;
  background: rgba(20, 20, 30, 0.9);
  border-radius: 20px;
  border: 2px solid rgba(255, 255, 255, 0.2);
}

.help-content h2 {
  margin-top: 0;
  margin-bottom: 30px;
  text-align: center;
  font-size: 32px;
  color: #fff;
}

.help-content h3 {
  margin-top: 20px;
  margin-bottom: 15px;
  font-size: 18px;
  color: rgba(255, 255, 255, 0.8);
}

.help-section {
  margin-bottom: 20px;
}

.help-item {
  margin-bottom: 10px;
  padding-left: 10px;
  font-size: 16px;
}

.help-close {
  margin-top: 30px;
  text-align: center;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
}

kbd {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 5px;
  padding: 3px 8px;
  font-family: monospace;
  font-size: 14px;
  margin: 0 2px;
}

/* Pointer Lock Hint */
.pointer-hint {
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1000;
  text-align: center;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(10px);
  padding: 12px 20px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 14px;
}
</style>
