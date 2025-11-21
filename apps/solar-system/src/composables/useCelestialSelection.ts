import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import * as THREE from 'three'

interface CelestialSelectionOptions {
  camera: Ref<THREE.PerspectiveCamera | null>
  scene?: THREE.Scene
  getScene?: () => THREE.Scene | null
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
  toggleFollow: () => void
  updateFollow: (delta: number) => void
  clearSelection: () => void
  isFollowing: Ref<boolean>
} {
  const { camera, scene, getScene, focusSpeed = 2 } = options

  const selectedBody = ref<SelectedBody | null>(null)
  const raycaster = new THREE.Raycaster()
  const mousePosition = new THREE.Vector2()
  const isFollowing = ref(false)
  const followDistance = ref(20)

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

  // Toggle follow mode for selected body
  const toggleFollow = () => {
    if (!selectedBody.value) return
    
    isFollowing.value = !isFollowing.value
    
    // Set appropriate follow distance based on body type
    if (selectedBody.value.type === 'sun') {
      followDistance.value = 50
    } else if (selectedBody.value.type === 'planet') {
      followDistance.value = 15
    } else if (selectedBody.value.type === 'moon') {
      followDistance.value = 5
    }
  }

  // Update camera position to follow selected body
  const updateFollow = (delta: number) => {
    if (!isFollowing.value || !selectedBody.value || !camera.value) return

    const bodyPosition = selectedBody.value.object.getWorldPosition(new THREE.Vector3())
    const direction = new THREE.Vector3()
    direction.subVectors(camera.value.position, bodyPosition).normalize()
    
    // Calculate target position behind the body at follow distance
    const targetPosition = bodyPosition.clone().add(direction.multiplyScalar(followDistance.value))
    
    // Smoothly move camera to follow position
    camera.value.position.lerp(targetPosition, focusSpeed * delta)
    
    // Always look at the body
    camera.value.lookAt(bodyPosition)
  }

  // Clear selection
  const clearSelection = () => {
    selectedBody.value = null
    isFollowing.value = false
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
    toggleFollow,
    updateFollow,
    clearSelection,
    isFollowing,
  }
}
