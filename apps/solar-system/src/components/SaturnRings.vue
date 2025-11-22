<script setup lang="ts">
import { ref, onMounted, inject, type Ref } from 'vue'
import { useLoop } from '@tresjs/core'
import * as THREE from 'three'

const props = defineProps<{
  planetSize: number
  planetPosition: THREE.Vector3
  planetAxialTilt: number // in radians
}>()

const isPaused = inject<Ref<boolean>>('isPaused', ref(false))
const simulationSpeed = inject<Ref<number>>('simulationSpeed', ref(1))

// Ring group ref
const ringGroupRef = ref<THREE.Group>()

// Ring band definitions based on Saturn radii (planet size is 4.0)
// Distances are in relation to planet size
const RING_BANDS = [
  {
    name: 'C Ring',
    innerRadius: 1.2,
    outerRadius: 1.5,
    particleCount: 4000,
    opacity: 0.3,
    density: 0.4,
    colors: ['#b8b8b8', '#c8c8c8', '#d0d0d0'],
    particleSizeRange: [0.008, 0.02]
  },
  {
    name: 'B Ring',
    innerRadius: 1.5,
    outerRadius: 1.9,
    particleCount: 12000,
    opacity: 0.95,
    density: 0.95,
    colors: ['#dcdcdc', '#e8e8e8', '#f0f0e8', '#f5f5ed'],
    particleSizeRange: [0.012, 0.035]
  },
  {
    name: 'Cassini Division',
    innerRadius: 1.9,
    outerRadius: 1.975,
    particleCount: 800,
    opacity: 0.15,
    density: 0.2,
    colors: ['#888888', '#909090'],
    particleSizeRange: [0.005, 0.012]
  },
  {
    name: 'A Ring',
    innerRadius: 1.975,
    outerRadius: 2.2,
    particleCount: 10000,
    opacity: 0.85,
    density: 0.8,
    colors: ['#d8d8d8', '#e0e0e0', '#ebe8e0', '#f0ede5'],
    particleSizeRange: [0.01, 0.03]
  },
  {
    name: 'F Ring',
    innerRadius: 2.25,
    outerRadius: 2.28,
    particleCount: 2000,
    opacity: 0.5,
    density: 0.4,
    colors: ['#c0c0c0', '#c8c8c8'],
    particleSizeRange: [0.006, 0.015]
  }
]

// Create particle instances for each ring band
const createRingBand = (band: typeof RING_BANDS[0]) => {
  const geometry = new THREE.SphereGeometry(1, 8, 8)
  const material = new THREE.MeshStandardMaterial({
    roughness: 0.9,
    metalness: 0.1,
    transparent: true,
    opacity: band.opacity,
  })

  const instancedMesh = new THREE.InstancedMesh(
    geometry,
    material,
    band.particleCount
  )

  instancedMesh.castShadow = true
  instancedMesh.receiveShadow = true

  const dummy = new THREE.Object3D()
  const color = new THREE.Color()

  // Distribute particles in ring
  for (let i = 0; i < band.particleCount; i++) {
    // Random radius within ring band (with density weighting)
    const t = Math.random()
    const densityBias = Math.pow(t, 1 / band.density) // Higher density = more particles toward inner edge
    const radius = band.innerRadius + densityBias * (band.outerRadius - band.innerRadius)
    const angle = Math.random() * Math.PI * 2
    
    // Position in ring plane
    dummy.position.x = Math.cos(angle) * radius * props.planetSize
    dummy.position.y = (Math.random() - 0.5) * 0.02 * props.planetSize // Slight vertical variation
    dummy.position.z = Math.sin(angle) * radius * props.planetSize

    // Random rotation
    dummy.rotation.set(
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2,
      Math.random() * Math.PI * 2
    )

    // Random size
    const size = band.particleSizeRange[0] + Math.random() * (band.particleSizeRange[1] - band.particleSizeRange[0])
    dummy.scale.set(size, size, size)

    dummy.updateMatrix()
    instancedMesh.setMatrixAt(i, dummy.matrix)

    // Random color from band's color palette
    const randomColor = band.colors[Math.floor(Math.random() * band.colors.length)]
    color.set(randomColor)
    instancedMesh.setColorAt(i, color)
  }

  if (instancedMesh.instanceColor) {
    instancedMesh.instanceColor.needsUpdate = true
  }
  instancedMesh.instanceMatrix.needsUpdate = true

  return instancedMesh
}

// Create all ring bands
const ringMeshes = ref<THREE.InstancedMesh[]>([])

onMounted(() => {
  if (ringGroupRef.value) {
    // Create all ring bands
    RING_BANDS.forEach(band => {
      const ringMesh = createRingBand(band)
      ringGroupRef.value?.add(ringMesh)
      ringMeshes.value.push(ringMesh)
    })

    // Apply planet's axial tilt to rings
    ringGroupRef.value.rotation.x = props.planetAxialTilt
  }
})

// Ring rotation
const ringRotationSpeed = 0.15 // Rings rotate, inner faster than outer (simplified average)

const { onBeforeRender } = useLoop()

onBeforeRender(({ delta }) => {
  if (ringGroupRef.value && !isPaused.value) {
    // Update ring group position to follow planet
    ringGroupRef.value.position.copy(props.planetPosition)
    
    // Rotate rings around Saturn
    ringGroupRef.value.rotation.y += ringRotationSpeed * delta * simulationSpeed.value
  }
})
</script>

<template>
  <TresGroup ref="ringGroupRef" />
</template>
