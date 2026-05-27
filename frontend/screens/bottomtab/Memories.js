import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../components/Theme/useTheme';

// Safe import for image picker
let ImagePicker = null;
let hasShownAlert = false;

const loadImagePicker = async () => {
  try {
    const module = await import('expo-image-picker');
    ImagePicker = module.default || module;
    console.log('Image picker loaded successfully');
  } catch (error) {
    if (!hasShownAlert) {
      console.log('Image picker not available:', error.message);
      hasShownAlert = true;
    }
  }
};

export default function Memories() {
  const { theme } = useTheme();
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [albums, setAlbums] = useState(['General', 'Birthdays', 'Weddings', 'Holidays']);
  const [selectedAlbum, setSelectedAlbum] = useState('General');

  useEffect(() => {
    loadSamplePhotos();
    loadImagePicker();
  }, []);

  const checkPermissions = async () => {
    if (Platform.OS === 'web' || !ImagePicker) return;
    
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload photos');
      }
    } catch (error) {
      console.log('Permission error:', error);
    }
  };

  const loadSamplePhotos = () => {
    const samplePhotos = [
      {
        id: 1,
        url: 'https://picsum.photos/id/100/200/300',
        thumbnail: 'https://picsum.photos/id/100/100/100',
        caption: 'Family reunion 2023',
        album: 'General',
        date: '2023-08-15',
        likes: 12,
        comments: []
      },
      {
        id: 2,
        url: 'https://picsum.photos/id/101/200/300',
        thumbnail: 'https://picsum.photos/id/101/100/100',
        caption: 'Birthday celebration',
        album: 'Birthdays',
        date: '2023-10-20',
        likes: 8,
        comments: []
      },
      {
        id: 3,
        url: 'https://picsum.photos/id/102/200/300',
        thumbnail: 'https://picsum.photos/id/102/100/100',
        caption: 'Wedding anniversary',
        album: 'Weddings',
        date: '2023-09-05',
        likes: 15,
        comments: []
      },
      {
        id: 4,
        url: 'https://picsum.photos/id/103/200/300',
        thumbnail: 'https://picsum.photos/id/103/100/100',
        caption: 'Holiday trip',
        album: 'Holidays',
        date: '2023-12-25',
        likes: 24,
        comments: []
      }
    ];
    setPhotos(samplePhotos);
  };

  const pickImage = async () => {
    if (!ImagePicker) {
      Alert.alert('Info', 'Image picker is initializing. Please try again in a moment.');
      await loadImagePicker();
      if (!ImagePicker) {
        Alert.alert('Info', 'Image picker is only available on mobile devices');
        return;
      }
    }

    try {
      await checkPermissions();
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        uploadImage(result.assets[0]);
      }
    } catch (error) {
      console.log('Pick image error:', error);
      Alert.alert('Error', 'Failed to pick image: ' + error.message);
    }
  };

  const takePhoto = async () => {
    if (!ImagePicker) {
      Alert.alert('Info', 'Camera is initializing. Please try again in a moment.');
      await loadImagePicker();
      if (!ImagePicker) {
        Alert.alert('Info', 'Camera is only available on mobile devices');
        return;
      }
    }

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera permissions');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        uploadImage(result.assets[0]);
      }
    } catch (error) {
      console.log('Take photo error:', error);
      Alert.alert('Error', 'Failed to take photo: ' + error.message);
    }
  };

  const uploadImage = async (asset) => {
    setUploading(true);
    
    // Simulate upload
    setTimeout(() => {
      const newPhoto = {
        id: Date.now(),
        url: asset.uri,
        thumbnail: asset.uri,
        caption: 'New memory',
        album: selectedAlbum,
        date: new Date().toISOString().split('T')[0],
        likes: 0,
        comments: []
      };
      
      setPhotos([newPhoto, ...photos]);
      setUploading(false);
      setShowUpload(false);
      Alert.alert('Success', 'Photo uploaded successfully');
    }, 2000);
  };

  const likePhoto = (photoId) => {
    setPhotos(photos.map(photo => 
      photo.id === photoId 
        ? { ...photo, likes: photo.likes + 1 }
        : photo
    ));
  };

  const addComment = (photoId, comment) => {
    if (!comment.trim()) return;
    
    setPhotos(photos.map(photo =>
      photo.id === photoId
        ? { ...photo, comments: [...photo.comments, { text: comment, date: new Date() }] }
        : photo
    ));
  };

  const filteredPhotos = photos.filter(photo => photo.album === selectedAlbum);

  const renderPhotoItem = ({ item }) => (
    <TouchableOpacity
      style={styles.photoCard}
      onPress={() => setSelectedPhoto(item)}
    >
      <Image source={{ uri: item.thumbnail }} style={styles.photoImage} />
      <View style={[styles.photoOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
        <Text style={styles.photoCaption} numberOfLines={1}>
          {item.caption}
        </Text>
        <View style={styles.photoStats}>
          <Icon name="favorite" size={14} color="#fff" />
          <Text style={styles.statsText}>{item.likes}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Album Header */}
      <View style={[styles.albumHeader, { backgroundColor: theme.colors.surface }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {albums.map((album) => (
            <TouchableOpacity
              key={album}
              style={[
                styles.albumTab,
                selectedAlbum === album && { borderBottomColor: theme.colors.primary, borderBottomWidth: 2 }
              ]}
              onPress={() => setSelectedAlbum(album)}
            >
              <Text style={[
                styles.albumText,
                { color: selectedAlbum === album ? theme.colors.primary : theme.colors.textSecondary }
              ]}>
                {album}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Photo Grid */}
      <FlatList
        data={filteredPhotos}
        renderItem={renderPhotoItem}
        keyExtractor={(item) => item.id.toString()}
        numColumns={3}
        contentContainerStyle={styles.photoGrid}
      />

      {/* Upload FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => setShowUpload(true)}
      >
        <Icon name="add-a-photo" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Upload Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showUpload}
        onRequestClose={() => setShowUpload(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              Add Memory
            </Text>
            
            <TouchableOpacity style={styles.uploadOption} onPress={takePhoto}>
              <Icon name="camera-alt" size={32} color={theme.colors.primary} />
              <Text style={[styles.uploadOptionText, { color: theme.colors.textPrimary }]}>
                Take Photo
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.uploadOption} onPress={pickImage}>
              <Icon name="photo-library" size={32} color={theme.colors.primary} />
              <Text style={[styles.uploadOptionText, { color: theme.colors.textPrimary }]}>
                Choose from Gallery
              </Text>
            </TouchableOpacity>
            
            {uploading && (
              <View style={styles.uploadingIndicator}>
                <Text style={{ color: theme.colors.textPrimary }}>Uploading...</Text>
              </View>
            )}
            
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.error }]}
              onPress={() => setShowUpload(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Photo Viewer Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={!!selectedPhoto}
        onRequestClose={() => setSelectedPhoto(null)}
      >
        <View style={styles.viewerOverlay}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedPhoto(null)}
          >
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
          
          {selectedPhoto && (
            <>
              <Image source={{ uri: selectedPhoto.url }} style={styles.viewerImage} />
              <View style={styles.viewerInfo}>
                <Text style={styles.viewerCaption}>{selectedPhoto.caption}</Text>
                <Text style={styles.viewerDate}>{selectedPhoto.date}</Text>
                <View style={styles.viewerActions}>
                  <TouchableOpacity
                    style={styles.viewerAction}
                    onPress={() => likePhoto(selectedPhoto.id)}
                  >
                    <Icon name="favorite" size={24} color="#EF4444" />
                    <Text style={styles.viewerActionText}>{selectedPhoto.likes}</Text>
                  </TouchableOpacity>
                  
                  <TextInput
                    style={styles.commentInput}
                    placeholder="Add a comment..."
                    placeholderTextColor="#9CA3AF"
                    onSubmitEditing={(e) => {
                      addComment(selectedPhoto.id, e.nativeEvent.text);
                      e.target.value = '';
                    }}
                  />
                </View>
                
                {selectedPhoto.comments && selectedPhoto.comments.map((comment, index) => (
                  <View key={index} style={styles.comment}>
                    <Text style={styles.commentText}>• {comment.text}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  albumHeader: {
    paddingVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  albumTab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 4,
  },
  albumText: {
    fontSize: 16,
  },
  photoGrid: {
    padding: 4,
  },
  photoCard: {
    flex: 1,
    aspectRatio: 1,
    margin: 4,
    position: 'relative',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoCaption: {
    color: '#fff',
    fontSize: 12,
    flex: 1,
  },
  photoStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statsText: {
    color: '#fff',
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    padding: 20,
    borderRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  uploadOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  uploadOptionText: {
    fontSize: 16,
  },
  uploadingIndicator: {
    padding: 16,
    alignItems: 'center',
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  modalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  viewerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 1,
  },
  viewerImage: {
    width: '100%',
    height: '60%',
    resizeMode: 'contain',
  },
  viewerInfo: {
    padding: 20,
  },
  viewerCaption: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  viewerDate: {
    color: '#9CA3AF',
    fontSize: 14,
    marginBottom: 16,
  },
  viewerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  viewerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewerActionText: {
    color: '#fff',
    fontSize: 14,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 8,
    color: '#fff',
    fontSize: 14,
  },
  comment: {
    marginBottom: 8,
  },
  commentText: {
    color: '#D1D5DB',
    fontSize: 14,
  },
});