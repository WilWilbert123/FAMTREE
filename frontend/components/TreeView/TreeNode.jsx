// File context: C:\Users\HERROZ\Desktop\FAMTREE\frontend\components\TreeView\TreeNode.jsx
import { useFrame } from '@react-three/fiber/native';
import React from 'react';

export default function ThreeDNode({ node, position, zoomLevel, onPress, theme }) {
  const meshRef = React.useRef();
  const [hovered, setHovered] = React.useState(false);

  useFrame(() => {
    if (meshRef.current) {
      // Clean interpolation transitions for buttery micro-animations
      const targetScale = hovered ? 1.15 : 1.0;
      meshRef.current.scale.x = THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, 0.2);
      meshRef.current.scale.y = THREE.MathUtils.lerp(meshRef.current.scale.y, targetScale, 0.2);
    }
  });

  const getNodeColor = () => {
    if (node.gender === 'male') return '#3B82F6';
    if (node.gender === 'female') return '#EC4899';
    return theme.colors.primary;
  };

  const getDisplayMode = () => {
    if (zoomLevel < 0.4) return 'dot';
    return 'full';
  };

  const displayMode = getDisplayMode();

  return (
    <group position={[position.x, position.y, 0]}>
      <mesh
        ref={meshRef}
        onClick={() => onPress?.(node)}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {displayMode === 'dot' ? (
          <sphereGeometry args={[0.25, 16, 16]} />
        ) : (
          <cylinderGeometry args={[0.35, 0.35, 0.5, 32]} />
        )}
        <meshStandardMaterial
          color={getNodeColor()}
          emissive={hovered ? getNodeColor() : '#000000'}
          emissiveIntensity={hovered ? 0.35 : 0}
          metalness={0.2}
          roughness={0.4}
        />
      </mesh>
      
      {/* ... Hover lights or Text fields can stay mapped exactly below */}
    </group>
  );
}