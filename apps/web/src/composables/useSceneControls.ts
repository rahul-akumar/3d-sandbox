import { reactive } from 'vue'

export type Vec3 = [number, number, number]

export interface SceneControlsState {
  camera: {
    position: Vec3
    fov: number
  }
  lights: {
    ambient: {
      intensity: number
      color: string
    }
    directional: {
      intensity: number
      color: string
      position: Vec3
    }
  }
  object: {
    position: Vec3
    scale: Vec3
  }
  material: {
    color: string
    wireframeColor: string
    metalness: number
    roughness: number
  }
  animation: {
    enabled: boolean
    rotationSpeedX: number
    rotationSpeedY: number
  }
}

const state = reactive<SceneControlsState>({
  camera: {
    position: [9, 9, 9],
    fov: 45,
  },
  lights: {
    ambient: {
      intensity: 0.4,
      color: '#ffffff',
    },
    directional: {
      intensity: 1,
      color: '#ffffff',
      position: [5, 10, 5],
    },
  },
  object: {
    position: [0, 2, 0],
    scale: [1, 1, 1],
  },
  material: {
    color: '#ff69b4', // hotpink
    wireframeColor: '#ffffff',
    metalness: 0.2,
    roughness: 0.4,
  },
  animation: {
    enabled: true,
    rotationSpeedX: 0.5,
    rotationSpeedY: 0.3,
  },
})

export function useSceneControls() {
  return { state }
}
