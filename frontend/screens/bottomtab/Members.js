import React, { useState } from 'react';
import {
    Alert,
    FlatList,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../components/Theme/useTheme';

export default function Members() {
  const { theme } = useTheme();
  const [members, setMembers] = useState([
    { id: 1, name: 'John Smith', birthYear: 1950, generation: 'Grandparents', relationship: 'Grandfather' },
    { id: 2, name: 'Mary Smith', birthYear: 1952, generation: 'Grandparents', relationship: 'Grandmother' },
    { id: 3, name: 'James Smith', birthYear: 1975, generation: 'Parents', relationship: 'Father' },
    { id: 4, name: 'Sarah Smith', birthYear: 1977, generation: 'Parents', relationship: 'Mother' },
    { id: 5, name: 'Emily Smith', birthYear: 2000, generation: 'Children', relationship: 'Daughter' },
    { id: 6, name: 'Michael Smith', birthYear: 2002, generation: 'Children', relationship: 'Son' },
  ]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGeneration, setSelectedGeneration] = useState('All');
  const [selectedMember, setSelectedMember] = useState(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMember, setNewMember] = useState({
    name: '',
    birthYear: '',
    generation: 'Children',
    relationship: ''
  });

  const generations = ['All', 'Grandparents', 'Parents', 'Children'];

  const getFilteredMembers = () => {
    let filtered = members;
    
    if (searchQuery) {
      filtered = filtered.filter(m => 
        m.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedGeneration !== 'All') {
      filtered = filtered.filter(m => m.generation === selectedGeneration);
    }
    
    return filtered;
  };

  const addMember = () => {
    if (!newMember.name || !newMember.birthYear) {
      Alert.alert('Error', 'Please fill in name and birth year');
      return;
    }
    
    const member = {
      id: Date.now(),
      ...newMember,
      birthYear: parseInt(newMember.birthYear),
    };
    
    setMembers([...members, member]);
    setShowAddMember(false);
    setNewMember({
      name: '',
      birthYear: '',
      generation: 'Children',
      relationship: ''
    });
    Alert.alert('Success', 'Member added successfully');
  };

  const deleteMember = (id) => {
    Alert.alert(
      'Delete Member',
      'Are you sure you want to delete this member?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            setMembers(members.filter(m => m.id !== id));
            setSelectedMember(null); // Clear selected member after deletion
          }
        }
      ]
    );
  };

  const renderMemberCard = ({ item }) => (
    <TouchableOpacity
      style={[styles.memberCard, { backgroundColor: theme.colors.surface }]}
      onPress={() => setSelectedMember(item)}
    >
      <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
        <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={[styles.memberName, { color: theme.colors.textPrimary }]}>
          {item.name}
        </Text>
        <Text style={[styles.memberDetails, { color: theme.colors.textSecondary }]}>
          Born: {item.birthYear} • {item.relationship}
        </Text>
      </View>
      <Icon name="chevron-right" size={24} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  const filteredMembers = getFilteredMembers();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]}>
        <Icon name="search" size={20} color={theme.colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.textPrimary }]}
          placeholder="Search members..."
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
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
      <FlatList
        data={filteredMembers}
        renderItem={renderMemberCard}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
      
      {/* Add Member FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => setShowAddMember(true)}
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
                {selectedMember?.name || 'Member'}
              </Text>
              <TouchableOpacity onPress={() => setSelectedMember(null)}>
                <Icon name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.profileInfo}>
              <View style={[styles.profileAvatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.profileAvatarText}>
                  {selectedMember?.name?.charAt(0) || '?'}
                </Text>
              </View>
              
              <View style={styles.profileDetails}>
                <Text style={[styles.profileName, { color: theme.colors.textPrimary }]}>
                  {selectedMember?.name || 'Unknown'}
                </Text>
                <Text style={[styles.profileText, { color: theme.colors.textSecondary }]}>
                  Born: {selectedMember?.birthYear || 'N/A'}
                </Text>
                <Text style={[styles.profileText, { color: theme.colors.textSecondary }]}>
                  {selectedMember?.relationship || 'Family Member'}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={[styles.deleteButton, { backgroundColor: theme.colors.error }]}
              onPress={() => {
                if (selectedMember && selectedMember.id) {
                  deleteMember(selectedMember.id);
                } else {
                  Alert.alert('Error', 'Cannot delete: Member not found');
                  setSelectedMember(null);
                }
              }}
            >
              <Icon name="delete" size={20} color="#fff" />
              <Text style={styles.deleteButtonText}>Delete Member</Text>
            </TouchableOpacity>
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
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              Add Family Member
            </Text>
            
            <TextInput
              style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
              placeholder="Full Name"
              placeholderTextColor={theme.colors.textSecondary}
              value={newMember.name}
              onChangeText={(text) => setNewMember({...newMember, name: text})}
            />
            
            <TextInput
              style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
              placeholder="Birth Year"
              placeholderTextColor={theme.colors.textSecondary}
              value={newMember.birthYear}
              onChangeText={(text) => setNewMember({...newMember, birthYear: text})}
              keyboardType="numeric"
            />
            
            <View style={styles.pickerContainer}>
              <Text style={[styles.pickerLabel, { color: theme.colors.textSecondary }]}>
                Generation
              </Text>
              <View style={styles.generationPicker}>
                {generations.filter(g => g !== 'All').map((gen) => (
                  <TouchableOpacity
                    key={gen}
                    style={[
                      styles.generationOption,
                      newMember.generation === gen && { backgroundColor: theme.colors.primary }
                    ]}
                    onPress={() => setNewMember({...newMember, generation: gen})}
                  >
                    <Text style={[
                      styles.generationText,
                      newMember.generation === gen && { color: '#fff' }
                    ]}>
                      {gen}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <TextInput
              style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
              placeholder="Relationship (e.g., Father, Mother, Son)"
              placeholderTextColor={theme.colors.textSecondary}
              value={newMember.relationship}
              onChangeText={(text) => setNewMember({...newMember, relationship: text})}
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
                onPress={addMember}
              >
                <Text style={styles.modalButtonText}>Add Member</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
    backgroundColor: '#E5E7EB',
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
    fontSize: 14,
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
    borderRadius: 12,
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
    marginBottom: 4,
  },
  profileText: {
    fontSize: 14,
    marginBottom: 2,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
  },
  pickerContainer: {
    marginBottom: 12,
  },
  pickerLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  generationPicker: {
    flexDirection: 'row',
    gap: 8,
  },
  generationOption: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
  },
  generationText: {
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
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
});