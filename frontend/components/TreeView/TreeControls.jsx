import React from 'react';
import {
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../Theme/useTheme';

export default function TreeControls({
  onZoomIn,
  onZoomOut,
  onReset,
  onSearch,
  onCenter,
  zoomLevel,
}) {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = React.useState('');

  const handleSearch = () => {
    if (searchQuery.trim()) {
      onSearch?.(searchQuery);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    onSearch?.('');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { borderColor: theme.colors.border }]}>
        <Icon name="search" size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.textPrimary }]}
          placeholder="Search family members..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          onSubmitEditing={handleSearch}
        />
        {searchQuery !== '' && (
          <TouchableOpacity onPress={handleClearSearch}>
            <Icon name="close" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
          <Text style={[styles.searchButtonText, { color: theme.colors.primary }]}>
            Go
          </Text>
        </TouchableOpacity>
      </View>

      {/* Zoom Controls */}
      <View style={styles.zoomControls}>
        <TouchableOpacity
          style={[styles.controlButton, { borderRightColor: theme.colors.border }]}
          onPress={onZoomOut}
        >
          <Icon name="zoom-out" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        
        <View style={styles.zoomLevel}>
          <Text style={[styles.zoomText, { color: theme.colors.textPrimary }]}>
            {Math.round(zoomLevel * 100)}%
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.controlButton, { borderLeftColor: theme.colors.border }]}
          onPress={onZoomIn}
        >
          <Icon name="zoom-in" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onReset}
        >
          <Icon name="center-focus-strong" size={20} color={theme.colors.primary} />
          <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>
            Reset
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onCenter}
        >
          <Icon name="my-location" size={20} color={theme.colors.primary} />
          <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>
            Center
          </Text>
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={[styles.instructionText, { color: theme.colors.textSecondary }]}>
          🖱️ Drag to pan • Pinch to zoom • Tap node for details
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    left: 16,
    right: 16,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    overflow: 'hidden',
    zIndex: 1000,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    paddingVertical: 4,
  },
  searchButton: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  searchButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  controlButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRightWidth: 1,
    borderLeftWidth: 1,
    borderColor: 'transparent',
  },
  zoomLevel: {
    paddingHorizontal: 20,
  },
  zoomText: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  actionText: {
    fontSize: 12,
  },
  instructions: {
    paddingVertical: 8,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  instructionText: {
    fontSize: 11,
  },
});