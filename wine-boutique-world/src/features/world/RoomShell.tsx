import { RoundedBox } from '@react-three/drei'
import { boutiqueShell } from '../../config/boutiqueLayout'

const stucco = '#8c5a39'
const walnut = '#4d2618'
const walnutDark = '#2c140d'
const brass = '#d4a269'
const stone = '#a98b6b'
const glow = '#ffb159'

function CeilingBeams() {
  return (
    <>
      {Array.from({ length: boutiqueShell.beamCount }, (_, index) => {
        const z = 1.08 + index * 1.28

        return (
          <RoundedBox
            key={`beam-${index}`}
            args={[5.2, 0.24, 0.34]}
            radius={0.02}
            smoothness={4}
            position={[0, 2.88, z]}
            castShadow
            receiveShadow
          >
            <meshStandardMaterial color={walnutDark} roughness={0.42} />
          </RoundedBox>
        )
      })}
    </>
  )
}

function LeftShelving() {
  return (
    <group position={[-2.02, 1.1, 3.45]}>
      <RoundedBox args={[0.92, 2.2, 5.45]} radius={0.035} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color={walnut} roughness={0.46} />
      </RoundedBox>

      {Array.from({ length: 5 }, (_, index) => {
        const z = -2.05 + index * 1.02

        return (
          <group key={`left-shelf-${index}`} position={[0.44, 0, z]}>
            <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
              <boxGeometry args={[0.03, 1.75, 0.02]} />
              <meshStandardMaterial color={walnutDark} roughness={0.38} />
            </mesh>
            <mesh position={[0.01, -0.62, 0]} receiveShadow>
              <boxGeometry args={[0.07, 0.12, 0.84]} />
              <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.65} roughness={0.25} />
            </mesh>
          </group>
        )
      })}

      <mesh position={[0.46, 0.55, 0]}>
        <boxGeometry args={[0.02, 0.06, 5.18]} />
        <meshStandardMaterial color={brass} metalness={0.4} roughness={0.26} />
      </mesh>
    </group>
  )
}

function RightBar() {
  return (
    <group>
      <RoundedBox
        args={[1.3, 1.04, 4.9]}
        radius={0.05}
        smoothness={4}
        position={[1.82, 0.54, 3.22]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={walnut} roughness={0.46} />
      </RoundedBox>

      <RoundedBox
        args={[1.48, 0.12, 5.12]}
        radius={0.06}
        smoothness={4}
        position={[1.76, 1.08, 3.2]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#6d3521" roughness={0.31} metalness={0.04} />
      </RoundedBox>

      <RoundedBox
        args={[0.86, 1.02, 1.42]}
        radius={0.05}
        smoothness={4}
        position={[1.26, 0.52, 1.54]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={walnut} roughness={0.46} />
      </RoundedBox>

      <RoundedBox
        args={[1.04, 0.12, 1.56]}
        radius={0.05}
        smoothness={4}
        position={[1.22, 1.08, 1.54]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color="#6d3521" roughness={0.31} metalness={0.04} />
      </RoundedBox>

      {[
        [1.12, 0.4, 2.1],
        [1.04, 0.4, 3.15],
        [1.18, 0.4, 4.16],
      ].map(([x, y, z], index) => (
        <group key={`stool-${index}`} position={[x, y, z]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.16, 0.18, 0.08, 18]} />
            <meshStandardMaterial color="#efe0cb" roughness={0.8} />
          </mesh>
          <mesh position={[0, -0.26, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[0.035, 0.035, 0.46, 10]} />
            <meshStandardMaterial color={walnutDark} roughness={0.42} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function FrontDoor() {
  return (
    <group position={[0, 0, 0.02]}>
      <mesh position={[0, 1.14, 0]}>
        <planeGeometry args={[1.38, 2.18]} />
        <meshBasicMaterial color="#fff3df" transparent opacity={0.92} />
      </mesh>

      <mesh position={[0, 1.14, 0.02]} castShadow receiveShadow>
        <boxGeometry args={[0.08, 2.18, 0.06]} />
        <meshStandardMaterial color={walnutDark} roughness={0.42} />
      </mesh>

      <mesh position={[-0.36, 1.14, 0.02]} castShadow receiveShadow>
        <boxGeometry args={[0.04, 2.18, 0.06]} />
        <meshStandardMaterial color={walnutDark} roughness={0.42} />
      </mesh>

      <mesh position={[0.36, 1.14, 0.02]} castShadow receiveShadow>
        <boxGeometry args={[0.04, 2.18, 0.06]} />
        <meshStandardMaterial color={walnutDark} roughness={0.42} />
      </mesh>
    </group>
  )
}

export function RoomShell() {
  return (
    <group>
      <mesh rotation={[-Math.PI * 0.5, 0, 0]} receiveShadow>
        <planeGeometry args={[boutiqueShell.roomWidth, boutiqueShell.roomDepth]} />
        <meshStandardMaterial color={stone} roughness={0.9} />
      </mesh>

      <mesh position={[-2.64, 1.52, 3.55]} castShadow receiveShadow>
        <boxGeometry args={[0.18, boutiqueShell.wallHeight, boutiqueShell.roomDepth]} />
        <meshStandardMaterial color={stucco} roughness={0.95} />
      </mesh>

      <mesh position={[2.64, 1.52, 3.55]} castShadow receiveShadow>
        <boxGeometry args={[0.18, boutiqueShell.wallHeight, boutiqueShell.roomDepth]} />
        <meshStandardMaterial color={stucco} roughness={0.95} />
      </mesh>

      <mesh position={[0, 1.52, 7.02]} castShadow receiveShadow>
        <boxGeometry args={[boutiqueShell.roomWidth, boutiqueShell.wallHeight, boutiqueShell.wallThickness]} />
        <meshStandardMaterial color={stucco} roughness={0.95} />
      </mesh>

      <mesh position={[-1.85, 1.52, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.65, boutiqueShell.wallHeight, boutiqueShell.wallThickness]} />
        <meshStandardMaterial color={stucco} roughness={0.95} />
      </mesh>

      <mesh position={[1.85, 1.52, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.65, boutiqueShell.wallHeight, boutiqueShell.wallThickness]} />
        <meshStandardMaterial color={stucco} roughness={0.95} />
      </mesh>

      <mesh position={[0, 2.66, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.08, 0.76, boutiqueShell.wallThickness]} />
        <meshStandardMaterial color={stucco} roughness={0.95} />
      </mesh>

      <mesh position={[0, 3.03, 3.55]} receiveShadow>
        <boxGeometry args={[boutiqueShell.roomWidth, 0.08, boutiqueShell.roomDepth]} />
        <meshStandardMaterial color="#402116" roughness={0.72} />
      </mesh>

      <CeilingBeams />
      <FrontDoor />
      <LeftShelving />
      <RightBar />

      <RoundedBox
        args={[0.4, 1.05, 0.4]}
        radius={0.03}
        smoothness={4}
        position={[-0.08, 0.52, 3.32]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={walnut} roughness={0.42} />
      </RoundedBox>

      <mesh position={[-0.08, 1.08, 3.32]}>
        <boxGeometry args={[0.24, 0.04, 0.24]} />
        <meshStandardMaterial color={brass} metalness={0.44} roughness={0.22} />
      </mesh>

      <group position={[-0.58, 0, 5.78]}>
        <mesh position={[-0.22, 0.42, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.46, 0.84, 0.52]} />
          <meshStandardMaterial color="#d8c3ac" roughness={0.82} />
        </mesh>
        <mesh position={[0.42, 0.42, 0.08]} castShadow receiveShadow>
          <boxGeometry args={[0.46, 0.84, 0.52]} />
          <meshStandardMaterial color="#d8c3ac" roughness={0.82} />
        </mesh>
        <mesh position={[0.1, 0.18, 0.05]} castShadow receiveShadow>
          <boxGeometry args={[0.38, 0.12, 0.38]} />
          <meshStandardMaterial color="#6d3521" roughness={0.36} />
        </mesh>
      </group>

      <mesh position={[-0.88, 1.42, 6.92]} castShadow receiveShadow>
        <boxGeometry args={[1.4, 1.4, 0.04]} />
        <meshStandardMaterial color="#5a2c1c" roughness={0.48} metalness={0.06} />
      </mesh>

      <mesh position={[-0.88, 1.42, 6.9]}>
        <planeGeometry args={[1.05, 1.05]} />
        <meshBasicMaterial color="#2f160f" />
      </mesh>

      <mesh position={[1.96, 1.42, 6.92]} castShadow receiveShadow>
        <boxGeometry args={[0.95, 1.8, 0.04]} />
        <meshStandardMaterial color={walnut} roughness={0.46} />
      </mesh>

      <mesh position={[1.96, 0.5, 6.92]} castShadow receiveShadow>
        <boxGeometry args={[0.95, 1, 0.04]} />
        <meshStandardMaterial color={walnutDark} roughness={0.42} />
      </mesh>

      <mesh position={[-1.86, 1.36, 1.68]} castShadow>
        <boxGeometry args={[0.12, 0.44, 0.12]} />
        <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.8} />
      </mesh>

      <mesh position={[1.18, 1.95, 2.42]} castShadow>
        <sphereGeometry args={[0.09, 20, 20]} />
        <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={1.1} roughness={0.2} />
      </mesh>
    </group>
  )
}
