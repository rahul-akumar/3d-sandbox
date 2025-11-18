<script setup lang="ts">
import { TresCanvas } from '@tresjs/core'
import FirstExperience from './components/first-exp.vue'
import SceneControls from './components/scene-controls.vue'
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
