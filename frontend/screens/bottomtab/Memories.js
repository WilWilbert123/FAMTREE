// Memories.js - Enhanced with glass morphism and MongoDB integration
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../components/Theme/useTheme';
import { treeService } from '../../services/treeService';

const { width, height } = Dimensions.get('window');

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

export default function Memories({ refreshTrigger, onMemberPress }) {
  const { theme } = useTheme();
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [albums, setAlbums] = useState(['All', 'General', 'Birthdays', 'Weddings', 'Holidays', 'Family Gatherings', 'Vacations']);
  const [selectedAlbum, setSelectedAlbum] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date'); // 'date' or 'likes'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [familyMembers, setFamilyMembers] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [newCaption, setNewCaption] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newAlbum, setNewAlbum] = useState('General');
  const [showCreateAlbum, setShowCreateAlbum] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState('');
  
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadSamplePhotos();
    loadImagePicker();
    loadFamilyMembers();
  }, [refreshTrigger]);

  const loadFamilyMembers = async () => {
    try {
      const savedTreeId = await AsyncStorage.getItem('currentTreeId');
      if (savedTreeId) {
        const response = await treeService.getTree(savedTreeId);
        if (response.success && response.nodes) {
          setFamilyMembers(response.nodes);
        }
      }
    } catch (error) {
      console.error('Error loading family members:', error);
    }
  };

  const checkPermissions = async () => {
    if (Platform.OS === 'web' || !ImagePicker) return;
    
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload photos');
        return false;
      }
      return true;
    } catch (error) {
      console.log('Permission error:', error);
      return false;
    }
  };

  const loadSamplePhotos = () => {
    const samplePhotos = [
      {
        id: 1,
        url: 'https://picsum.photos/id/100/800/600',
        thumbnail: 'https://picsum.photos/id/100/200/200',
        caption: 'Family reunion 2023 at Grandma\'s house',
        album: 'Family Gatherings',
        date: '2023-08-15',
        location: 'Chicago, IL',
        likes: 24,
        comments: [
          { id: 1, text: 'What a beautiful moment!', user: 'Sarah', date: '2023-08-16' },
          { id: 2, text: 'Wish I could have been there!', user: 'Mike', date: '2023-08-17' }
        ],
        taggedMembers: [1, 2, 3],
        isFavorite: true
      },
      {
        id: 2,
        url: 'https://picsum.photos/id/101/800/600',
        thumbnail: 'https://picsum.photos/id/101/200/200',
        caption: 'John\'s 50th Birthday Celebration',
        album: 'Birthdays',
        date: '2023-10-20',
        location: 'Los Angeles, CA',
        likes: 18,
        comments: [],
        taggedMembers: [1],
        isFavorite: false
      },
      {
        id: 3,
        url: 'https://picsum.photos/id/102/800/600',
        thumbnail: 'https://picsum.photos/id/102/200/200',
        caption: 'Wedding Anniversary Dinner',
        album: 'Weddings',
        date: '2023-09-05',
        location: 'Las Vegas, NV',
        likes: 32,
        comments: [{ id: 1, text: 'Congratulations! 🎉', user: 'Family', date: '2023-09-06' }],
        taggedMembers: [2, 3],
        isFavorite: true
      },
      {
        id: 4,
        url: 'https://picsum.photos/id/103/800/600',
        thumbnail: 'https://picsum.photos/id/103/200/200',
        caption: 'Christmas Morning 2023',
        album: 'Holidays',
        date: '2023-12-25',
        location: 'New York, NY',
        likes: 45,
        comments: [
          { id: 1, text: 'Merry Christmas! 🎄', user: 'Grandma', date: '2023-12-25' },
          { id: 2, text: 'What wonderful memories!', user: 'Aunt Mary', date: '2023-12-26' }
        ],
        taggedMembers: [1, 2, 3],
        isFavorite: true
      },
      {
        id: 5,
        url: 'https://picsum.photos/id/104/800/600',
        thumbnail: 'https://picsum.photos/id/104/200/200',
        caption: 'Summer Vacation at the Beach',
        album: 'Vacations',
        date: '2023-07-10',
        location: 'Miami, FL',
        likes: 29,
        comments: [],
        taggedMembers: [1, 2],
        isFavorite: false
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
      const hasPermission = await checkPermissions();
      if (!hasPermission) return;
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.9,
        base64: true,
      });

      if (!result.canceled) {
        setShowUpload(true);
        // Store the selected image temporarily
        setNewCaption('');
        setNewLocation('');
        setNewDate(new Date().toISOString().split('T')[0]);
        setNewAlbum('General');
        setSelectedMembers([]);
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
        quality: 0.9,
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
    
    // Simulate upload to server
    setTimeout(() => {
      const newPhoto = {
        id: Date.now(),
        url: asset.uri,
        thumbnail: asset.uri,
        caption: newCaption || 'Family memory',
        album: newAlbum,
        date: newDate,
        location: newLocation,
        likes: 0,
        comments: [],
        taggedMembers: selectedMembers,
        isFavorite: false
      };
      
      setPhotos([newPhoto, ...photos]);
      setUploading(false);
      setShowUpload(false);
      Alert.alert('Success', 'Photo uploaded successfully');
    }, 2000);
  };

  const likePhoto = (photoId) => {
    animateAndUpdate(() => {
      setPhotos(photos.map(photo => 
        photo.id === photoId 
          ? { ...photo, likes: photo.likes + 1 }
          : photo
      ));
    });
  };

  const toggleFavorite = (photoId) => {
    animateAndUpdate(() => {
      setPhotos(photos.map(photo =>
        photo.id === photoId
          ? { ...photo, isFavorite: !photo.isFavorite }
          : photo
      ));
    });
  };

  const addComment = (photoId, commentText) => {
    if (!commentText.trim()) return;
    
    animateAndUpdate(() => {
      setPhotos(photos.map(photo =>
        photo.id === photoId
          ? { 
              ...photo, 
              comments: [...photo.comments, { 
                id: Date.now(), 
                text: commentText, 
                user: 'You', 
                date: new Date().toISOString().split('T')[0] 
              }] 
            }
          : photo
      ));
    });
  };

  const deletePhoto = (photoId) => {
    Alert.alert(
      'Delete Memory',
      'Are you sure you want to delete this photo? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: () => {
            animateAndUpdate(() => {
              setPhotos(photos.filter(photo => photo.id !== photoId));
              setSelectedPhoto(null);
            });
          }
        }
      ]
    );
  };

  const sharePhoto = async (photo) => {
    try {
      await Share.share({
        message: `${photo.caption}\nShared from Family Tree App`,
        url: photo.url,
        title: 'Share Family Memory',
      });
    } catch (error) {
      console.log('Share error:', error);
    }
  };

  const createNewAlbum = () => {
    if (newAlbumName.trim()) {
      setAlbums([...albums, newAlbumName.trim()]);
      setNewAlbumName('');
      setShowCreateAlbum(false);
      Alert.alert('Success', `Album "${newAlbumName}" created`);
    }
  };

  const animateAndUpdate = (callback) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0.7,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 0.98,
        friction: 3,
        useNativeDriver: true,
      })
    ]).start(() => {
      callback();
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        })
      ]).start();
    });
  };

  const getFilteredPhotos = () => {
    let filtered = [...photos];
    
    // Filter by album
    if (selectedAlbum !== 'All') {
      filtered = filtered.filter(photo => photo.album === selectedAlbum);
    }
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(photo => 
        photo.caption.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (photo.location && photo.location.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Sort
    if (sortBy === 'date') {
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (sortBy === 'likes') {
      filtered.sort((a, b) => b.likes - a.likes);
    }
    
    return filtered;
  };

  const getMemberName = (memberId) => {
    const member = familyMembers.find(m => m.id === memberId);
    return member ? member.name : '';
  };

  const renderPhotoGridItem = ({ item, index }) => {
    const inputRange = [-1, 0, index * 100, (index + 1) * 100];
    const scale = scrollY.interpolate({
      inputRange,
      outputRange: [1, 1, 0.95, 1],
      extrapolate: 'clamp',
    });
    
    return (
      <Animated.View style={[styles.gridItemContainer, { transform: [{ scale }] }]}>
        <TouchableOpacity
          style={styles.photoCard}
          onPress={() => setSelectedPhoto(item)}
          activeOpacity={0.9}
        >
          <Image source={{ uri: item.thumbnail || item.url }} style={styles.photoImage} />
          <View style={[styles.photoOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
            <Text style={styles.photoCaption} numberOfLines={1}>
              {item.caption}
            </Text>
            <View style={styles.photoStats}>
              {item.isFavorite && <Icon name="star" size={12} color="#FFD700" />}
              <Icon name="favorite" size={12} color="#EF4444" />
              <Text style={styles.statsText}>{item.likes}</Text>
              <Icon name="comment" size={12} color="#fff" />
              <Text style={styles.statsText}>{item.comments.length}</Text>
            </View>
          </View>
          {item.isFavorite && (
            <View style={styles.favoriteBadge}>
              <Icon name="star" size={16} color="#FFD700" />
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderPhotoListItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.listItem, { backgroundColor: theme.colors.surface }]}
      onPress={() => setSelectedPhoto(item)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.thumbnail || item.url }} style={styles.listItemImage} />
      <View style={styles.listItemContent}>
        <Text style={[styles.listItemTitle, { color: theme.colors.textPrimary }]} numberOfLines={1}>
          {item.caption}
        </Text>
        <View style={styles.listItemMeta}>
          <Icon name="event" size={12} color={theme.colors.textSecondary} />
          <Text style={[styles.listItemDate, { color: theme.colors.textSecondary }]}>
            {new Date(item.date).toLocaleDateString()}
          </Text>
        </View>
        {item.location && (
          <View style={styles.listItemMeta}>
            <Icon name="location-on" size={12} color={theme.colors.textSecondary} />
            <Text style={[styles.listItemLocation, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {item.location}
            </Text>
          </View>
        )}
        <View style={styles.listItemStats}>
          <View style={styles.listItemStat}>
            <Icon name="favorite" size={14} color="#EF4444" />
            <Text style={[styles.listItemStatText, { color: theme.colors.textSecondary }]}>
              {item.likes}
            </Text>
          </View>
          <View style={styles.listItemStat}>
            <Icon name="comment" size={14} color={theme.colors.textSecondary} />
            <Text style={[styles.listItemStatText, { color: theme.colors.textSecondary }]}>
              {item.comments.length}
            </Text>
          </View>
          {item.isFavorite && (
            <View style={styles.listItemStat}>
              <Icon name="star" size={14} color="#FFD700" />
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  const filteredPhotos = getFilteredPhotos();

  return (
    <Animated.View 
      style={[
        styles.container, 
        { backgroundColor: theme.colors.background },
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
      ]}
    >
      {/* Header Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
          <Icon name="photo-library" size={24} color="#FFD700" />
          <Text style={[styles.statNumber, { color: theme.colors.textPrimary }]}>
            {photos.length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Total Photos
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
          <Icon name="favorite" size={24} color="#EF4444" />
          <Text style={[styles.statNumber, { color: theme.colors.textPrimary }]}>
            {photos.reduce((sum, photo) => sum + photo.likes, 0)}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Total Likes
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
          <Icon name="star" size={24} color="#FFD700" />
          <Text style={[styles.statNumber, { color: theme.colors.textPrimary }]}>
            {photos.filter(p => p.isFavorite).length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Favorites
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Icon name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            placeholder="Search memories..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery !== '' && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

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
          <TouchableOpacity
            style={[styles.albumTab, styles.addAlbumTab]}
            onPress={() => setShowCreateAlbum(true)}
          >
            <Icon name="add" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </ScrollView>
        
        {/* View Mode Toggle */}
        <View style={styles.viewModeToggle}>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'grid' && styles.viewModeActive]}
            onPress={() => setViewMode('grid')}
          >
            <Icon name="grid-on" size={20} color={viewMode === 'grid' ? '#FFD700' : theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewModeButton, viewMode === 'list' && styles.viewModeActive]}
            onPress={() => setViewMode('list')}
          >
            <Icon name="list" size={20} color={viewMode === 'list' ? '#FFD700' : theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.viewModeButton}
            onPress={() => setSortBy(sortBy === 'date' ? 'likes' : 'date')}
          >
            <Icon name={sortBy === 'date' ? 'sort-by-date' : 'sort-by-alpha'} size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Photo Grid/List */}
      {filteredPhotos.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="photo-library" size={80} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
            No memories yet
          </Text>
          <Text style={[styles.emptyStateSubText, { color: theme.colors.textSecondary }]}>
            {searchQuery ? 'Try a different search' : 'Tap the + button to add your first memory'}
          </Text>
        </View>
      ) : viewMode === 'grid' ? (
        <Animated.FlatList
          data={filteredPhotos}
          renderItem={renderPhotoGridItem}
          keyExtractor={(item) => item.id.toString()}
          numColumns={3}
          contentContainerStyle={styles.photoGrid}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true }
          )}
          scrollEventThrottle={16}
        />
      ) : (
        <FlatList
          data={filteredPhotos}
          renderItem={renderPhotoListItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {/* Upload FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={pickImage}
        activeOpacity={0.8}
      >
        <Icon name="add-a-photo" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Create Album Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showCreateAlbum}
        onRequestClose={() => setShowCreateAlbum(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              Create New Album
            </Text>
            
            <TextInput
              style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
              placeholder="Album Name"
              placeholderTextColor={theme.colors.textSecondary}
              value={newAlbumName}
              onChangeText={setNewAlbumName}
              autoFocus
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.error }]}
                onPress={() => setShowCreateAlbum(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                onPress={createNewAlbum}
              >
                <Text style={styles.modalButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Upload Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showUpload}
        onRequestClose={() => setShowUpload(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, maxHeight: '80%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                Add New Memory
              </Text>
              
              <TextInput
                style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                placeholder="Caption *"
                placeholderTextColor={theme.colors.textSecondary}
                value={newCaption}
                onChangeText={setNewCaption}
              />
              
              <TextInput
                style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                placeholder="Location"
                placeholderTextColor={theme.colors.textSecondary}
                value={newLocation}
                onChangeText={setNewLocation}
              />
              
              <TextInput
                style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                placeholder="Date (YYYY-MM-DD)"
                placeholderTextColor={theme.colors.textSecondary}
                value={newDate}
                onChangeText={setNewDate}
              />
              
              <Text style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>
                Album
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.albumScroll}>
                {albums.filter(a => a !== 'All').map(album => (
                  <TouchableOpacity
                    key={album}
                    style={[
                      styles.albumOption,
                      newAlbum === album && { backgroundColor: theme.colors.primary }
                    ]}
                    onPress={() => setNewAlbum(album)}
                  >
                    <Text style={[
                      styles.albumOptionText,
                      newAlbum === album && { color: '#fff' }
                    ]}>
                      {album}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <Text style={[styles.sectionLabel, { color: theme.colors.textPrimary }]}>
                Tag Family Members
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberScroll}>
                {familyMembers.map(member => (
                  <TouchableOpacity
                    key={member.id}
                    style={[
                      styles.memberTag,
                      selectedMembers.includes(member.id) && { backgroundColor: theme.colors.primary }
                    ]}
                    onPress={() => {
                      if (selectedMembers.includes(member.id)) {
                        setSelectedMembers(selectedMembers.filter(id => id !== member.id));
                      } else {
                        setSelectedMembers([...selectedMembers, member.id]);
                      }
                    }}
                  >
                    {member.image ? (
                      <Image source={{ uri: member.image }} style={styles.memberTagImage} />
                    ) : (
                      <View style={styles.memberTagAvatar}>
                        <Text style={styles.memberTagInitial}>
                          {member.name?.charAt(0) || '?'}
                        </Text>
                      </View>
                    )}
                    <Text style={[
                      styles.memberTagText,
                      selectedMembers.includes(member.id) && { color: '#fff' }
                    ]}>
                      {member.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              {uploading && (
                <View style={styles.uploadingIndicator}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={{ color: theme.colors.textPrimary, marginTop: 8 }}>Uploading...</Text>
                </View>
              )}
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: theme.colors.error }]}
                  onPress={() => setShowUpload(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => uploadImage({ uri: 'placeholder' })}
                  disabled={uploading}
                >
                  <Text style={styles.modalButtonText}>Upload</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
          
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => deletePhoto(selectedPhoto.id)}
          >
            <Icon name="delete" size={24} color="#fff" />
          </TouchableOpacity>
          
          {selectedPhoto && (
            <>
              <Image source={{ uri: selectedPhoto.url }} style={styles.viewerImage} resizeMode="contain" />
              <View style={styles.viewerInfo}>
                <Text style={styles.viewerCaption}>{selectedPhoto.caption}</Text>
                <View style={styles.viewerMeta}>
                  <View style={styles.viewerMetaItem}>
                    <Icon name="event" size={14} color="#FFD700" />
                    <Text style={styles.viewerDate}>
                      {new Date(selectedPhoto.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Text>
                  </View>
                  {selectedPhoto.location && (
                    <View style={styles.viewerMetaItem}>
                      <Icon name="location-on" size={14} color="#FFD700" />
                      <Text style={styles.viewerDate}>{selectedPhoto.location}</Text>
                    </View>
                  )}
                </View>
                
                {selectedPhoto.taggedMembers && selectedPhoto.taggedMembers.length > 0 && (
                  <View style={styles.taggedContainer}>
                    <Text style={styles.taggedLabel}>Tagged:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {selectedPhoto.taggedMembers.map(memberId => (
                        <TouchableOpacity
                          key={memberId}
                          style={styles.taggedMember}
                          onPress={() => {
                            setSelectedPhoto(null);
                            onMemberPress && onMemberPress(memberId);
                          }}
                        >
                          <Text style={styles.taggedMemberText}>
                            {getMemberName(memberId)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
                
                <View style={styles.viewerActions}>
                  <TouchableOpacity
                    style={styles.viewerAction}
                    onPress={() => likePhoto(selectedPhoto.id)}
                  >
                    <Icon name="favorite" size={28} color="#EF4444" />
                    <Text style={styles.viewerActionText}>{selectedPhoto.likes}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.viewerAction}
                    onPress={() => toggleFavorite(selectedPhoto.id)}
                  >
                    <Icon 
                      name={selectedPhoto.isFavorite ? "star" : "star-border"} 
                      size={28} 
                      color="#FFD700" 
                    />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.viewerAction}
                    onPress={() => sharePhoto(selectedPhoto)}
                  >
                    <Icon name="share" size={28} color="#fff" />
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
                
                {selectedPhoto.comments && selectedPhoto.comments.length > 0 && (
                  <ScrollView style={styles.commentsList}>
                    {selectedPhoto.comments.map((comment) => (
                      <View key={comment.id} style={styles.comment}>
                        <Text style={styles.commentUser}>{comment.user}</Text>
                        <Text style={styles.commentText}>{comment.text}</Text>
                        <Text style={styles.commentDate}>{comment.date}</Text>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            </>
          )}
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  searchSection: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  albumHeader: {
    paddingVertical: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  albumTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
  },
  addAlbumTab: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumText: {
    fontSize: 14,
  },
  viewModeToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  viewModeButton: {
    padding: 8,
    borderRadius: 8,
  },
  viewModeActive: {
    backgroundColor: 'rgba(255,215,0,0.2)',
  },
  photoGrid: {
    padding: 4,
  },
  gridItemContainer: {
    flex: 1,
    margin: 4,
  },
  photoCard: {
    flex: 1,
    aspectRatio: 1,
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  photoCaption: {
    color: '#fff',
    fontSize: 11,
    flex: 1,
  },
  photoStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statsText: {
    color: '#fff',
    fontSize: 10,
  },
  favoriteBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    padding: 4,
  },
  listContainer: {
    padding: 16,
    gap: 12,
  },
  listItem: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  listItemImage: {
    width: 80,
    height: 80,
  },
  listItemContent: {
    flex: 1,
    padding: 12,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  listItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  listItemDate: {
    fontSize: 11,
  },
  listItemLocation: {
    fontSize: 11,
  },
  listItemStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  listItemStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  listItemStatText: {
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
    width: '90%',
    padding: 20,
    borderRadius: 16,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 8,
  },
  albumScroll: {
    flexGrow: 0,
    marginBottom: 12,
  },
  albumOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginRight: 8,
  },
  albumOptionText: {
    fontSize: 12,
    color: '#fff',
  },
  memberScroll: {
    flexGrow: 0,
    marginBottom: 12,
  },
  memberTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginRight: 8,
    gap: 6,
  },
  memberTagImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  memberTagAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,215,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberTagInitial: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  memberTagText: {
    fontSize: 12,
    color: '#fff',
  },
  uploadingIndicator: {
    alignItems: 'center',
    padding: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  deleteButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1,
    backgroundColor: 'rgba(239,68,68,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  viewerImage: {
    width: width,
    height: height * 0.5,
  },
  viewerInfo: {
    padding: 20,
  },
  viewerCaption: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  viewerMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  viewerMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  viewerDate: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  taggedContainer: {
    marginBottom: 16,
  },
  taggedLabel: {
    color: '#FFD700',
    fontSize: 12,
    marginBottom: 6,
  },
  taggedMember: {
    backgroundColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
    marginRight: 8,
  },
  taggedMemberText: {
    color: '#FFD700',
    fontSize: 12,
  },
  viewerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  viewerAction: {
    alignItems: 'center',
    gap: 4,
  },
  viewerActionText: {
    color: '#fff',
    fontSize: 12,
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 10,
    color: '#fff',
    fontSize: 14,
  },
  commentsList: {
    maxHeight: 200,
  },
  comment: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
  },
  commentUser: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  commentText: {
    color: '#D1D5DB',
    fontSize: 13,
    marginBottom: 2,
  },
  commentDate: {
    color: '#6B7280',
    fontSize: 10,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubText: {
    fontSize: 14,
    textAlign: 'center',
  },
});