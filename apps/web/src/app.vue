<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { TresCanvas } from '@tresjs/core'
import FirstExperience from './components/first-exp.vue'
import SceneControls from './components/scene-controls.vue'
import { useSceneControls } from './composables/use-scene-controls'

const { state } = useSceneControls()

const movementKeys = new Set(['w', 'a', 's', 'd'])

function isTypingTarget(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null
  if (!target) return false

  const tag = target.tagName
  const editable = target.isContentEditable || target.getAttribute('contenteditable') === 'true'

  return tag === 'INPUT' || tag === 'TEXTAREA' || editable
}

function handleKeyDown(event: KeyboardEvent) {
  const key = event.key.toLowerCase()

  if (!movementKeys.has(key)) return
  if (isTypingTarget(event)) return

  // Disable WASD when the donut object is selected
  if (state.interaction.selectedObject === 'donut') return

  event.preventDefault()

  switch (key) {
    case 'w':
      state.input.moveForward = true
      break
    case 's':
      state.input.moveBackward = true
      break
    case 'a':
      state.input.moveLeft = true
      break
    case 'd':
      state.input.moveRight = true
      break
  }
}

function handleKeyUp(event: KeyboardEvent) {
  const key = event.key.toLowerCase()

  if (!movementKeys.has(key)) return

  event.preventDefault()

  switch (key) {
    case 'w':
      state.input.moveForward = false
      break
    case 's':
      state.input.moveBackward = false
      break
    case 'a':
      state.input.moveLeft = false
      break
    case 'd':
      state.input.moveRight = false
      break
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})
</script>

<template>
  <div class="app-root">
    <TresCanvas clear-color="#1d1e1f" window-size shadows>
      <FirstExperience />
    </TresCanvas>

    <SceneControls />
  </div>
</template>

<style scoped>
.app-root {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
}
</style>
