// Members.js - Enhanced with MongoDB integration and glass morphism design
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '../../components/Theme/useTheme';
import { treeService } from '../../services/treeService';

export default function Members({ onMemberPress, refreshTrigger }) {
  const { theme } = useTheme();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.auth);
  
  const [members, setMembers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGeneration, setSelectedGeneration] = useState('All');
  const [selectedMember, setSelectedMember] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [currentTreeId, setCurrentTreeId] = useState(null);
  const [statistics, setStatistics] = useState({});
  const [newMember, setNewMember] = useState({
    name: '',
    birthYear: '',
    deathYear: '',
    gender: 'male',
    location: '',
    generation: 'Children',
    relationship: '',
    image: null
  });

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const generations = ['All', 'Grandparents', 'Parents', 'Children', 'Great Grandparents'];

  useEffect(() => {
    loadMembers();
  }, [refreshTrigger]);

  useEffect(() => {
    filterMembers();
  }, [searchQuery, selectedGeneration, members]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const savedTreeId = await AsyncStorage.getItem('currentTreeId');
      
      if (savedTreeId) {
        setCurrentTreeId(savedTreeId);
        const response = await treeService.getTree(savedTreeId);
        
        if (response.success && response.nodes) {
          // Transform nodes to members format
          const membersList = response.nodes.map(node => ({
            id: node.id,
            name: node.name,
            birthYear: node.birthYear,
            deathYear: node.deathYear,
            gender: node.gender,
            location: node.location,
            image: node.image,
            generation: determineGeneration(node.birthYear),
            relationship: determineRelationship(node),
            parents: node.parents,
            spouse: node.spouse,
            children: node.children
          }));
          
          setMembers(membersList);
          
          // Calculate statistics
          const stats = calculateStatistics(membersList);
          setStatistics(stats);
        }
      }
    } catch (error) {
      console.error('Error loading members:', error);
      Alert.alert('Error', 'Failed to load family members');
    } finally {
      setLoading(false);
    }
  };

  const determineGeneration = (birthYear) => {
    if (!birthYear) return 'Children';
    const year = parseInt(birthYear);
    const currentYear = new Date().getFullYear();
    
    if (year <= currentYear - 50) return 'Grandparents';
    if (year <= currentYear - 25) return 'Parents';
    return 'Children';
  };

  const determineRelationship = (member) => {
    if (member.gender === 'male') {
      if (member.children && member.children.length > 0) return 'Father';
      return 'Son';
    } else {
      if (member.children && member.children.length > 0) return 'Mother';
      return 'Daughter';
    }
  };

  const calculateStatistics = (membersList) => {
    const totalMembers = membersList.length;
    const maleCount = membersList.filter(m => m.gender === 'male').length;
    const femaleCount = membersList.filter(m => m.gender === 'female').length;
    const birthYears = membersList.filter(m => m.birthYear).map(m => parseInt(m.birthYear));
    const deathYears = membersList.filter(m => m.deathYear).map(m => parseInt(m.deathYear));
    
    return {
      total: totalMembers,
      male: maleCount,
      female: femaleCount,
      oldest: birthYears.length > 0 ? Math.min(...birthYears) : null,
      youngest: birthYears.length > 0 ? Math.max(...birthYears) : null,
      averageAge: calculateAverageAge(membersList)
    };
  };

  const calculateAverageAge = (membersList) => {
    const ages = membersList
      .filter(m => m.birthYear)
      .map(m => {
        const birthYear = parseInt(m.birthYear);
        const deathYear = m.deathYear ? parseInt(m.deathYear) : new Date().getFullYear();
        return deathYear - birthYear;
      });
    
    if (ages.length === 0) return 0;
    const sum = ages.reduce((a, b) => a + b, 0);
    return Math.round(sum / ages.length);
  };

  const filterMembers = () => {
    let filtered = [...members];
    
    if (searchQuery) {
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (m.location && m.location.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    if (selectedGeneration !== 'All') {
      filtered = filtered.filter(m => m.generation === selectedGeneration);
    }
    
    setFilteredMembers(filtered);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMembers();
    setRefreshing(false);
  }, []);

  const addMemberToTree = async () => {
    if (!newMember.name) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    if (!newMember.birthYear) {
      Alert.alert('Error', 'Please enter birth year');
      return;
    }

    const memberData = {
      name: newMember.name,
      birthDate: newMember.birthYear ? new Date(parseInt(newMember.birthYear), 0, 1).toISOString() : null,
      deathDate: newMember.deathYear ? new Date(parseInt(newMember.deathYear), 0, 1).toISOString() : null,
      gender: newMember.gender,
      bio: newMember.location || '',
      avatar: newMember.image,
      treeId: currentTreeId,
      parents: [],
      spouse: null
    };

    try {
      const response = await treeService.addMember(memberData);
      
      if (response.success) {
        await loadMembers();
        setShowAddMember(false);
        resetForm();
        Alert.alert('Success', `${newMember.name} added to family tree`);
      } else {
        Alert.alert('Error', response.error || 'Failed to add member');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add member');
    }
  };

  const resetForm = () => {
    setNewMember({
      name: '',
      birthYear: '',
      deathYear: '',
      gender: 'male',
      location: '',
      generation: 'Children',
      relationship: '',
      image: null
    });
  };

  const deleteMemberFromTree = async (memberId) => {
    Alert.alert(
      'Delete Member',
      'Are you sure you want to delete this member? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await treeService.deleteMember(memberId);
              if (response.success) {
                await loadMembers();
                setSelectedMember(null);
                Alert.alert('Success', 'Member deleted successfully');
              } else {
                Alert.alert('Error', response.error || 'Failed to delete member');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete member');
            }
          }
        }
      ]
    );
  };

  const animateAndUpdate = (callback) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0.5,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 0.95,
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

  const getInitials = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  const getGenderColor = (gender) => {
    return gender === 'male' ? '#4A90E2' : '#FF69B4';
  };

  const renderMemberCard = ({ item, index }) => {
    const inputRange = [-1, 0, index * 100, (index + 1) * 100];
    const scale = fadeAnim.interpolate({
      inputRange,
      outputRange: [1, 1, 0.98, 1],
      extrapolate: 'clamp',
    });

    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          style={[styles.memberCard, { backgroundColor: theme.colors.surface }]}
          onPress={() => {
            setSelectedMember(item);
            if (onMemberPress) onMemberPress(item.id);
          }}
          activeOpacity={0.8}
        >
          <View style={[styles.avatarPlaceholder, { backgroundColor: getGenderColor(item.gender) }]}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
            )}
          </View>
          
          <View style={styles.memberInfo}>
            <Text style={[styles.memberName, { color: theme.colors.textPrimary }]}>
              {item.name}
            </Text>
            <View style={styles.memberDetails}>
              <View style={styles.detailBadge}>
                <Icon name="cake" size={12} color={theme.colors.textSecondary} />
                <Text style={[styles.detailText, { color: theme.colors.textSecondary }]}>
                  {item.birthYear || '?'}
                  {item.deathYear ? ` - ${item.deathYear}` : ''}
                </Text>
              </View>
              {item.location && (
                <View style={styles.detailBadge}>
                  <Icon name="location-on" size={12} color={theme.colors.textSecondary} />
                  <Text style={[styles.detailText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                    {item.location}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.relationshipBadge}>
              <Text style={styles.relationshipText}>{item.relationship}</Text>
            </View>
          </View>
          
          <Icon name="chevron-right" size={24} color={theme.colors.textSecondary} />
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading && members.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textPrimary }]}>
          Loading family members...
        </Text>
      </View>
    );
  }

  return (
    <Animated.View 
      style={[
        styles.container, 
        { backgroundColor: theme.colors.background },
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
      ]}
    >
      {/* Statistics Header */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
          <Icon name="people" size={24} color="#FFD700" />
          <Text style={[styles.statNumber, { color: theme.colors.textPrimary }]}>
            {statistics.total || 0}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Total Members
          </Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
          <Icon name="male" size={24} color="#4A90E2" />
          <Text style={[styles.statNumber, { color: theme.colors.textPrimary }]}>
            {statistics.male || 0}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Male
          </Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
          <Icon name="female" size={24} color="#FF69B4" />
          <Text style={[styles.statNumber, { color: theme.colors.textPrimary }]}>
            {statistics.female || 0}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Female
          </Text>
        </View>
        
        <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
          <Icon name="timeline" size={24} color="#FFD700" />
          <Text style={[styles.statNumber, { color: theme.colors.textPrimary }]}>
            {statistics.averageAge || 0}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Avg. Age
          </Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Icon name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            placeholder="Search members..."
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
      
      {/* Generation Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        {generations.map((gen) => (
          <TouchableOpacity
            key={gen}
            style={[
              styles.filterChip,
              selectedGeneration === gen && { backgroundColor: theme.colors.primary }
            ]}
            onPress={() => setSelectedGeneration(gen)}
          >
            <Text style={[
              styles.filterText,
              selectedGeneration === gen && { color: '#fff' }
            ]}>
              {gen}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      
      {/* Members List */}
      {filteredMembers.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="people-outline" size={80} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
            No members found
          </Text>
          <Text style={[styles.emptyStateSubText, { color: theme.colors.textSecondary }]}>
            {searchQuery ? 'Try a different search' : 'Tap the + button to add family members'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredMembers}
          renderItem={renderMemberCard}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
      
      {/* Add Member FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => setShowAddMember(true)}
        activeOpacity={0.8}
      >
        <Icon name="add" size={24} color="#fff" />
      </TouchableOpacity>
      
      {/* Member Profile Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={!!selectedMember}
        onRequestClose={() => setSelectedMember(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                Member Profile
              </Text>
              <TouchableOpacity onPress={() => setSelectedMember(null)}>
                <Icon name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {selectedMember && (
              <>
                <View style={styles.profileInfo}>
                  <View style={[styles.profileAvatarPlaceholder, { backgroundColor: getGenderColor(selectedMember.gender) }]}>
                    {selectedMember.image ? (
                      <Image source={{ uri: selectedMember.image }} style={styles.profileAvatarImage} />
                    ) : (
                      <Text style={styles.profileAvatarText}>
                        {getInitials(selectedMember.name)}
                      </Text>
                    )}
                  </View>
                  
                  <View style={styles.profileDetails}>
                    <Text style={[styles.profileName, { color: theme.colors.textPrimary }]}>
                      {selectedMember.name}
                    </Text>
                    <View style={styles.profileMeta}>
                      <Icon name="wc" size={14} color={theme.colors.textSecondary} />
                      <Text style={[styles.profileText, { color: theme.colors.textSecondary }]}>
                        {selectedMember.gender === 'male' ? 'Male' : 'Female'}
                      </Text>
                    </View>
                    <View style={styles.profileMeta}>
                      <Icon name="cake" size={14} color={theme.colors.textSecondary} />
                      <Text style={[styles.profileText, { color: theme.colors.textSecondary }]}>
                        Born: {selectedMember.birthYear || 'Unknown'}
                        {selectedMember.deathYear ? ` - Died: ${selectedMember.deathYear}` : ''}
                      </Text>
                    </View>
                    {selectedMember.location && (
                      <View style={styles.profileMeta}>
                        <Icon name="location-on" size={14} color={theme.colors.textSecondary} />
                        <Text style={[styles.profileText, { color: theme.colors.textSecondary }]}>
                          {selectedMember.location}
                        </Text>
                      </View>
                    )}
                    <View style={[styles.profileBadge, { backgroundColor: getGenderColor(selectedMember.gender) + '20' }]}>
                      <Text style={[styles.profileBadgeText, { color: getGenderColor(selectedMember.gender) }]}>
                        {selectedMember.relationship}
                      </Text>
                    </View>
                  </View>
                </View>
                
                {/* Family Relations */}
                <View style={styles.familyRelations}>
                  <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
                    Family Relations
                  </Text>
                  
                  {selectedMember.spouse && (
                    <TouchableOpacity 
                      style={styles.relationRow}
                      onPress={() => {
                        const spouse = members.find(m => m.id === selectedMember.spouse);
                        if (spouse) setSelectedMember(spouse);
                      }}
                    >
                      <Icon name="favorite" size={20} color="#E91E63" />
                      <Text style={[styles.relationText, { color: theme.colors.textPrimary }]}>
                        Spouse: {members.find(m => m.id === selectedMember.spouse)?.name || 'Unknown'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  
                  {selectedMember.children && selectedMember.children.length > 0 && (
                    <View style={styles.relationSection}>
                      <Text style={[styles.subsectionTitle, { color: theme.colors.textSecondary }]}>
                        Children ({selectedMember.children.length})
                      </Text>
                      {selectedMember.children.map(childId => {
                        const child = members.find(m => m.id === childId);
                        return child ? (
                          <TouchableOpacity
                            key={childId}
                            style={styles.childRow}
                            onPress={() => setSelectedMember(child)}
                          >
                            <View style={styles.childAvatar}>
                              <Text style={styles.childInitial}>{getInitials(child.name)}</Text>
                            </View>
                            <Text style={[styles.childName, { color: theme.colors.textPrimary }]}>
                              {child.name}
                            </Text>
                          </TouchableOpacity>
                        ) : null;
                      })}
                    </View>
                  )}
                </View>
                
                <TouchableOpacity
                  style={[styles.viewTreeButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => {
                    setSelectedMember(null);
                    if (onMemberPress) onMemberPress(selectedMember.id);
                  }}
                >
                  <Icon name="account-tree" size={20} color="#fff" />
                  <Text style={styles.viewTreeButtonText}>View in Family Tree</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.deleteButton, { backgroundColor: theme.colors.error }]}
                  onPress={() => deleteMemberFromTree(selectedMember.id)}
                >
                  <Icon name="delete" size={20} color="#fff" />
                  <Text style={styles.deleteButtonText}>Delete Member</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Add Member Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAddMember}
        onRequestClose={() => setShowAddMember(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface, maxHeight: '80%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                Add Family Member
              </Text>
              
              <TextInput
                style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                placeholder="Full Name *"
                placeholderTextColor={theme.colors.textSecondary}
                value={newMember.name}
                onChangeText={(text) => setNewMember({...newMember, name: text})}
              />
              
              <View style={styles.dateRow}>
                <TextInput
                  style={[styles.input, styles.halfInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                  placeholder="Birth Year *"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={newMember.birthYear}
                  onChangeText={(text) => setNewMember({...newMember, birthYear: text})}
                  keyboardType="numeric"
                />
                
                <TextInput
                  style={[styles.input, styles.halfInput, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                  placeholder="Death Year"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={newMember.deathYear}
                  onChangeText={(text) => setNewMember({...newMember, deathYear: text})}
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.genderSelector}>
                <TouchableOpacity
                  style={[
                    styles.genderOption,
                    newMember.gender === 'male' && styles.genderOptionActive
                  ]}
                  onPress={() => setNewMember({...newMember, gender: 'male'})}
                >
                  <Icon name="male" size={24} color={newMember.gender === 'male' ? '#fff' : theme.colors.textSecondary} />
                  <Text style={[styles.genderText, newMember.gender === 'male' && { color: '#fff' }]}>Male</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.genderOption,
                    newMember.gender === 'female' && styles.genderOptionActive
                  ]}
                  onPress={() => setNewMember({...newMember, gender: 'female'})}
                >
                  <Icon name="female" size={24} color={newMember.gender === 'female' ? '#fff' : theme.colors.textSecondary} />
                  <Text style={[styles.genderText, newMember.gender === 'female' && { color: '#fff' }]}>Female</Text>
                </TouchableOpacity>
              </View>
              
              <TextInput
                style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                placeholder="Location"
                placeholderTextColor={theme.colors.textSecondary}
                value={newMember.location}
                onChangeText={(text) => setNewMember({...newMember, location: text})}
              />
              
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: theme.colors.error }]}
                  onPress={() => setShowAddMember(false)}
                >
                  <Text style={styles.modalButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                  onPress={addMemberToTree}
                >
                  <Text style={styles.modalButtonText}>Add Member</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
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
    fontSize: 18,
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
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  filterText: {
    fontSize: 14,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  memberDetails: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  detailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
  },
  relationshipBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(255,215,0,0.2)',
  },
  relationshipText: {
    fontSize: 10,
    color: '#FFD700',
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  profileInfo: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  profileAvatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  profileAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  profileAvatarText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  profileMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  profileText: {
    fontSize: 13,
  },
  profileBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
    marginTop: 6,
  },
  profileBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  familyRelations: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  relationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    marginBottom: 8,
  },
  relationText: {
    fontSize: 14,
    flex: 1,
  },
  relationSection: {
    marginTop: 8,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    marginBottom: 6,
  },
  childAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(74,144,226,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  childInitial: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  childName: {
    fontSize: 14,
  },
  viewTreeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 10,
  },
  viewTreeButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  genderSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  genderOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    gap: 8,
  },
  genderOptionActive: {
    backgroundColor: '#FFD700',
  },
  genderText: {
    fontSize: 16,
    color: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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