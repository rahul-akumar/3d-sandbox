import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import * as THREE from 'three'

interface CelestialSelectionOptions {
  camera: Ref<THREE.PerspectiveCamera | null>
  scene?: THREE.Scene
  getScene?: () => THREE.Scene | null
  focusDistance?: number
  focusSpeed?: number
}

interface SelectedBody {
  name: string
  type: 'sun' | 'planet' | 'moon'
  position: THREE.Vector3
  object: THREE.Mesh
}

export function useCelestialSelection(options: CelestialSelectionOptions): {
  selectedBody: Ref<SelectedBody | null>
  focusOnSelected: () => void
  updateFocus: (delta: number) => void
  clearSelection: () => void
  isFocusing: Ref<boolean>
} {
  const { camera, scene, getScene, focusDistance = 20, focusSpeed = 2 } = options

  const selectedBody = ref<SelectedBody | null>(null)
  const raycaster = new THREE.Raycaster()
  const mousePosition = new THREE.Vector2()
  const isFocusing = ref(false)
  const focusTargetPosition = ref<THREE.Vector3 | null>(null)

  // Update mouse position
  const onMouseMove = (event: MouseEvent) => {
    const canvas = event.target as HTMLCanvasElement
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    mousePosition.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mousePosition.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  // Handle click to select celestial bodies
  const onClick = (_event: MouseEvent) => {
    if (!camera.value || document.pointerLockElement) return

    const currentScene = scene || (getScene ? getScene() : null)
    if (!currentScene) return

    raycaster.setFromCamera(mousePosition, camera.value)
    const intersects = raycaster.intersectObjects(currentScene.children, true)

    if (intersects.length > 0) {
      // Find first object with userData
      for (const intersect of intersects) {
        const object = intersect.object as THREE.Mesh
        if (object.userData.type && object.userData.name) {
          selectedBody.value = {
            name: object.userData.name,
            type: object.userData.type,
            position: object.position.clone(),
            object: object,
          }
          return
        }
      }
    }

    // Deselect if clicking empty space
    selectedBody.value = null
  }

  // Focus camera on selected body
  const focusOnSelected = () => {
    if (!selectedBody.value || !camera.value) return

    // Calculate target position (offset from the body)
    const bodyPosition = selectedBody.value.object.getWorldPosition(new THREE.Vector3())
    const direction = new THREE.Vector3()
    direction.subVectors(camera.value.position, bodyPosition).normalize()

    // Different focus distances for different body types
    let distance = focusDistance
    if (selectedBody.value.type === 'sun') {
      distance = 50
    } else if (selectedBody.value.type === 'planet') {
      distance = 15
    } else if (selectedBody.value.type === 'moon') {
      distance = 5
    }

    focusTargetPosition.value = bodyPosition.clone().add(direction.multiplyScalar(distance))
    isFocusing.value = true
  }

  // Update camera position during focus animation
  const updateFocus = (delta: number) => {
    if (!isFocusing.value || !focusTargetPosition.value || !camera.value) return

    const currentPosition = camera.value.position
    const distance = currentPosition.distanceTo(focusTargetPosition.value)

    if (distance < 1) {
      // Close enough, stop focusing
      isFocusing.value = false
      focusTargetPosition.value = null
      return
    }

    // Lerp toward target
    camera.value.position.lerp(focusTargetPosition.value, focusSpeed * delta)

    // Look at the selected body
    if (selectedBody.value) {
      const bodyPosition = selectedBody.value.object.getWorldPosition(new THREE.Vector3())
      camera.value.lookAt(bodyPosition)
    }
  }

  // Clear selection
  const clearSelection = () => {
    selectedBody.value = null
    isFocusing.value = false
    focusTargetPosition.value = null
  }

  // Setup event listeners
  onMounted(() => {
    const canvas = document.querySelector('canvas')
    if (canvas) {
      canvas.addEventListener('mousemove', onMouseMove)
      canvas.addEventListener('click', onClick)
    }
  })

  // Cleanup
  onUnmounted(() => {
    const canvas = document.querySelector('canvas')
    if (canvas) {
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('click', onClick)
    }
  })

  return {
    selectedBody,
    focusOnSelected,
    updateFocus,
    clearSelection,
    isFocusing,
  }
}
