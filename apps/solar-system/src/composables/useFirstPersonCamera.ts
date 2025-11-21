import { ref, onMounted, onUnmounted, type Ref } from 'vue'
import * as THREE from 'three'

interface FirstPersonCameraOptions {
  camera: Ref<THREE.PerspectiveCamera | null>
  moveSpeed?: number
  lookSensitivity?: number
  initialPosition?: THREE.Vector3
  initialTarget?: THREE.Vector3
  zoomSpeed?: number
  scene?: THREE.Scene
}

export function useFirstPersonCamera(options: FirstPersonCameraOptions) {
  const {
    camera,
    moveSpeed = 50,
    lookSensitivity = 0.002,
    initialPosition = new THREE.Vector3(0, 150, 450),
    initialTarget = new THREE.Vector3(0, 0, 0),
    zoomSpeed = 50,
    scene,
  } = options

  // Movement state
  const keys = ref({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
  })

  // Mouse look state
  const isPointerLocked = ref(false)
  const euler = new THREE.Euler(0, 0, 0, 'YXZ')
  const raycaster = new THREE.Raycaster()
  const mousePosition = new THREE.Vector2()

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
      case 'Space':
        keys.value.up = true
        event.preventDefault()
        break
      case 'ShiftLeft':
      case 'ShiftRight':
        keys.value.down = true
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
      case 'Space':
        keys.value.up = false
        break
      case 'ShiftLeft':
      case 'ShiftRight':
        keys.value.down = false
        break
    }
  }

  // Mouse look handlers
  const onMouseMove = (event: MouseEvent) => {
    if (!isPointerLocked.value || !camera.value) return

    const movementX = event.movementX || 0
    const movementY = event.movementY || 0

    euler.setFromQuaternion(camera.value.quaternion)
    euler.y -= movementX * lookSensitivity
    euler.x -= movementY * lookSensitivity

    // Clamp pitch to prevent flipping
    euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, euler.x))

    camera.value.quaternion.setFromEuler(euler)
  }

  // Track mouse position for zoom-to-cursor
  const onMouseMovePosition = (event: MouseEvent) => {
    const canvas = event.target as HTMLCanvasElement
    const rect = canvas.getBoundingClientRect()
    mousePosition.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    mousePosition.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  }

  // Zoom to cursor with raycasting
  const onWheel = (event: WheelEvent) => {
    if (!camera.value) return
    event.preventDefault()

    const zoomDirection = event.deltaY > 0 ? 1 : -1
    const zoomAmount = zoomDirection * zoomSpeed

    // If scene is provided, try to raycast
    if (scene) {
      raycaster.setFromCamera(mousePosition, camera.value)
      const intersects = raycaster.ray.intersectPlane(
        new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
        new THREE.Vector3()
      )

      if (intersects) {
        // Zoom toward the intersection point
        const direction = new THREE.Vector3()
        direction.subVectors(intersects, camera.value.position).normalize()
        camera.value.position.addScaledVector(direction, -zoomAmount)
      } else {
        // Fallback: zoom along camera forward direction
        const forward = new THREE.Vector3(0, 0, -1)
        forward.applyQuaternion(camera.value.quaternion)
        camera.value.position.addScaledVector(forward, -zoomAmount)
      }
    } else {
      // Fallback: zoom along camera forward direction
      const forward = new THREE.Vector3(0, 0, -1)
      forward.applyQuaternion(camera.value.quaternion)
      camera.value.position.addScaledVector(forward, -zoomAmount)
    }
  }

  // Pointer lock handlers
  const requestPointerLock = () => {
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

    forward.applyQuaternion(camera.value.quaternion)
    right.applyQuaternion(camera.value.quaternion)

    // Flatten forward/right for WASD (ignore vertical component)
    forward.y = 0
    forward.normalize()
    right.y = 0
    right.normalize()

    if (keys.value.forward) camera.value.position.addScaledVector(forward, velocity)
    if (keys.value.backward) camera.value.position.addScaledVector(forward, -velocity)
    if (keys.value.left) camera.value.position.addScaledVector(right, -velocity)
    if (keys.value.right) camera.value.position.addScaledVector(right, velocity)
    if (keys.value.up) camera.value.position.y += velocity
    if (keys.value.down) camera.value.position.y -= velocity
  }

  // Setup event listeners
  onMounted(() => {
    initializeCameraRotation()

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup', onKeyUp)
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mousemove', onMouseMovePosition)
    document.addEventListener('wheel', onWheel, { passive: false })
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
    document.removeEventListener('mousemove', onMouseMovePosition)
    document.removeEventListener('wheel', onWheel)
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
