<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useLoop } from '@tresjs/core'
import * as THREE from 'three'

const props = withDefaults(defineProps<{
  radius?: number
  position?: [number, number, number]
}>(), {
  radius: 5,
  position: () => [0, 0, 0]
})

const sunRef = ref<THREE.Mesh | null>(null)
const sunMaterial = ref<THREE.ShaderMaterial | null>(null)

// Load sun texture if you want to blend it with the shader
const sunTexture = ref<THREE.Texture | null>(null)
const loader = new THREE.TextureLoader()
loader.load('/textures/sun.jpg', (texture) => {
  sunTexture.value = texture
  if (sunMaterial.value) {
    sunMaterial.value.uniforms.uTexture.value = texture
    sunMaterial.value.needsUpdate = true
  }
})

onMounted(() => {
  if (sunRef.value) {
    // Place sun on bloom layer 1
    sunRef.value.layers.set(1)
  }
})

const { onBeforeRender } = useLoop()

onBeforeRender(({ elapsed }) => {
  if (sunMaterial.value) {
    sunMaterial.value.uniforms.uTime.value = elapsed
  }
})

// Define the sun as a ref for GodRays if needed
defineExpose({ sunRef })

const vertexShader = `
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = `
  uniform float uTime;
  uniform sampler2D uTexture;
  uniform bool uHasTexture;
  
  varying vec2 vUv;
  
  // Noise function for fire effect
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
  
  void main() {
    // Create animated fire noise
    vec2 uv = vUv * 3.0;
    float noise1 = snoise(uv + uTime * 0.3);
    float noise2 = snoise(uv * 2.0 - uTime * 0.5);
    float noise3 = snoise(uv * 4.0 + uTime * 0.7);
    
    float combinedNoise = noise1 * 0.5 + noise2 * 0.3 + noise3 * 0.2;
    
    // Create fire colors - hot core to cooler edges
    vec3 color1 = vec3(1.0, 1.0, 0.8);    // White-yellow (hottest)
    vec3 color2 = vec3(1.0, 0.7, 0.1);    // Orange
    vec3 color3 = vec3(1.0, 0.3, 0.0);    // Red-orange
    vec3 color4 = vec3(0.8, 0.1, 0.0);    // Deep red
    
    // Mix colors based on noise
    float noiseValue = combinedNoise * 0.5 + 0.5;
    vec3 fireColor;
    
    if (noiseValue < 0.33) {
      fireColor = mix(color4, color3, noiseValue * 3.0);
    } else if (noiseValue < 0.66) {
      fireColor = mix(color3, color2, (noiseValue - 0.33) * 3.0);
    } else {
      fireColor = mix(color2, color1, (noiseValue - 0.66) * 3.0);
    }
    
    // Add pulsing effect
    float pulse = 0.9 + 0.1 * sin(uTime * 2.0);
    fireColor *= pulse;
    
    // Blend with texture if available
    if (uHasTexture) {
      vec3 texColor = texture2D(uTexture, vUv).rgb;
      fireColor = mix(fireColor, fireColor * texColor, 0.3);
    }
    
    // Add bright emissive glow
    fireColor *= 1.5;
    
    gl_FragColor = vec4(fireColor, 1.0);
  }
`
</script>

<template>
  <TresMesh ref="sunRef" :position="position">
    <TresSphereGeometry :args="[radius, 64, 64]" />
    <TresShaderMaterial
      ref="sunMaterial"
      :vertex-shader="vertexShader"
      :fragment-shader="fragmentShader"
      :uniforms="{
        uTime: { value: 0 },
        uTexture: { value: sunTexture },
        uHasTexture: { value: !!sunTexture }
      }"
    />
  </TresMesh>
</template>
