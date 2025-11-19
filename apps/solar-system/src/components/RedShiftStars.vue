<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useLoop } from '@tresjs/core'
import * as THREE from 'three'

const props = withDefaults(defineProps<{
  count?: number
  radius?: number
  depth?: number
  size?: number
}>(), {
  count: 15000,
  radius: 500,
  depth: 400,
  size: 1.5
})

const starsRef = ref<THREE.Points | null>(null)
const starsMaterial = ref<THREE.ShaderMaterial | null>(null)

onMounted(() => {
  if (starsRef.value) {
    // Place stars on bloom layer
    starsRef.value.layers.set(2)
  }
})

const { onBeforeRender } = useLoop()

onBeforeRender(({ elapsed }) => {
  if (starsMaterial.value) {
    starsMaterial.value.uniforms.uTime.value = elapsed
  }
})

// Generate star positions
const generateStarPositions = () => {
  const positions = new Float32Array(props.count * 3)
  const sizes = new Float32Array(props.count)
  
  for (let i = 0; i < props.count; i++) {
    // Random spherical distribution that extends very far
    const radius = props.radius + Math.random() * props.depth
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    
    const x = radius * Math.sin(phi) * Math.cos(theta)
    const y = radius * Math.sin(phi) * Math.sin(theta)
    const z = radius * Math.cos(phi)
    
    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z
    
    // Vary star sizes
    sizes[i] = Math.random() * props.size + 0.5
  }
  
  return { positions, sizes }
}

const { positions, sizes } = generateStarPositions()

// Shader for red shift effect
const vertexShader = `
  attribute float size;
  varying float vDistance;
  
  void main() {
    vDistance = length(position);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`

const fragmentShader = `
  uniform float uTime;
  uniform float uMaxDistance;
  varying float vDistance;
  
  void main() {
    // Circular point shape
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    if (dist > 0.5) discard;
    
    // Smooth edges
    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
    
    // Red shift based on distance - dramatic effect
    float normalizedDistance = vDistance / uMaxDistance;
    
    // Base white color shifted towards red with distance
    vec3 blueShift = vec3(0.8, 0.9, 1.0);  // Closer stars (blue-white)
    vec3 whiteColor = vec3(1.0, 1.0, 1.0);  // Mid-range (white)
    vec3 redShift = vec3(1.0, 0.3, 0.2);    // Far stars (red)
    
    vec3 color;
    if (normalizedDistance < 0.5) {
      color = mix(blueShift, whiteColor, normalizedDistance * 2.0);
    } else {
      color = mix(whiteColor, redShift, (normalizedDistance - 0.5) * 2.0);
    }
    
    // Add slight twinkle
    float twinkle = 0.8 + 0.2 * sin(uTime * 2.0 + vDistance * 0.01);
    color *= twinkle;
    
    gl_FragColor = vec4(color, alpha);
  }
`
</script>

<template>
  <TresPoints ref="starsRef">
    <TresBufferGeometry>
      <TresBufferAttribute :args="[positions, 3]" attach="attributes-position" />
      <TresBufferAttribute :args="[sizes, 1]" attach="attributes-size" />
    </TresBufferGeometry>
    <TresShaderMaterial
      ref="starsMaterial"
      :vertex-shader="vertexShader"
      :fragment-shader="fragmentShader"
      :uniforms="{
        uTime: { value: 0 },
        uMaxDistance: { value: radius + depth }
      }"
      :transparent="true"
      :depth-write="false"
      :blending="THREE.AdditiveBlending"
    />
  </TresPoints>
</template>
