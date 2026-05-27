// File path: C:\Users\HERROZ\Desktop\FAMTREE\frontend\components\TreeView\FamilyTreeScreen.jsx
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import TreeControls from './TreeControls';
import ZoomableTree from './ZoomableTree';

export default function FamilyTreeScreen() {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0 });
  const [searchQuery, setSearchQuery] = useState('');

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.2, 2.5));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.2, 0.3));
  };

  const handleReset = () => {
    setZoomLevel(1);
    setCameraPosition({ x: 0, y: 0 });
    setSearchQuery('');
  };

  const handleCenter = () => {
    setCameraPosition({ x: 0, y: 0 });
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
  };

  return (
    <View style={styles.container}>
      {/* 3D Canvas View Layer */}
      <ZoomableTree
        zoomLevel={zoomLevel}
        setZoomLevel={setZoomLevel}
        cameraPosition={cameraPosition}
        setCameraPosition={setCameraPosition}
        searchQuery={searchQuery}
        onNodePress={(node) => console.log('Node Selected:', node.name)}
      />

      {/* Floating Header UI Controls Layer */}
      <TreeControls
        zoomLevel={zoomLevel}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleReset}
        onCenter={handleCenter}
        onSearch={handleSearch}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});