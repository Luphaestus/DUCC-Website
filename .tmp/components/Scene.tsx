import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Float, PerspectiveCamera, Cloud, Stars, Sky, Sparkles, useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { Theme } from '../types';

interface SceneProps {
  theme: Theme;
}

type BiomeType = 'forest' | 'canyon' | 'snow';

// --- Utils ---
const getRandomBiome = (index: number): BiomeType => {
  const types: BiomeType[] = ['forest', 'canyon', 'snow'];
  return types[index % 3];
};

// --- Models ---

const Rocket: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const group = useRef<THREE.Group>(null);
  const [launched, setLaunched] = useState(false);
  const [delay] = useState(Math.random() * 5); // Random start delay

  useFrame((state, delta) => {
    if (!group.current) return;
    const t = state.clock.getElapsedTime();
    
    // Launch logic
    if (t > delay) {
        if (!launched) setLaunched(true);
        // Fly up
        group.current.position.y += delta * 15;
        // Spin
        group.current.rotation.y += delta * 5;
    }
  });

  return (
    <group ref={group} position={position} scale={0.5}>
        <mesh position={[0, 1, 0]}>
            <cylinderGeometry args={[0.2, 0.4, 2, 8]} />
            <meshStandardMaterial color="white" />
        </mesh>
        <mesh position={[0, 2.2, 0]}>
            <coneGeometry args={[0.2, 0.8, 8]} />
            <meshStandardMaterial color="red" />
        </mesh>
        <mesh position={[0, 0, 0]}>
             <boxGeometry args={[0.1, 0.8, 0.8]} />
             <meshStandardMaterial color="gray" />
        </mesh>
        <mesh position={[0, 0, 0]} rotation={[0, Math.PI/2, 0]}>
             <boxGeometry args={[0.1, 0.8, 0.8]} />
             <meshStandardMaterial color="gray" />
        </mesh>
        {launched && <Sparkles count={20} scale={2} color="orange" position={[0, -1, 0]} speed={2} />}
    </group>
  )
}

const Duck: React.FC<{ position: [number, number, number] }> = ({ position }) => {
    return (
        <group position={position} scale={0.5}>
            <mesh position={[0, 0.3, 0]}>
                <sphereGeometry args={[0.4, 16, 16]} />
                <meshStandardMaterial color="yellow" />
            </mesh>
             <mesh position={[0.3, 0.5, 0]}>
                <sphereGeometry args={[0.25, 16, 16]} />
                <meshStandardMaterial color="yellow" />
            </mesh>
             <mesh position={[0.5, 0.5, 0]}>
                <coneGeometry args={[0.1, 0.2, 8]} rotation={[0, 0, -Math.PI/2]}/>
                <meshStandardMaterial color="orange" />
            </mesh>
        </group>
    )
}

const KayakModel: React.FC<{
  color: string;
  paddlerColor: string;
}> = ({ color, paddlerColor }) => {
  return (
    <group>
      {/* Hull */}
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <capsuleGeometry args={[0.35, 2.5, 4, 12]} />
        <meshStandardMaterial color={color} roughness={0.1} metalness={0.1} />
      </mesh>
      
      {/* Cockpit */}
      <mesh position={[0, 0.45, -0.2]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 1.2, 1]}>
        <torusGeometry args={[0.35, 0.05, 8, 24]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Paddler */}
      <group position={[0, 0.4, -0.2]}>
        <mesh position={[0, 0.4, 0]}>
           <cylinderGeometry args={[0.25, 0.22, 0.5, 8]} />
           <meshStandardMaterial color={paddlerColor} roughness={0.8} />
        </mesh>
        <mesh position={[0, 0.8, 0]}>
           <sphereGeometry args={[0.15, 16, 16]} />
           <meshStandardMaterial color="#f5d0a9" />
        </mesh>
        <mesh position={[0, 0.85, 0]}>
           <sphereGeometry args={[0.16, 16, 16, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
           <meshStandardMaterial color={color} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
};

const Kayaker: React.FC<{
  position: [number, number, number];
  color: string;
  paddlerColor: string;
  offset: number;
}> = ({ position, color, paddlerColor, offset }) => {
  const paddleRef = useRef<THREE.Group>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!paddleRef.current || !groupRef.current) return;
    const t = state.clock.getElapsedTime() + offset;
    
    // Paddle strokes
    paddleRef.current.rotation.x = Math.sin(t * 3) * 0.5;
    paddleRef.current.rotation.y = Math.cos(t * 3) * 0.4;
    paddleRef.current.position.y = 0.8 + Math.sin(t * 6) * 0.05;
    paddleRef.current.position.z = -0.1 + Math.cos(t * 3) * 0.2;

    // Boat bobbing (Hydrodynamics simulation)
    groupRef.current.position.y = Math.sin(t * 2) * 0.05;
    groupRef.current.rotation.z = Math.sin(t * 1.5) * 0.05; // Roll
    groupRef.current.rotation.x = Math.sin(t * 2) * 0.02; // Pitch
  });

  return (
    <group position={position}>
        <group ref={groupRef}>
            <group rotation={[0, Math.PI, 0]} rotation-x={-Math.PI/2}> 
                {/* Adjust rotation so capsule lays flat. Capsule default is Y-axis */}
                <mesh rotation={[Math.PI/2, 0, 0]} position={[0, 0.2, 0]}> 
                     <KayakModel color={color} paddlerColor={paddlerColor} />
                </mesh>

                {/* Paddle */}
                <group ref={paddleRef} position={[0, 0.8, 0]}>
                    <mesh rotation={[0, 0, Math.PI / 2]}>
                        <cylinderGeometry args={[0.03, 0.03, 2.6, 8]} />
                        <meshStandardMaterial color="#111" />
                    </mesh>
                    <mesh position={[1.3, 0, 0]} rotation={[0, Math.PI / 4, 0]}>
                        <boxGeometry args={[0.5, 0.25, 0.05]} />
                        <meshStandardMaterial color="#eee" />
                    </mesh>
                    <mesh position={[-1.3, 0, 0]} rotation={[0, -Math.PI / 4, 0]}>
                        <boxGeometry args={[0.5, 0.25, 0.05]} />
                        <meshStandardMaterial color="#eee" />
                    </mesh>
                    
                    {/* Water Spray from Paddles */}
                    <group position={[1.4, 0, 0]}>
                        <Sparkles count={15} scale={0.8} speed={0.4} opacity={0.5} color="#ccfbf1" size={2} />
                    </group>
                    <group position={[-1.4, 0, 0]}>
                        <Sparkles count={15} scale={0.8} speed={0.4} opacity={0.5} color="#ccfbf1" size={2} />
                    </group>
                </group>

                {/* Bow Wave Spray */}
                <group position={[0, 0.1, -1.8]}>
                    <Sparkles count={30} scale={[1, 0.5, 1]} speed={0.2} opacity={0.4} color="white" size={3} />
                </group>
            </group>
        </group>
    </group>
  );
};

const RiverChunk: React.FC<{
  zOffset: number;
  theme: Theme;
  index: number;
}> = ({ zOffset, theme, index }) => {
  const meshRef = useRef<THREE.Group>(null);
  const CHUNK_SIZE = 60;
  const biome = getRandomBiome(index);
  
  // Random "stuff" decision
  const hasRocket = useMemo(() => Math.random() > 0.8, [index]);
  const hasDuck = useMemo(() => Math.random() > 0.7, [index]);
  const isRapids = useMemo(() => Math.random() > 0.6, [index]);
  
  useFrame((state, delta) => {
    if (!meshRef.current) return;
    
    // Increased speed for excitement
    const speed = 12;
    meshRef.current.position.z += speed * delta;

    // Reset loop
    if (meshRef.current.position.z > CHUNK_SIZE) {
        meshRef.current.position.z -= (CHUNK_SIZE * 4);
    }
  });

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(60, 60, 50, 50);
    const posAttribute = geo.getAttribute('position');
    const vertex = new THREE.Vector3();

    for (let i = 0; i < posAttribute.count; i++) {
      vertex.fromBufferAttribute(posAttribute, i);
      const x = vertex.x;
      const y = vertex.y; // Local Y corresponds to World -Z
      
      const distFromCenter = Math.abs(x);
      let height = 0;
      
      // Noise functions
      const noise = Math.sin(x * 0.3) + Math.cos(y * 0.2);
      const jagged = Math.random() * 0.5;

      // River Bed
      if (distFromCenter < 10) {
        height = -4; // Deep enough for boat at 0
        // Rapids: Add rocks/spikes in the water
        if (isRapids) {
            height += Math.random() * 1.5;
        } else {
            height += Math.sin(x) * 0.5;
        }
      } 
      // Banks
      else {
        // Base bank height
        height = 2 + (distFromCenter - 10) * 1.5;
        
        // Biome specific terrain
        if (biome === 'canyon') {
             height += Math.abs(noise) * 5; // Jagged
        } else if (biome === 'forest') {
             height += Math.sin(x) * 2; // Rolling
        } else {
             height += noise * 1.5; // Snowy drifts
        }
      }

      posAttribute.setZ(i, height);
    }
    geo.computeVertexNormals();
    return geo;
  }, [biome, isRapids]);

  // Biome Colors
  const getColors = () => {
    if (theme === 'dark') {
        if (biome === 'canyon') return { bank: '#4a1e1e', water: '#2d1b4e' };
        if (biome === 'snow') return { bank: '#94a3b8', water: '#1e293b' };
        return { bank: '#064e3b', water: '#0f172a' }; // Forest (Dark)
    } else {
        if (biome === 'canyon') return { bank: '#c2410c', water: '#0ea5e9' };
        if (biome === 'snow') return { bank: '#f1f5f9', water: '#bae6fd' };
        return { bank: '#22c55e', water: '#00A8CC' }; // Forest (Light)
    }
  }

  const { bank, water } = getColors();
  
  return (
    <group ref={meshRef} position={[0, -5, zOffset]}>
       {/* Terrain Mesh */}
       <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow castShadow>
         <primitive object={geometry} />
         <meshStandardMaterial 
            color={bank} 
            flatShading 
            roughness={biome === 'snow' ? 0.3 : 1} 
         />
       </mesh>
       
       {/* Water Surface */}
       <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
          <planeGeometry args={[20, 60, 20, 20]} />
          <meshPhysicalMaterial 
            color={water} 
            transparent 
            opacity={0.8}
            roughness={isRapids ? 0.4 : 0.1}
            metalness={0.6}
            clearcoat={1}
          />
       </mesh>

       {/* Foam/Spray for rapids */}
       {isRapids && (
           <group position={[0, -0.5, 0]}>
                <Sparkles count={200} scale={[15, 2, 50]} size={6} speed={0.5} opacity={0.6} color="white" />
           </group>
       )}
       
       {/* Waterfalls on banks - Visual effect */}
       {index % 2 === 0 && biome !== 'snow' && (
           <group position={[14, 2, 0]}>
                <mesh position={[0, 0, 0]} rotation={[0,0,0]}>
                    <boxGeometry args={[2, 10, 5]} />
                    <meshStandardMaterial color="#e0f2fe" opacity={0.8} transparent />
                </mesh>
                <Sparkles count={50} scale={[3, 10, 4]} color="white" size={4} speed={2} />
           </group>
       )}

        {/* Random Stuff */}
       {hasRocket && <Rocket position={[-15, 0, 0]} />}
       {hasDuck && <Duck position={[4, -0.2, 5]} />}
    </group>
  );
};

const CelestialBodies: React.FC<{ theme: Theme }> = ({ theme }) => {
    return (
        <group>
            {theme === 'light' ? (
                <>
                    <Sky sunPosition={[100, 20, 100]} turbidity={0.5} rayleigh={0.5} />
                    <mesh position={[50, 80, -100]}>
                        <sphereGeometry args={[10, 32, 32]} />
                        <meshBasicMaterial color="#fbbf24" />
                        <Sparkles count={20} scale={22} size={20} color="yellow" />
                    </mesh>
                    <ambientLight intensity={0.8} />
                    <directionalLight position={[10, 20, 5]} intensity={1.5} castShadow />
                </>
            ) : (
                <>
                    <Stars radius={150} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                    <mesh position={[-40, 60, -100]}>
                        <sphereGeometry args={[8, 32, 32]} />
                        <meshStandardMaterial color="#e2e8f0" emissive="#cbd5e1" emissiveIntensity={0.5} />
                    </mesh>
                    <ambientLight intensity={0.2} />
                    <directionalLight position={[-10, 20, -5]} intensity={0.5} color="#818cf8" castShadow />
                    <fog attach="fog" args={['#020617', 20, 160]} /> 
                </>
            )}
        </group>
    )
}

const SceneContent: React.FC<{ theme: Theme }> = ({ theme }) => {
  const { mouse, camera } = useThree();
  const [targetPos] = useState(() => new THREE.Vector3());

  useFrame((state) => {
    const parallaxX = mouse.x * 5;
    const parallaxY = mouse.y * 3;
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, parallaxX, 0.05);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, 6 + parallaxY, 0.05);
    targetPos.set(0, 0, -30);
    camera.lookAt(targetPos);
  });

  const fogColor = theme === 'dark' ? '#020617' : '#e0f2fe';

  return (
    <>
        <PerspectiveCamera makeDefault position={[0, 6, 15]} fov={60} far={200} />
        {theme === 'light' && <fog attach="fog" args={[fogColor, 30, 180]} />}
        
        <CelestialBodies theme={theme} />
        <pointLight position={[-10, 5, 0]} intensity={0.8} color="#00A8CC" distance={20} />

        <group>
            {/* Chunks spaced by 60 */}
            <RiverChunk zOffset={-60} theme={theme} index={0} />
            <RiverChunk zOffset={-120} theme={theme} index={1} />
            <RiverChunk zOffset={-180} theme={theme} index={2} />
            <RiverChunk zOffset={-240} theme={theme} index={3} />

            {theme === 'light' && <Cloud opacity={0.5} segments={40} bounds={[10, 2, 2]} volume={10} color="#fff" position={[0, 20, -80]} />}
            
            {/* Kayaks - Adjusted Y to float ON water (Water surface is roughly -0.5 relative to chunk -5 world... wait.
                Chunk is at Y=-5.
                Water is at Chunk Y -0.5 = World -5.5.
                So Kayaker needs to be at -5.5 roughly.
            */}
            <group position={[0, -5.5, -4]}>
                <Kayaker position={[3, 0, -5]} color="#D97706" paddlerColor="#ef4444" offset={0} />
                <Kayaker position={[-2, 0, -2]} color="#68246D" paddlerColor="#22c55e" offset={2} />
                <Kayaker position={[0.5, 0, -8]} color="#0ea5e9" paddlerColor="#f59e0b" offset={4} />
            </group>
        </group>
    </>
  );
};

// Main Scene component rendering the Canvas
const Scene: React.FC<SceneProps> = ({ theme }) => {
  return (
    <Canvas dpr={[1, 2]} shadows className="transition-colors duration-500">
      <SceneContent theme={theme} />
    </Canvas>
  );
};

export default Scene;