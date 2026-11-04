import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'

import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  Edges,
  Environment,
  Lightformer,
  Line,
  OrbitControls,
  RoundedBox,
} from '@react-three/drei'
import * as THREE from 'three'
import { readNumberProp, type ResolvedScene } from '../../lib/resolveScene'
import type { CameraPreset } from '../../lib/schema'
import type { Theme } from '../../lib/theme'
import { LabelProjector, type LabelRegistry } from './SceneLabels'

const ReducedMotion = createContext(false)

interface ScenePalette {
  fog: string
  floor: string
  platform: string
  gridMajor: string
  gridMinor: string
  pillar: string
  wall: string
  frame: string
  solid: string
  solidSoft: string
  paper: string
}

const SCENE_PALETTES: Record<Theme, ScenePalette> = {
  light: {
    fog: '#dce5e2',
    floor: '#c3cec9',
    platform: '#b5c3be',
    gridMajor: '#8fa7a2',
    gridMinor: '#acbdb8',
    pillar: '#a9b8b3',
    wall: '#d8e1dd',
    frame: '#9bada8',
    solid: '#26363c',
    solidSoft: '#405158',
    paper: '#f4f0e6',
  },
  dark: {
    fog: '#101a20',
    floor: '#141f26',
    platform: '#19272e',
    gridMajor: '#30474f',
    gridMinor: '#20333b',
    pillar: '#202e35',
    wall: '#121e25',
    frame: '#2b3c44',
    solid: '#142129',
    solidSoft: '#293a42',
    paper: '#e9e5da',
  },
}

interface BlackBoxCanvasProps {
  scene: ResolvedScene
  preset: CameraPreset
  labelRegistry: LabelRegistry
  theme: Theme
}

export function BlackBoxCanvas({
  scene,
  preset,
  labelRegistry,
  theme,
}: BlackBoxCanvasProps) {
  const [reducedMotion, setReducedMotion] = useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{
        position: [...preset.position],
        fov: window.innerWidth < 600 ? 55 : 38,
        near: 0.1,
        far: 120,
      }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = theme === 'light' ? 1.12 : 1.16
      }}
      style={{ background: 'transparent' }}
    >
      <ReducedMotion.Provider value={reducedMotion}>
        <SceneContents
          scene={scene}
          preset={preset}
          labelRegistry={labelRegistry}
          theme={theme}
        />
      </ReducedMotion.Provider>
    </Canvas>
  )
}

function SceneContents({ scene, preset, labelRegistry, theme }: BlackBoxCanvasProps) {
  const palette = SCENE_PALETTES[theme]
  const monolithOpacity = readNumberProp(scene, 'monolith', 'opacity', 1)
  const open = monolithOpacity < 0.5
  const seamIntensity = readNumberProp(scene, 'monolith', 'seamIntensity', 0.28)
  const capLight = readNumberProp(scene, 'monolith', 'capLight', 0)
  const coreScale = readNumberProp(scene, 'core', 'scale', 0)
  const coreSpin = readNumberProp(scene, 'core', 'spin', 0.2)
  const verifierScale = readNumberProp(scene, 'verifier', 'scale', 0)
  const reasonScale = readNumberProp(scene, 'reasonRing', 'scale', 0)
  const reasonSpin = readNumberProp(scene, 'reasonRing', 'spin', 0.08)
  const channelOpacity = readNumberProp(scene, 'channel', 'opacity', 0.38)

  return (
    <>
      <fogExp2 attach="fog" args={[palette.fog, theme === 'light' ? 0.034 : 0.046]} />
      <ambientLight intensity={theme === 'light' ? 0.72 : 0.48} />
      <hemisphereLight
        args={[theme === 'light' ? '#f4fbf7' : '#b7d8e4', palette.floor, theme === 'light' ? 0.5 : 0.36]}
      />
      <directionalLight
        position={[5, 9, 5]}
        intensity={theme === 'light' ? 1.9 : 1.7}
        color={theme === 'light' ? '#fff8e9' : '#d7e9ff'}
      />
      <directionalLight
        position={[-7, 4, -3]}
        intensity={theme === 'light' ? 0.8 : 0.62}
        color={theme === 'light' ? '#a8d4d2' : '#6f96ae'}
      />
      <pointLight
        position={[0, 2.6, 0.8]}
        intensity={open ? 8 : 3}
        color="#63d6e2"
        distance={9}
        decay={2}
      />
      <pointLight
        position={[-3.2, 1.2, 1.2]}
        intensity={verifierScale > 0.5 ? 5.5 : 0}
        color="#dca94e"
        distance={6}
        decay={2}
      />

      <Environment resolution={96} frames={1}>
        <Lightformer
          intensity={1.7}
          color="#a9d8f0"
          position={[0, 6, 2]}
          scale={[9, 4, 1]}
        />
        <Lightformer
          intensity={0.85}
          color="#dca94e"
          position={[-5, 2, 2]}
          scale={[3, 3, 1]}
        />
        <Lightformer
          intensity={0.55}
          color="#4e6f94"
          position={[5, 3, -3]}
          scale={[4, 4, 1]}
        />
      </Environment>

      <Room palette={palette} />
      <FloorGlow theme={theme} />
      <Monolith
        open={open}
        seamIntensity={seamIntensity}
        capLight={capLight}
        palette={palette}
      />
      <Core visible={coreScale > 0.5} spin={coreSpin} />
      <ReasonRing visible={reasonScale > 0.5} spin={reasonSpin} />
      <Observer palette={palette} />
      <Verifier visible={verifierScale > 0.5} />
      <Channel opacity={channelOpacity} />
      <Dust />
      <LabelProjector annotations={scene.annotations} registry={labelRegistry} />
      <CameraRig preset={preset} />
      <OrbitControls
        makeDefault
        enablePan={false}
        enableDamping
        dampingFactor={0.065}
        minDistance={3.1}
        maxDistance={13.5}
        minPolarAngle={0.35}
        maxPolarAngle={1.46}
        rotateSpeed={0.62}
        zoomSpeed={0.75}
      />
    </>
  )
}

/* ---------- room ---------- */

function Room({ palette }: { palette: ScenePalette }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial color={palette.floor} roughness={0.86} metalness={0.18} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <circleGeometry args={[6.2, 96]} />
        <meshStandardMaterial color={palette.platform} roughness={0.66} metalness={0.3} />
      </mesh>

      <gridHelper
        args={[34, 68, palette.gridMajor, palette.gridMinor]}
        position={[0, 0.026, 0]}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.032, 0]}>
        <ringGeometry args={[3.62, 3.65, 128]} />
        <meshBasicMaterial
          color="#63d6e2"
          transparent
          opacity={0.17}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.032, 0]}>
        <ringGeometry args={[4.92, 4.945, 128]} />
        <meshBasicMaterial
          color="#e9e5da"
          transparent
          opacity={0.07}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {Array.from({ length: 12 }).map((_, index) => {
        const angle = (index / 12) * Math.PI * 2
        const radius = 8.4
        return (
          <mesh
            key={index}
            position={[Math.cos(angle) * radius, 3.6, Math.sin(angle) * radius]}
          >
            <boxGeometry args={[0.16, 7.2, 0.16]} />
            <meshStandardMaterial
              color={palette.pillar}
              roughness={0.82}
              metalness={0.24}
            />
          </mesh>
        )
      })}

      <mesh position={[0, 4, -9.2]}>
        <planeGeometry args={[30, 18]} />
        <meshStandardMaterial color={palette.wall} roughness={0.96} metalness={0.05} />
      </mesh>

      <group position={[0, 0, -3.9]}>
        <mesh position={[-2.72, 2.78, 0]}>
          <boxGeometry args={[0.07, 5.56, 0.07]} />
          <meshStandardMaterial color={palette.frame} roughness={0.55} metalness={0.55} />
        </mesh>
        <mesh position={[2.72, 2.78, 0]}>
          <boxGeometry args={[0.07, 5.56, 0.07]} />
          <meshStandardMaterial color={palette.frame} roughness={0.55} metalness={0.55} />
        </mesh>
        <mesh position={[0, 5.56, 0]}>
          <boxGeometry args={[5.5, 0.07, 0.07]} />
          <meshStandardMaterial color={palette.frame} roughness={0.55} metalness={0.55} />
        </mesh>
        <Line
          points={[
            [-2.72, 0.02, 0],
            [-2.72, 5.56, 0],
            [2.72, 5.56, 0],
            [2.72, 0.02, 0],
          ]}
          color="#63d6e2"
          lineWidth={0.55}
          transparent
          opacity={0.13}
        />
      </group>

      <mesh position={[0, 2.7, -4.62]}>
        <planeGeometry args={[0.03, 4.7]} />
        <meshBasicMaterial
          color="#63d6e2"
          transparent
          opacity={0.08}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

function useGlowTexture(rgb: string) {
  const texture = useMemo(() => {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const context = canvas.getContext('2d')
    if (!context) return null
    const gradient = context.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    )
    gradient.addColorStop(0, `rgba(${rgb},0.72)`)
    gradient.addColorStop(0.32, `rgba(${rgb},0.24)`)
    gradient.addColorStop(0.7, `rgba(${rgb},0.05)`)
    gradient.addColorStop(1, `rgba(${rgb},0)`)
    context.fillStyle = gradient
    context.fillRect(0, 0, size, size)
    const result = new THREE.CanvasTexture(canvas)
    result.colorSpace = THREE.SRGBColorSpace
    return result
  }, [rgb])

  useEffect(() => {
    return () => {
      texture?.dispose()
    }
  }, [texture])

  return texture
}

function FloorGlow({ theme }: { theme: Theme }) {
  const texture = useGlowTexture(theme === 'light' ? '39,137,143' : '99,214,226')
  if (!texture) return null
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]}>
      <planeGeometry args={[8.4, 8.4]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={theme === 'light' ? 0.28 : 0.56}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
  )
}

/* ---------- monolith ---------- */

interface MonolithProps {
  open: boolean
  seamIntensity: number
  capLight: number
  palette: ScenePalette
}

function Monolith({ open, seamIntensity, capLight, palette }: MonolithProps) {
  const reducedMotion = useContext(ReducedMotion)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null)
  const glow = useGlowTexture('99,214,226')

  useFrame((_, delta) => {
    const material = materialRef.current
    if (!material) return
    const target = open ? 0.18 : 1
    const opacity = reducedMotion ? target : THREE.MathUtils.damp(material.opacity, target, 5, delta)
    material.opacity = opacity
    const transparent = opacity < 0.985
    if (material.transparent !== transparent) {
      material.transparent = transparent
      material.depthWrite = !transparent
      material.needsUpdate = true
    }
  })

  return (
    <group>
      <mesh position={[0, 0.075, 0]}>
        <cylinderGeometry args={[1.48, 1.62, 0.15, 72]} />
        <meshStandardMaterial color={palette.solidSoft} roughness={0.44} metalness={0.58} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.155, 0]}>
        <ringGeometry args={[1.16, 1.175, 96]} />
        <meshBasicMaterial
          color="#63d6e2"
          transparent
          opacity={0.52}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      <RoundedBox
        args={[1.55, 2.45, 1.55]}
        radius={0.045}
        smoothness={4}
        position={[0, 1.42, 0]}
      >
        <meshStandardMaterial
          ref={materialRef}
          color={palette.solid}
          roughness={0.23}
          metalness={0.82}
          emissive="#0a2228"
          emissiveIntensity={0.16}
          transparent
          opacity={1}
          envMapIntensity={1.15}
        />
        <Edges
          scale={1.001}
          threshold={16}
          color="#63d6e2"
          transparent
          opacity={seamIntensity}
          lineWidth={0.85}
        />
      </RoundedBox>

      <Seal open={open} />

      <mesh position={[0, 1.42, 0.782]}>
        <planeGeometry args={[0.13, 1.18]} />
        <meshBasicMaterial
          color="#b9f5fb"
          transparent
          opacity={open ? 0.34 : 0.9}
          toneMapped={false}
        />
      </mesh>
      {glow && (
        <mesh position={[0, 1.42, 0.79]}>
          <planeGeometry args={[1.5, 2.3]} />
          <meshBasicMaterial
            map={glow}
            transparent
            opacity={open ? 0.24 : 0.5}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      )}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 2.655, 0]}>
        <ringGeometry args={[0.42, 0.438, 64]} />
        <meshBasicMaterial
          color="#e9e5da"
          transparent
          opacity={capLight > 0.5 ? 0.72 : 0.15}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 2.658, 0]}>
        <ringGeometry args={[0.6, 0.613, 64]} />
        <meshBasicMaterial
          color="#dca94e"
          transparent
          opacity={capLight > 0.5 ? 0.36 : 0.06}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

function Seal({ open }: { open: boolean }) {
  const opacity = open ? 0.32 : 0.62
  const sizes = [0.24, 0.145, 0.07]
  return (
    <group position={[0, 1.63, 0.791]}>
      {sizes.map((size) => (
        <Line
          key={size}
          points={[
            [-size, -size, 0],
            [size, -size, 0],
            [size, size, 0],
            [-size, size, 0],
            [-size, -size, 0],
          ]}
          color="#df5b4f"
          lineWidth={0.7}
          transparent
          opacity={opacity}
          toneMapped={false}
        />
      ))}
      <mesh>
        <planeGeometry args={[0.045, 0.045]} />
        <meshBasicMaterial
          color="#ff897d"
          transparent
          opacity={open ? 0.5 : 0.9}
          toneMapped={false}
        />
      </mesh>
    </group>
  )
}

/* ---------- core ---------- */

function Core({ visible, spin }: { visible: boolean; spin: number }) {
  const reducedMotion = useContext(ReducedMotion)
  const group = useRef<THREE.Group>(null)

  useFrame((state, delta) => {
    if (!group.current) return
    const target = visible ? 1 : 0
    const scale = reducedMotion ? target : THREE.MathUtils.damp(group.current.scale.x, target, 6, delta)
    group.current.scale.setScalar(scale)
    if (!reducedMotion) group.current.rotation.y += delta * spin
    group.current.rotation.x = reducedMotion ? 0 : Math.sin(state.clock.elapsedTime * 0.24) * 0.16
  })

  return (
    <group ref={group} position={[0, 1.45, 0]} scale={0}>
      <mesh>
        <icosahedronGeometry args={[0.4, 1]} />
        <meshBasicMaterial
          color="#63d6e2"
          wireframe
          transparent
          opacity={0.72}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <icosahedronGeometry args={[0.23, 1]} />
        <meshStandardMaterial
          color="#0b1b22"
          emissive="#2e8f9a"
          emissiveIntensity={1.4}
          roughness={0.18}
          metalness={0.4}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.065, 16, 16]} />
        <meshBasicMaterial color="#dcfbff" toneMapped={false} />
      </mesh>
      <mesh rotation={[Math.PI / 2.4, 0.4, 0]}>
        <torusGeometry args={[0.62, 0.004, 6, 80]} />
        <meshBasicMaterial
          color="#63d6e2"
          transparent
          opacity={0.4}
          toneMapped={false}
        />
      </mesh>
      <pointLight
        intensity={1.4}
        color="#63d6e2"
        distance={2.4}
        decay={2}
      />
    </group>
  )
}

/* ---------- reason ring ---------- */

function ReasonRing({ visible, spin }: { visible: boolean; spin: number }) {
  const reducedMotion = useContext(ReducedMotion)
  const group = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (!group.current) return
    const target = visible ? 1 : 0
    const scale = reducedMotion ? target : THREE.MathUtils.damp(group.current.scale.x, target, 5, delta)
    group.current.scale.setScalar(scale)
    if (!reducedMotion) group.current.rotation.y += delta * spin
  })

  const markers = useMemo(
    () =>
      Array.from({ length: 4 }).map((_, index) => {
        const angle = (index / 4) * Math.PI * 2
        return [Math.cos(angle) * 0.82, Math.sin(angle) * 0.08, Math.sin(angle) * 0.82] as const
      }),
    [],
  )

  return (
    <group ref={group} position={[0, 2.96, 0]} scale={0}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.82, 0.007, 8, 96]} />
        <meshBasicMaterial
          color="#e9e5da"
          transparent
          opacity={0.46}
          toneMapped={false}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2.5, 0.45, 0]}>
        <torusGeometry args={[0.6, 0.006, 8, 96]} />
        <meshBasicMaterial
          color="#dca94e"
          transparent
          opacity={0.52}
          toneMapped={false}
        />
      </mesh>
      {markers.map((position, index) => (
        <mesh key={index} position={[...position]}>
          <octahedronGeometry args={[0.032, 0]} />
          <meshBasicMaterial
            color={index % 2 === 0 ? '#e9e5da' : '#dca94e'}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}

/* ---------- observer ---------- */

function Observer({ palette }: { palette: ScenePalette }) {
  return (
    <group position={[3.5, 0, 1.3]} rotation={[0, Math.atan2(-3.5, -1.3), 0]}>
      <mesh position={[0, 0.035, 0]}>
        <cylinderGeometry args={[0.3, 0.36, 0.07, 40]} />
        <meshStandardMaterial color={palette.solid} roughness={0.55} metalness={0.35} />
      </mesh>

      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.14, 0.26, 1.32, 24]} />
        <meshStandardMaterial
          color={palette.frame}
          roughness={0.4}
          metalness={0.35}
          emissive="#0a141d"
          emissiveIntensity={0.4}
        />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.145, 24, 24]} />
        <meshStandardMaterial
          color={palette.solid}
          roughness={0.38}
          metalness={0.4}
          emissive="#0b141d"
          emissiveIntensity={0.45}
        />
      </mesh>
      <mesh position={[0, 1.2, -0.035]} rotation={[0.2, 0, 0]}>
        <boxGeometry args={[0.35, 0.06, 0.22]} />
        <meshStandardMaterial color={palette.solidSoft} roughness={0.5} metalness={0.3} />
      </mesh>

      <group position={[0, 0.86, 0.58]}>
        <mesh>
          <boxGeometry args={[0.86, 0.075, 0.36]} />
          <meshStandardMaterial color={palette.solid} roughness={0.4} metalness={0.5} />
        </mesh>
        <mesh position={[0, -0.45, 0]}>
          <cylinderGeometry args={[0.035, 0.05, 0.86, 12]} />
          <meshStandardMaterial color={palette.solidSoft} roughness={0.5} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.22, 0.08]} rotation={[-0.22, 0, 0]}>
          <boxGeometry args={[0.48, 0.34, 0.015]} />
          <meshStandardMaterial color={palette.solid} roughness={0.3} metalness={0.4} />
        </mesh>
        <mesh position={[0, 0.225, 0.089]} rotation={[-0.22, 0, 0]}>
          <planeGeometry args={[0.42, 0.28]} />
          <meshBasicMaterial
            color="#2d8d99"
            transparent
            opacity={0.52}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
        <pointLight
          position={[0, 0.25, 0.22]}
          intensity={0.9}
          color="#63d6e2"
          distance={1.8}
          decay={2}
        />
      </group>
    </group>
  )
}

/* ---------- verifier ---------- */

const VERIFIER_PILLARS: Array<[number, number, number]> = [
  [-3.15, 0, 1.45],
  [-3.82, 0, 0.3],
  [-3.38, 0, -0.92],
]

function Verifier({ visible }: { visible: boolean }) {
  const reducedMotion = useContext(ReducedMotion)
  const group = useRef<THREE.Group>(null)
  const glow = useGlowTexture('220,169,78')

  useFrame((_, delta) => {
    if (!group.current) return
    const target = visible ? 1 : 0
    const scale = reducedMotion ? target : THREE.MathUtils.damp(group.current.scale.x, target, 5, delta)
    group.current.scale.setScalar(scale)
  })

  const tops = useMemo(
    () =>
      VERIFIER_PILLARS.map(
        ([x, , z]) => [x, 1.12, z] as [number, number, number],
      ),
    [],
  )

  return (
    <group ref={group} scale={0}>
      {glow && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-3.4, 0.045, 0.2]}>
          <planeGeometry args={[4, 4]} />
          <meshBasicMaterial
            map={glow}
            transparent
            opacity={0.45}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      )}

      {VERIFIER_PILLARS.map(([x, , z], index) => {
        const height = 0.9 + index * 0.16
        return (
          <group key={`${x}-${z}`} position={[x, 0, z]}>
            <mesh position={[0, height / 2, 0]}>
              <cylinderGeometry args={[0.038, 0.066, height, 14]} />
              <meshStandardMaterial
                color="#19140c"
                roughness={0.36}
                metalness={0.62}
                emissive="#4b3412"
                emissiveIntensity={0.55}
              />
            </mesh>
            <mesh position={[0, height, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <torusGeometry args={[0.11, 0.008, 8, 32]} />
              <meshBasicMaterial
                color="#dca94e"
                transparent
                opacity={0.85}
                toneMapped={false}
              />
            </mesh>
            <mesh position={[0, height - 0.2, 0]}>
              <sphereGeometry args={[0.018, 10, 10]} />
              <meshBasicMaterial color="#f0c477" toneMapped={false} />
            </mesh>
          </group>
        )
      })}

      <Line
        points={tops}
        color="#dca94e"
        lineWidth={0.7}
        transparent
        opacity={0.34}
      />
      <Line
        points={[
          [-3.15, 1.1, 1.4],
          [-2.2, 1.5, 0.9],
          [-0.9, 1.55, 0.3],
          [0, 1.5, 0.05],
        ]}
        color="#dca94e"
        lineWidth={0.8}
        dashed
        dashSize={0.09}
        gapSize={0.07}
        transparent
        opacity={0.42}
      />
    </group>
  )
}

/* ---------- channel ---------- */

function Channel({ opacity }: { opacity: number }) {
  const curve = useMemo(
    () =>
      new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0.82, 1.5, 0.25),
        new THREE.Vector3(1.9, 2.2, 0.8),
        new THREE.Vector3(2.95, 1.16, 1.12),
      ),
    [],
  )

  const points = useMemo(() => curve.getPoints(48), [curve])
  const reducedMotion = useContext(ReducedMotion)
  const flow = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!flow.current) return
    flow.current.children.forEach((child, index) => {
      const t = ((reducedMotion ? 0 : state.clock.elapsedTime * 0.18) + index / 3) % 1
      child.position.copy(curve.getPoint(t))
    })
  })

  return (
    <group>
      <Line
        points={points}
        color="#63d6e2"
        lineWidth={4}
        transparent
        opacity={opacity * 0.055}
      />
      <Line
        points={points}
        color="#a9edf3"
        lineWidth={0.9}
        dashed
        dashSize={0.1}
        gapSize={0.06}
        transparent
        opacity={opacity}
      />
      <group ref={flow}>
        {[0, 1, 2].map((index) => (
          <mesh key={index}>
            <sphereGeometry args={[0.026, 10, 10]} />
            <meshBasicMaterial
              color="#d9fbff"
              transparent
              opacity={opacity}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/* ---------- dust & labels ---------- */

function Dust() {
  const reducedMotion = useContext(ReducedMotion)
  const group = useRef<THREE.Group>(null)

  const positions = useMemo(() => {
    const array = new Float32Array(420 * 3)
    for (let index = 0; index < 420; index += 1) {
      const radius = 1.2 + Math.random() * 7.6
      const angle = Math.random() * Math.PI * 2
      array[index * 3] = Math.cos(angle) * radius
      array[index * 3 + 1] = 0.15 + Math.random() * 5.4
      array[index * 3 + 2] = Math.sin(angle) * radius
    }
    return array
  }, [])

  useFrame((state) => {
    if (!group.current) return
    if (!reducedMotion) group.current.rotation.y = state.clock.elapsedTime * 0.009
  })

  return (
    <group ref={group}>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#8adde5"
          size={0.021}
          sizeAttenuation
          transparent
          opacity={0.42}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}

/* ---------- camera ---------- */

function CameraRig({ preset }: { preset: CameraPreset }) {
  const reducedMotion = useContext(ReducedMotion)
  const { camera, controls } = useThree()
  const animating = useRef(true)

  const targetPosition = useMemo(
    () => new THREE.Vector3(...preset.position),
    [preset],
  )
  const targetLook = useMemo(() => new THREE.Vector3(...preset.target), [preset])

  useEffect(() => {
    animating.current = true
  }, [preset.id])

  useFrame((_, delta) => {
    if (!animating.current) return
    const alpha = reducedMotion ? 1 : 1 - Math.exp(-4.6 * delta)
    camera.position.lerp(targetPosition, alpha)

    const orbit = controls as unknown as {
      target: THREE.Vector3
      update: () => void
    } | null

    if (orbit) {
      orbit.target.lerp(targetLook, alpha)
      orbit.update()
    }

    if (camera.position.distanceTo(targetPosition) < 0.02) {
      camera.position.copy(targetPosition)
      if (orbit) {
        orbit.target.copy(targetLook)
        orbit.update()
      }
      animating.current = false
    }
  })

  return null
}
