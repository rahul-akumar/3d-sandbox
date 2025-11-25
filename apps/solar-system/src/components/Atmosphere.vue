<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import * as THREE from 'three'

const props = withDefaults(defineProps<{
  planetRadius: number
  atmosphereScale?: number // How much larger than planet (1.1 = 10% larger)
  color?: string // Primary atmosphere color
  glowColor?: string // Outer glow color
  intensity?: number // Overall intensity
  power?: number // Fresnel power (higher = sharper edge)
  opacity?: number // Base opacity
}>(), {
  atmosphereScale: 1.15,
  color: '#6B93D6',
  glowColor: '#4A90D9',
  intensity: 1.0,
  power: 4.0,
  opacity: 0.8
})

const atmosphereRef = ref<THREE.Mesh | null>(null)

// Convert hex color to vec3 for shader
function hexToVec3(hex: string): [number, number, number] {
  const color = new THREE.Color(hex)
  return [color.r, color.g, color.b]
}

const atmosphereColor = computed(() => hexToVec3(props.color))
const glowColorVec = computed(() => hexToVec3(props.glowColor))

onMounted(() => {
  if (atmosphereRef.value) {
    // Atmosphere should be transparent and not cast shadows
    atmosphereRef.value.renderOrder = 1
  }
})

// Vertex shader - passes view direction and normal to fragment shader
const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vPositionW;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vPositionW = worldPosition.xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Fragment shader - Fresnel-based atmospheric scattering
const fragmentShader = `
  uniform vec3 uAtmosphereColor;
  uniform vec3 uGlowColor;
  uniform float uIntensity;
  uniform float uPower;
  uniform float uOpacity;
  uniform vec3 uSunPosition;
  
  varying vec3 vNormal;
  varying vec3 vPositionW;
  
  void main() {
    // Get view direction
    vec3 viewDirection = normalize(cameraPosition - vPositionW);
    
    // Fresnel effect - stronger at edges (grazing angles)
    float fresnel = 1.0 - max(dot(viewDirection, vNormal), 0.0);
    fresnel = pow(fresnel, uPower);
    
    // Sun direction for day/night variation
    vec3 sunDir = normalize(uSunPosition - vPositionW);
    float sunFacing = max(dot(vNormal, sunDir), 0.0);
    
    // Mix colors - inner color near planet, glow color at outer edge
    vec3 color = mix(uAtmosphereColor, uGlowColor, fresnel);
    
    // Enhance on sun-facing side, dim on night side
    float dayNightFactor = 0.3 + 0.7 * sunFacing;
    
    // Add subtle Rayleigh-like scattering (blue shift at edges)
    float scatter = pow(fresnel, 2.0);
    color = mix(color, uGlowColor * 1.2, scatter * 0.3);
    
    // Final color with intensity and day/night
    color *= uIntensity * dayNightFactor;
    
    // Alpha based on fresnel - transparent at center, opaque at edge
    float alpha = fresnel * uOpacity;
    
    gl_FragColor = vec4(color, alpha);
  }
`
</script>

<template>
  <TresMesh ref="atmosphereRef">
    <TresSphereGeometry :args="[planetRadius * atmosphereScale, 64, 64]" />
    <TresShaderMaterial
      :vertex-shader="vertexShader"
      :fragment-shader="fragmentShader"
      :uniforms="{
        uAtmosphereColor: { value: atmosphereColor },
        uGlowColor: { value: glowColorVec },
        uIntensity: { value: intensity },
        uPower: { value: power },
        uOpacity: { value: opacity },
        uSunPosition: { value: [0, 0, 0] }
      }"
      :transparent="true"
      :side="1"
      :depth-write="false"
      :blending="2"
    />
  </TresMesh>
</template>
