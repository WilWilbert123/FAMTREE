import {
    Line,
    OrbitControls
} from '@react-three/drei/native';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as THREE from 'three';
import { useTheme } from '../Theme/useTheme';
import ThreeDNode from './TreeNode';

const { width, height } = Dimensions.get('window');

// Family line component
function FamilyLine({ from, to, type, theme }) {
  const points = React.useMemo(() => {
    const start = new THREE.Vector3(from.x, from.y, 0);
    const end = new THREE.Vector3(to.x, to.y, 0);
    
    // Create bezier curve for organic look
    const midX = (start.x + end.x) / 2;
    const midY = (start.y + end.y) / 2 + 0.5;
    const midPoint = new THREE.Vector3(midX, midY, 0);
    
    const curve = new THREE.QuadraticBezierCurve3(start, midPoint, end);
    return curve.getPoints(50);
  }, [from, to]);

  const getLineColor = () => {
    if (type === 'spouse') return theme.colors.secondary;
    if (type === 'parent-child') {
      // Color based on side (simple logic)
      return theme.colors.primary;
    }
    return theme.colors.textSecondary;
  };

  return (
    <Line
      points={points}
      color={getLineColor()}
      lineWidth={2}
      dashed={type === 'spouse'}
    />
  );
}

// Camera controller component
function CameraController({ zoom, center, onUpdate }) {
  const { camera, gl } = useThree();
  
  useFrame(() => {
    if (camera.zoom !== zoom) {
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
    }
    if (camera.position.x !== center.x || camera.position.y !== center.y) {
      camera.position.x = center.x;
      camera.position.y = center.y;
      camera.updateProjectionMatrix();
    }
  });
  
  return null;
}

// Main Zoomable Tree Component
export default function ZoomableTree({
  nodes = [],
  edges = [],
  onNodePress,
  initialZoom = 1,
  initialCenter = { x: 0, y: 0 },
}) {
  const { theme } = useTheme();
  const [zoomLevel, setZoomLevel] = useState(initialZoom);
  const [cameraPosition, setCameraPosition] = useState(initialCenter);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const orbitControlsRef = useRef();
  
  // Sample data if none provided
  const displayNodes = nodes.length > 0 ? nodes : getSampleNodes();
  const displayEdges = edges.length > 0 ? edges : getSampleEdges();

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setIsLoading(false), 500);
  }, []);

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 0.2, 2.5));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 0.2, 0.3));
  };

  const handleReset = () => {
    setZoomLevel(1);
    setCameraPosition({ x: 0, y: 0 });
  };

  const handleCenter = () => {
    setCameraPosition({ x: 0, y: 0 });
  };

  const handleSearch = (query) => {
    const found = displayNodes.find(node => 
      node.name.toLowerCase().includes(query.toLowerCase())
    );
    if (found) {
      setCameraPosition({ x: -found.x, y: -found.y });
      setZoomLevel(1.2);
    }
  };

  const handleNodePressInternal = (node) => {
    setSelectedNode(node);
    onNodePress?.(node);
  };

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textPrimary }]}>
          Loading family tree...
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.canvasContainer}>
        <Canvas
          style={styles.canvas}
          camera={{ position: [0, 0, 8], zoom: zoomLevel }}
        >
          {/* Lighting */}
          <ambientLight intensity={0.6} />
          <pointLight position={[10, 10, 10]} intensity={0.8} />
          <pointLight position={[-10, -10, -10]} intensity={0.4} />
          <directionalLight position={[5, 10, 5]} intensity={0.5} />
          
          {/* Camera Controls */}
          <OrbitControls
            ref={orbitControlsRef}
            enableZoom={true}
            enablePan={true}
            zoomSpeed={1.2}
            panSpeed={0.8}
            rotateSpeed={0.5}
            minZoom={0.3}
            maxZoom={2.5}
            onChange={(e) => {
              if (orbitControlsRef.current) {
                setZoomLevel(orbitControlsRef.current.object.zoom);
              }
            }}
          />
          
          <CameraController zoom={zoomLevel} center={cameraPosition} />
          
          {/* Background grid for reference */}
          <gridHelper
            args={[20, 20, theme.colors.border, theme.colors.border]}
            position={[0, -3, -1]}
          />
          
          {/* Family lines */}
          {displayEdges.map((edge, index) => {
            const fromNode = displayNodes.find(n => n.id === edge.from);
            const toNode = displayNodes.find(n => n.id === edge.to);
            if (!fromNode || !toNode) return null;
            return (
              <FamilyLine
                key={`edge-${index}`}
                from={{ x: fromNode.x, y: fromNode.y }}
                to={{ x: toNode.x, y: toNode.y }}
                type={edge.type}
                theme={theme}
              />
            );
          })}
          
          {/* Family nodes */}
          {displayNodes.map((node) => (
            <ThreeDNode
              key={`node-${node.id}`}
              node={node}
              position={{ x: node.x, y: node.y }}
              zoomLevel={zoomLevel}
              onPress={handleNodePressInternal}
              theme={theme}
            />
          ))}
        </Canvas>
      </View>
      
      {/* Floating controls */}
      <View style={[styles.floatingControls, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity style={styles.controlBtn} onPress={handleZoomIn}>
          <Text style={[styles.controlBtnText, { color: theme.colors.primary }]}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={handleZoomOut}>
          <Text style={[styles.controlBtnText, { color: theme.colors.primary }]}>-</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={handleReset}>
          <Text style={[styles.controlBtnText, { color: theme.colors.primary }]}>⟳</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.controlBtn} onPress={handleCenter}>
          <Text style={[styles.controlBtnText, { color: theme.colors.primary }]}>◉</Text>
        </TouchableOpacity>
      </View>
      
      {/* Zoom indicator */}
      <View style={[styles.zoomIndicator, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.zoomText, { color: theme.colors.textPrimary }]}>
          {Math.round(zoomLevel * 100)}%
        </Text>
      </View>
    </GestureHandlerRootView>
  );
}

// Sample data for demonstration
function getSampleNodes() {
  return [
    { id: 1, name: 'Grandfather', birthYear: 1950, gender: 'male', x: -2, y: 2, avatar: null },
    { id: 2, name: 'Grandmother', birthYear: 1952, gender: 'female', x: 2, y: 2, avatar: null },
    { id: 3, name: 'Father', birthYear: 1975, gender: 'male', x: -1, y: 0, avatar: null },
    { id: 4, name: 'Mother', birthYear: 1977, gender: 'female', x: 1, y: 0, avatar: null },
    { id: 5, name: 'Son', birthYear: 2000, gender: 'male', x: -1, y: -2, avatar: null },
    { id: 6, name: 'Daughter', birthYear: 2002, gender: 'female', x: 1, y: -2, avatar: null },
    { id: 7, name: 'Uncle', birthYear: 1973, gender: 'male', x: -3, y: 0, avatar: null },
    { id: 8, name: 'Aunt', birthYear: 1975, gender: 'female', x: 3, y: 0, avatar: null },
    { id: 9, name: 'Cousin', birthYear: 1998, gender: 'male', x: -2, y: -2, avatar: null },
    { id: 10, name: 'Cousin', birthYear: 2000, gender: 'female', x: 2, y: -2, avatar: null },
  ];
}

function getSampleEdges() {
  return [
    { from: 1, to: 3, type: 'parent-child' },
    { from: 2, to: 3, type: 'parent-child' },
    { from: 1, to: 7, type: 'parent-child' },
    { from: 2, to: 8, type: 'parent-child' },
    { from: 3, to: 4, type: 'spouse' },
    { from: 3, to: 5, type: 'parent-child' },
    { from: 4, to: 5, type: 'parent-child' },
    { from: 3, to: 6, type: 'parent-child' },
    { from: 4, to: 6, type: 'parent-child' },
    { from: 7, to: 9, type: 'parent-child' },
    { from: 8, to: 10, type: 'parent-child' },
  ];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  canvasContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  canvas: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  floatingControls: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    borderRadius: 30,
    flexDirection: 'row',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  controlBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  controlBtnText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  zoomIndicator: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  zoomText: {
    fontSize: 14,
    fontWeight: '600',
  },
});