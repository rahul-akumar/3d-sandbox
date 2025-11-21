import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import * as THREE from 'three'

interface FirstPersonCameraOptions {
  camera: Ref<THREE.PerspectiveCamera | null>
  moveSpeed?: number
  lookSensitivity?: number
  initialPosition?: THREE.Vector3
  initialTarget?: THREE.Vector3
}

export function useFirstPersonCamera(options: FirstPersonCameraOptions & { enabled?: Ref<boolean> }) {
  const {
    camera,
    moveSpeed = 50,
    lookSensitivity = 0.002,
    initialPosition = new THREE.Vector3(0, 150, 450),
    initialTarget = new THREE.Vector3(0, 0, 0),
    enabled,
  } = options

  // Movement state
  const keys = ref({
    forward: false,
    backward: false,
    left: false,
    right: false,
  })

  // Mouse look state
  const isPointerLocked = ref(false)
  const euler = new THREE.Euler(0, 0, 0, 'YXZ')

  // Initialize camera rotation to look at target
  const initializeCameraRotation = () => {
    if (!camera.value) return
    const direction = new THREE.Vector3()
    direction.subVectors(initialTarget, initialPosition).normalize()
    
    const yaw = Math.atan2(direction.x, direction.z)
    const pitch = Math.asin(-direction.y)
    
    euler.set(pitch, yaw, 0)
    camera.value.quaternion.setFromEuler(euler)
  }

  // Reset camera to initial position
  const resetCamera = () => {
    if (!camera.value) return
    camera.value.position.copy(initialPosition)
    initializeCameraRotation()
  }

  // Keyboard event handlers
  const onKeyDown = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'KeyW':
        keys.value.forward = true
        break
      case 'KeyS':
        keys.value.backward = true
        break
      case 'KeyA':
        keys.value.left = true
        break
      case 'KeyD':
        keys.value.right = true
        break
    }
  }

  const onKeyUp = (event: KeyboardEvent) => {
    switch (event.code) {
      case 'KeyW':
        keys.value.forward = false
        break
      case 'KeyS':
        keys.value.backward = false
        break
      case 'KeyA':
        keys.value.left = false
        break
      case 'KeyD':
        keys.value.right = false
        break
    }
  }

  // Mouse look handlers
  const onMouseMove = (event: MouseEvent) => {
    if (!isPointerLocked.value || !camera.value || (enabled && !enabled.value)) return

    const movementX = event.movementX || 0
    const movementY = event.movementY || 0

    euler.setFromQuaternion(camera.value.quaternion)
    euler.y -= movementX * lookSensitivity
    euler.x -= movementY * lookSensitivity

    // Clamp pitch to prevent flipping
    euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x))

    camera.value.quaternion.setFromEuler(euler)
  }


  // Pointer lock handlers
  const requestPointerLock = () => {
    // Only request pointer lock if enabled
    if (enabled && !enabled.value) return
    
    const canvas = document.querySelector('canvas')
    if (canvas) {
      canvas.requestPointerLock()
    }
  }

  const onPointerLockChange = () => {
    isPointerLocked.value = document.pointerLockElement !== null
  }

  // Update camera position based on key states
  const updateCamera = (delta: number) => {
    if (!camera.value) return

    const velocity = moveSpeed * delta
    const forward = new THREE.Vector3(0, 0, -1)
    const right = new THREE.Vector3(1, 0, 0)

    // Apply camera rotation to get actual forward and right vectors
    forward.applyQuaternion(camera.value.quaternion)
    right.applyQuaternion(camera.value.quaternion)

    // Move in the direction the camera is facing (including vertical)
    if (keys.value.forward) camera.value.position.addScaledVector(forward, velocity)
    if (keys.value.backward) camera.value.position.addScaledVector(forward, -velocity)
    if (keys.value.left) camera.value.position.addScaledVector(right, -velocity)
    if (keys.value.right) camera.value.position.addScaledVector(right, velocity)
  }

  // Setup event listeners
  onMounted(() => {
    initializeCameraRotation()

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('pointerlockchange', onPointerLockChange)

    // Request pointer lock on canvas click
    const canvas = document.querySelector('canvas')
    if (canvas) {
      canvas.addEventListener('click', requestPointerLock)
    }
  })

  // Cleanup
  onUnmounted(() => {
    document.removeEventListener('keydown', onKeyDown)
    document.removeEventListener('keyup', onKeyUp)
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('pointerlockchange', onPointerLockChange)

    const canvas = document.querySelector('canvas')
    if (canvas) {
      canvas.removeEventListener('click', requestPointerLock)
    }
  })

  return {
    updateCamera,
    resetCamera,
    isPointerLocked,
  }
}
