<script setup lang="ts">
import { ref, provide, onMounted, onUnmounted, watch, watchEffect } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls } from '@tresjs/cientos'
import { EffectComposerPmndrs, BloomPmndrs } from '@tresjs/post-processing'
import { BlendFunction, KernelSize } from 'postprocessing'
import Planet from './Planet.vue'
import AsteroidBelt from './AsteroidBelt.vue'
import FireSun from './FireSun.vue'
import StarfieldSkybox from './StarfieldSkybox.vue'
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
const orbitControlsRef = ref<any>(null)
const sunLightRef = ref<THREE.PointLight | null>(null)

// Camera mode state
const isFlyMode = ref(false)
const orbitTarget = ref(new THREE.Vector3(0, 0, 0)) // Default to sun

// Help overlay visibility
const showHelp = ref(false)

// Fly mode camera position (separate from orbit mode)
const flyModePosition = new THREE.Vector3(0, 100, 300)
const orbitModePosition = new THREE.Vector3(0, 150, 450)

// Setup camera controls and selection
const { updateCamera, resetCamera, isPointerLocked } = useFirstPersonCamera({
  camera: cameraRef,
  initialPosition: flyModePosition,
  enabled: isFlyMode,
})

const { selectedBody, toggleFollow, updateFollow, isFollowing } = useCelestialSelection({
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

// Toggle camera mode
const toggleCameraMode = () => {
  isFlyMode.value = !isFlyMode.value

  if (isFlyMode.value) {
    // Switching to fly mode - preserve current camera position and rotation
    // Do NOT reset camera rotation - it should start exactly where orbit mode was
  } else {
    // Switching to orbit mode
    // Exit pointer lock if active
    if (document.pointerLockElement) {
      document.exitPointerLock()
    }
  }
}

// Handle keyboard shortcuts
const onKeyDown = (event: KeyboardEvent) => {
  if (event.code === 'KeyH') {
    showHelp.value = !showHelp.value
  } else if (event.code === 'Space') {
    event.preventDefault() // Prevent page scroll
    togglePause()
  } else if (event.code === 'KeyR') {
    if (isFlyMode.value) {
      resetCamera()
    } else {
      // Reset to sun in orbit mode
      orbitTarget.value.set(0, 0, 0)
      if (cameraRef.value) {
        cameraRef.value.position.copy(orbitModePosition)
      }
    }
  } else if (event.code === 'KeyF' && selectedBody.value) {
    toggleFollow()
  }
}

// Watch for selected body changes to update orbit target
watch(selectedBody, (newBody) => {
  if (newBody && !isFlyMode.value) {
    // In orbit mode, change orbit target to selected body
    const bodyPosition = newBody.object.getWorldPosition(new THREE.Vector3())
    orbitTarget.value.copy(bodyPosition)

    // Update OrbitControls target if available
    if (orbitControlsRef.value && orbitControlsRef.value.target) {
      orbitControlsRef.value.target.copy(bodyPosition)
    }
  }
})

// Animation loop
let lastTime = performance.now()
let animationFrameId: number

const animate = () => {
  const currentTime = performance.now()
  const delta = (currentTime - lastTime) / 1000 // Convert to seconds
  lastTime = currentTime

  // WASD camera movement works in both modes
  updateCamera(delta)

  if (isFlyMode.value) {
    // Follow mode in fly mode
    updateFollow(delta)
  } else if (isFollowing.value && selectedBody.value) {
    // In orbit mode, continuously update orbit target to follow moving bodies
    const bodyPosition = selectedBody.value.object.getWorldPosition(new THREE.Vector3())
    orbitTarget.value.copy(bodyPosition)
    if (orbitControlsRef.value && orbitControlsRef.value.target) {
      orbitControlsRef.value.target.copy(bodyPosition)
    }
  }

  animationFrameId = requestAnimationFrame(animate)
}

// Configure shadow quality when light is ready
watchEffect(() => {
  if (sunLightRef.value) {
    // Higher resolution shadow map for sharper shadows
    sunLightRef.value.shadow.mapSize.width = 4096
    sunLightRef.value.shadow.mapSize.height = 4096
    
    // Optimize shadow camera frustum for the scene scale
    // Near plane just outside sun, far plane to cover outer planets
    sunLightRef.value.shadow.camera.near = 6  // Just past sun radius (5)
    sunLightRef.value.shadow.camera.far = 700 // Cover up to Neptune (~600)
    
    // Fine-tune bias to prevent shadow acne while keeping sharp edges
    sunLightRef.value.shadow.bias = -0.0005
    sunLightRef.value.shadow.normalBias = 0.02
  }
})

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

// Orbital speeds are based on real relative orbital periods
// Speed = 1 / orbital period in Earth years (so Earth = 1.0)
// Mercury: 0.241 yr, Venus: 0.615 yr, Earth: 1.0 yr, Mars: 1.88 yr
// Jupiter: 11.86 yr, Saturn: 29.46 yr, Uranus: 84.01 yr, Neptune: 164.8 yr
const planets = [
  {
    name: 'Mercury',
    size: 0.4,
    distance: 30,
    color: '#8c8c8c',
    speed: 4.15, // Orbital period: 88 days (0.241 years)
    texture: '/textures/mercury.jpg',
    axialTilt: 0.034, // degrees
    eccentricity: 0.206, // Most eccentric planet
    periapsisArgument: 29, // degrees
    inclination: 7.00, // degrees - highest inclination of inner planets
    longitudeOfAscendingNode: 48.33, // degrees
    moons: []
  },
  {
    name: 'Venus',
    size: 0.9,
    distance: 50,
    color: '#e3bb76',
    speed: 1.63, // Orbital period: 225 days (0.615 years)
    texture: '/textures/venus.jpg',
    axialTilt: 177.4, // degrees - retrograde rotation
    eccentricity: 0.007, // Nearly circular
    periapsisArgument: 55,
    inclination: 3.39, // degrees
    longitudeOfAscendingNode: 76.68, // degrees
    moons: []
  },
  {
    name: 'Earth',
    size: 1.0,
    distance: 70,
    color: '#2277ff',
    speed: 1.0, // Orbital period: 365.25 days (1 year) - reference
    texture: '/textures/earth.jpg',
    axialTilt: 23.44, // degrees
    eccentricity: 0.017, // Nearly circular
    periapsisArgument: 103,
    inclination: 0, // degrees - reference plane (ecliptic)
    longitudeOfAscendingNode: 0, // degrees
    moons: [
      { name: 'Moon', size: 0.27, distance: 3.5, color: '#aaaaaa', speed: 13.4, texture: '/textures/moon.jpg', eccentricity: 0.055, periapsisArgument: 0 } // ~27.3 day orbit
    ]
  },
  {
    name: 'Mars',
    size: 0.5,
    distance: 100,
    color: '#df4020',
    speed: 0.532, // Orbital period: 687 days (1.88 years)
    texture: '/textures/mars.jpg',
    axialTilt: 25.19, // degrees
    eccentricity: 0.093,
    periapsisArgument: 286,
    inclination: 1.85, // degrees
    longitudeOfAscendingNode: 49.56, // degrees
    moons: [
      { name: 'Phobos', size: 0.08, distance: 2.0, color: '#8b7355', speed: 1142, texture: '/textures/phobos.jpg', eccentricity: 0.015, periapsisArgument: 0 }, // 7.66 hour orbit
      { name: 'Deimos', size: 0.06, distance: 3.0, color: '#9d8568', speed: 290, texture: '/textures/deimos.jpg', eccentricity: 0.0003, periapsisArgument: 0 } // 30.3 hour orbit
    ]
  },
  {
    name: 'Jupiter',
    size: 5.0,
    distance: 200,
    color: '#d8ca9d',
    speed: 0.0843, // Orbital period: 11.86 years
    texture: '/textures/jupiter.jpg',
    axialTilt: 3.13, // degrees
    eccentricity: 0.049,
    periapsisArgument: 14,
    inclination: 1.31, // degrees
    longitudeOfAscendingNode: 100.46, // degrees
    moons: [
      { name: 'Io', size: 0.36, distance: 12, color: '#ffdd77', speed: 206, eccentricity: 0.004, periapsisArgument: 0 }, // 1.77 day orbit
      { name: 'Europa', size: 0.31, distance: 14, color: '#ccbbaa', speed: 103, eccentricity: 0.009, periapsisArgument: 0 }, // 3.55 day orbit
      { name: 'Ganymede', size: 0.53, distance: 17, color: '#998877', speed: 51, eccentricity: 0.001, periapsisArgument: 0 }, // 7.15 day orbit
      { name: 'Callisto', size: 0.48, distance: 20, color: '#776655', speed: 21.9, eccentricity: 0.007, periapsisArgument: 0 } // 16.7 day orbit
    ]
  },
  {
    name: 'Saturn',
    size: 4.0,
    distance: 320,
    color: '#fcd900',
    speed: 0.0339, // Orbital period: 29.46 years
    texture: '/textures/saturn.jpg',
    axialTilt: 26.73, // degrees
    eccentricity: 0.057,
    periapsisArgument: 93,
    inclination: 2.49, // degrees
    longitudeOfAscendingNode: 113.64, // degrees
    hasRings: true,
    moons: [
      { name: 'Titan', size: 0.51, distance: 14, color: '#cc8844', speed: 22.8, texture: '/textures/titan.jpg', eccentricity: 0.029, periapsisArgument: 0 }, // 16 day orbit
      { name: 'Rhea', size: 0.15, distance: 16, color: '#aabbcc', speed: 81, eccentricity: 0.001, periapsisArgument: 0 }, // 4.5 day orbit
      { name: 'Iapetus', size: 0.15, distance: 18, color: '#665544', speed: 4.6, eccentricity: 0.028, periapsisArgument: 0 } // 79 day orbit
    ]
  },
  {
    name: 'Uranus',
    size: 2.0,
    distance: 450,
    color: '#4fd0e7',
    speed: 0.0119, // Orbital period: 84.01 years
    texture: '/textures/uranus.jpg',
    axialTilt: 97.77, // degrees - rotates on its side!
    eccentricity: 0.046,
    periapsisArgument: 173,
    inclination: 0.77, // degrees
    longitudeOfAscendingNode: 74.01, // degrees
    moons: [
      { name: 'Miranda', size: 0.12, distance: 6, color: '#b0c4d0', speed: 259, eccentricity: 0.001, periapsisArgument: 0 }, // 1.41 day orbit
      { name: 'Ariel', size: 0.12, distance: 7.5, color: '#c0d4e0', speed: 144, eccentricity: 0.001, periapsisArgument: 0 }, // 2.52 day orbit
      { name: 'Umbriel', size: 0.12, distance: 9, color: '#8899aa', speed: 87, eccentricity: 0.004, periapsisArgument: 0 }, // 4.14 day orbit
      { name: 'Titania', size: 0.16, distance: 10.5, color: '#9daabb', speed: 42, eccentricity: 0.001, periapsisArgument: 0 }, // 8.71 day orbit
      { name: 'Oberon', size: 0.15, distance: 12, color: '#8899aa', speed: 27, eccentricity: 0.001, periapsisArgument: 0 } // 13.46 day orbit
    ]
  },
  {
    name: 'Neptune',
    size: 2.0,
    distance: 600,
    color: '#4b70dd',
    speed: 0.00607, // Orbital period: 164.8 years
    texture: '/textures/neptune.jpg',
    axialTilt: 28.32, // degrees
    eccentricity: 0.009,
    periapsisArgument: 44,
    inclination: 1.77, // degrees
    longitudeOfAscendingNode: 131.78, // degrees
    moons: [
      { name: 'Triton', size: 0.27, distance: 7, color: '#aaccee', speed: 62, texture: '/textures/triton.jpg', eccentricity: 0.00002, periapsisArgument: 0 } // 5.88 day retrograde orbit
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

      <!-- Fly Mode Toggle Button -->
      <button @click="toggleCameraMode" class="control-button fly-mode-button" :class="{ active: isFlyMode }">
        {{ isFlyMode ? '✈' : '⚙' }}
      </button>
    </div>

    <!-- Selected Body Info -->
    <div v-if="selectedBody" class="selected-info">
      <div class="selected-label">{{ selectedBody.type.toUpperCase() }}</div>
      <div class="selected-name">{{ selectedBody.name }}</div>
      <div class="selected-hint">Press F to {{ isFollowing ? 'stop following' : 'follow' }}</div>
    </div>

    <!-- Help Overlay -->
    <div v-if="showHelp" class="help-overlay">
      <div class="help-content">
        <h2>Controls</h2>
        <div class="help-section">
          <h3>Movement (Both Modes)</h3>
          <div class="help-item"><kbd>W A S D</kbd> Move camera in look direction</div>
          <div class="help-item"><kbd>⚙/✈</kbd> Toggle Orbit/Fly mode</div>
        </div>
        <div class="help-section">
          <h3>Orbit Mode (Default)</h3>
          <div class="help-item"><kbd>Drag</kbd> Rotate around target</div>
          <div class="help-item"><kbd>Scroll</kbd> Zoom in/out</div>
        </div>
        <div class="help-section">
          <h3>Fly Mode</h3>
          <div class="help-item"><kbd>Click</kbd> Lock mouse for free look</div>
          <div class="help-item"><kbd>Mouse</kbd> Look around freely</div>
        </div>
        <div class="help-section">
          <h3>Actions</h3>
          <div class="help-item"><kbd>Click</kbd> Select celestial body</div>
          <div class="help-item"><kbd>F</kbd> Toggle follow selected body</div>
          <div class="help-item"><kbd>R</kbd> Reset camera</div>
        </div>
        <div class="help-section">
          <h3>Simulation</h3>
          <div class="help-item"><kbd>Space</kbd> or <kbd>⏸/▶</kbd> Play/Pause</div>
          <div class="help-item"><kbd>Speed</kbd> Change simulation speed</div>
          <div class="help-item"><kbd>○</kbd> Toggle orbits</div>
          <div class="help-item"><kbd>★</kbd> Toggle stars</div>
        </div>
        <div class="help-close">Press <kbd>H</kbd> to close</div>
      </div>
    </div>

    <!-- Pointer Lock Hint (only in fly mode) -->
    <div v-if="isFlyMode && !isPointerLocked" class="pointer-hint">
      Click to enable free camera • Press <kbd>H</kbd> for controls
    </div>

    <!-- Mode Indicator -->
    <div class="mode-indicator">
      {{ isFlyMode ? 'FLY MODE' : 'ORBIT MODE' }}
    </div>

    <TresCanvas clear-color="#000000" window-size :shadows="true">
      <TresPerspectiveCamera ref="cameraRef" :position="[0, 150, 450]" :look-at="[0, 0, 0]" :far="10000" />

      <!-- OrbitControls (only active when not in fly mode) -->
      <OrbitControls v-if="!isFlyMode" ref="orbitControlsRef" :enable-damping="true" :damping-factor="0.05"
        :min-distance="0.5" :max-distance="1500" :target="orbitTarget" />
      <StarfieldSkybox 
        v-if="showStars" 
        texture="/textures/starmap.jpg" 
        :radius="2000"
        :rotation-y="Math.PI"
        :rotation-speed="0.00001"
      />

      <!-- Reduced ambient light to see shadows better -->
      <TresAmbientLight :intensity="0.05" />
      <!-- Sun Light with Shadows -->
      <TresPointLight ref="sunLightRef" :position="[0, 0, 0]" :intensity="1000" :distance="1000" :decay="1.2"
        cast-shadow />

      <!-- Fire Sun -->
      <FireSun ref="fireSunRef" :radius="5" :position="[0, 0, 0]" />

      <!-- Planets -->
      <Planet v-for="planet in planets" :key="planet.name" :name="planet.name" :size="planet.size"
        :distance="planet.distance" :color="planet.color" :speed="planet.speed" :texture="planet.texture"
        :moons="planet.moons" :has-rings="planet.hasRings" :axial-tilt="planet.axialTilt"
        :eccentricity="planet.eccentricity" :periapsis-argument="planet.periapsisArgument"
        :inclination="planet.inclination" :longitude-of-ascending-node="planet.longitudeOfAscendingNode" />

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

.fly-mode-button {
  background: rgba(100, 150, 255, 0.2);
}

.fly-mode-button.active {
  background: rgba(255, 150, 50, 0.3);
  border-color: rgba(255, 150, 50, 0.6);
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

/* Mode Indicator */
.mode-indicator {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.8);
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  font-size: 12px;
  font-weight: normal;
  letter-spacing: 1px;
}
</style>
