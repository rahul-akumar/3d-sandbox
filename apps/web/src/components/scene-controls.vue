<script setup lang="ts">
import { computed } from 'vue'
import { useSceneControls } from '../composables/use-scene-controls'

const { state } = useSceneControls()

const objectPos = computed({
  get: () => state.object.position,
  set: (val: [number, number, number]) => {
    state.object.position = val
  },
})

const objectScale = computed({
  get: () => state.object.scale,
  set: (val: [number, number, number]) => {
    state.object.scale = val
  },
})

function updateVec3(
  current: [number, number, number],
  index: 0 | 1 | 2,
  value: number,
): [number, number, number] {
  const next: [number, number, number] = [...current] as any
  next[index] = value
  return next
}
</script>

<template>
  <aside v-if="state.interaction.selectedObject !== 'none'" class="controls">
    <h2 class="controls__title">Object Controls</h2>

    <!-- Object -->
    <section class="controls__section">
      <h3>Object</h3>

      <div class="field">
        <label>Position</label>
        <div class="field-row">
          <div class="field-col">
            <span>X</span>
            <input type="number" step="0.1" :value="objectPos[0]" @input="
              objectPos = updateVec3(
                objectPos,
                0,
                Number(($event.target as HTMLInputElement).value),
              )
              " />
          </div>
          <div class="field-col">
            <span>Y</span>
            <input type="number" step="0.1" :value="objectPos[1]" @input="
              objectPos = updateVec3(
                objectPos,
                1,
                Number(($event.target as HTMLInputElement).value),
              )
              " />
          </div>
          <div class="field-col">
            <span>Z</span>
            <input type="number" step="0.1" :value="objectPos[2]" @input="
              objectPos = updateVec3(
                objectPos,
                2,
                Number(($event.target as HTMLInputElement).value),
              )
              " />
          </div>
        </div>
      </div>

      <div class="field">
        <label>Scale</label>
        <div class="field-row">
          <div class="field-col">
            <span>X</span>
            <input type="range" min="0.1" max="5" step="0.1" :value="objectScale[0]" @input="
              objectScale = updateVec3(
                objectScale,
                0,
                Number(($event.target as HTMLInputElement).value),
              )
              " />
          </div>
          <div class="field-col">
            <span>Y</span>
            <input type="range" min="0.1" max="5" step="0.1" :value="objectScale[1]" @input="
              objectScale = updateVec3(
                objectScale,
                1,
                Number(($event.target as HTMLInputElement).value),
              )
              " />
          </div>
          <div class="field-col">
            <span>Z</span>
            <input type="range" min="0.1" max="5" step="0.1" :value="objectScale[2]" @input="
              objectScale = updateVec3(
                objectScale,
                2,
                Number(($event.target as HTMLInputElement).value),
              )
              " />
          </div>
        </div>
      </div>
    </section>

    <!-- Material -->
    <section class="controls__section">
      <h3>Material</h3>

      <div class="field">
        <label for="mat-color">Base color</label>
        <input id="mat-color" v-model="state.material.color" type="color" />
      </div>

      <div class="field">
        <label for="wire-color">Wireframe color</label>
        <input id="wire-color" v-model="state.material.wireframeColor" type="color" />
      </div>

      <div class="field">
        <label for="metalness">Metalness</label>
        <input id="metalness" v-model.number="state.material.metalness" type="range" min="0" max="1" step="0.01" />
        <span class="field-value">
          {{ state.material.metalness.toFixed(2) }}
        </span>
      </div>

      <div class="field">
        <label for="roughness">Roughness</label>
        <input id="roughness" v-model.number="state.material.roughness" type="range" min="0" max="1" step="0.01" />
        <span class="field-value">
          {{ state.material.roughness.toFixed(2) }}
        </span>
      </div>
    </section>

    <!-- Animation -->
    <section class="controls__section">
      <h3>Animation</h3>

      <div class="field field--inline">
        <label for="anim-enabled">Enabled</label>
        <label class="switch">
          <input id="anim-enabled" v-model="state.animation.enabled" type="checkbox" />
          <span class="slider" />
        </label>
      </div>

      <div class="field">
        <label for="rot-x">Rotation speed X</label>
        <input id="rot-x" v-model.number="state.animation.rotationSpeedX" type="range" min="-5" max="5" step="0.1" />
        <span class="field-value">
          {{ state.animation.rotationSpeedX.toFixed(2) }}
        </span>
      </div>

      <div class="field">
        <label for="rot-y">Rotation speed Y</label>
        <input id="rot-y" v-model.number="state.animation.rotationSpeedY" type="range" min="-5" max="5" step="0.1" />
        <span class="field-value">
          {{ state.animation.rotationSpeedY.toFixed(2) }}
        </span>
      </div>
    </section>
  </aside>
</template>

<style scoped>
.controls {
  position: fixed;
  top: 1rem;
  right: 1rem;
  max-width: 320px;
  max-height: calc(100vh - 2rem);
  padding: 1rem 1.25rem;
  border-radius: 0.75rem;
  background: rgba(15, 15, 20, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(16px);
  color: #f9fafb;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text',
    'Segoe UI', sans-serif;
  overflow-y: auto;
  box-shadow:
    0 10px 30px rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(0, 0, 0, 0.8);
}

.controls__title {
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 0.75rem;
  color: #9ca3af;
}

.controls__section {
  border-top: 1px solid rgba(148, 163, 184, 0.2);
  padding-top: 0.75rem;
  margin-top: 0.75rem;
}

.controls__section:first-of-type {
  border-top: none;
  padding-top: 0;
  margin-top: 0;
}

.controls__section h3 {
  font-size: 0.9rem;
  font-weight: 600;
  margin-bottom: 0.35rem;
}

.subsection h4 {
  font-size: 0.8rem;
  font-weight: 500;
  margin: 0.35rem 0;
  color: #9ca3af;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  margin-bottom: 0.5rem;
}

.field--inline {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.field label {
  font-size: 0.78rem;
  color: #e5e7eb;
}

.field input[type='range'] {
  width: 100%;
}

.field input[type='number'] {
  width: 100%;
  padding: 0.25rem 0.4rem;
  border-radius: 0.375rem;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: rgba(15, 23, 42, 0.9);
  color: #f9fafb;
  font-size: 0.78rem;
}

.field input[type='color'] {
  width: 100%;
  height: 1.75rem;
  padding: 0;
  border-radius: 0.375rem;
  border: 1px solid rgba(148, 163, 184, 0.4);
  background: transparent;
}

.field-row {
  display: flex;
  gap: 0.25rem;
}

.field-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.field-col span {
  font-size: 0.7rem;
  color: #9ca3af;
}

.field-value {
  font-size: 0.7rem;
  color: #9ca3af;
  align-self: flex-end;
}

/* Simple switch UI */
.switch {
  position: relative;
  display: inline-flex;
  width: 36px;
  height: 20px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: #4b5563;
  border-radius: 9999px;
  transition: background-color 0.2s ease;
}

.slider::before {
  position: absolute;
  content: '';
  height: 14px;
  width: 14px;
  left: 3px;
  top: 3px;
  border-radius: 9999px;
  background: white;
  transition: transform 0.2s ease;
}

.switch input:checked+.slider {
  background-color: #22c55e;
}

.switch input:checked+.slider::before {
  transform: translateX(16px);
}
</style>
