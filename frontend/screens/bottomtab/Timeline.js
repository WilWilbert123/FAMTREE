import React, { useState } from 'react';
import {
    Alert,
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

export default function Timeline() {
  const { theme } = useTheme();
  const [events, setEvents] = useState([
    { id: 1, title: 'John Smith born', date: '1950-03-15', year: 1950, type: 'Birth', description: 'First child of the Smith family' },
    { id: 2, title: 'Mary Johnson born', date: '1952-07-22', year: 1952, type: 'Birth', description: 'Born in New York' },
    { id: 3, title: 'Wedding of John and Mary', date: '1974-06-10', year: 1974, type: 'Marriage', description: 'Beautiful ceremony' },
    { id: 4, title: 'James Smith born', date: '1975-12-01', year: 1975, type: 'Birth', description: 'First son' },
    { id: 5, title: 'Family moved to California', date: '1980-08-15', year: 1980, type: 'Custom', description: 'Relocated for work' },
    { id: 6, title: 'Grandparents 50th Anniversary', date: '2000-06-10', year: 2000, type: 'Anniversary', description: 'Golden anniversary celebration' },
  ]);
  
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedYear, setSelectedYear] = useState(null);
  const [newEvent, setNewEvent] = useState({ 
    title: '', 
    date: '', 
    type: 'Birth', 
    description: '' 
  });

  const getEventColor = (type) => {
    const colors = { 
      Birth: '#10B981', 
      Marriage: '#F59E0B', 
      Anniversary: '#8B5CF6', 
      Death: '#EF4444', 
      Custom: '#3B82F6' 
    };
    return colors[type] || colors.Custom;
  };

  const getEventIcon = (type) => {
    const icons = { 
      Birth: 'child-care', 
      Marriage: 'favorite', 
      Anniversary: 'cake', 
      Death: 'sentiment-very-dissatisfied', 
      Custom: 'event' 
    };
    return icons[type] || icons.Custom;
  };

  const groupEventsByYear = () => {
    const grouped = {};
    events.forEach(event => { 
      if (!grouped[event.year]) grouped[event.year] = []; 
      grouped[event.year].push(event); 
    });
    return Object.keys(grouped).sort((a, b) => b - a);
  };

  const handleAddEvent = () => {
    if (!newEvent.title || !newEvent.date) { 
      Alert.alert('Error', 'Please fill in title and date'); 
      return; 
    }
    
    const year = new Date(newEvent.date).getFullYear();
    const event = { 
      id: Date.now(), 
      ...newEvent, 
      year, 
      date: newEvent.date 
    };
    
    setEvents([...events, event]);
    setShowAddEvent(false);
    setNewEvent({ title: '', date: '', type: 'Birth', description: '' });
    Alert.alert('Success', 'Event added successfully');
  };

  const deleteEvent = (eventId) => {
    Alert.alert('Delete Event', 'Are you sure you want to delete this event?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        setEvents(events.filter(e => e.id !== eventId));
      }}
    ]);
  };

  const years = groupEventsByYear();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.timeline}>
        {years.map((year) => (
          <View key={year} style={styles.yearSection}>
            <TouchableOpacity
              style={[styles.yearHeader, { backgroundColor: theme.colors.primary }]}
              onPress={() => setSelectedYear(selectedYear === year ? null : year)}
            >
              <Text style={styles.yearText}>{year}</Text>
              <Icon name={selectedYear === year ? "expand-less" : "expand-more"} size={24} color="#fff" />
            </TouchableOpacity>
            
            {(selectedYear === null || selectedYear === year) && (
              <View style={styles.eventsContainer}>
                {events
                  .filter(event => event.year === parseInt(year))
                  .map((event) => (
                    <View
                      key={event.id}
                      style={[
                        styles.eventCard,
                        { 
                          backgroundColor: theme.colors.surface, 
                          borderLeftColor: getEventColor(event.type) 
                        }
                      ]}
                    >
                      <View style={styles.eventIcon}>
                        <Icon name={getEventIcon(event.type)} size={32} color={getEventColor(event.type)} />
                      </View>
                      <View style={styles.eventContent}>
                        <Text style={[styles.eventTitle, { color: theme.colors.textPrimary }]}>
                          {event.title}
                        </Text>
                        <Text style={[styles.eventDate, { color: theme.colors.textSecondary }]}>
                          {new Date(event.date).toLocaleDateString()}
                        </Text>
                        {event.description && (
                          <Text style={[styles.eventDescription, { color: theme.colors.textSecondary }]}>
                            {event.description}
                          </Text>
                        )}
                      </View>
                      <TouchableOpacity onPress={() => deleteEvent(event.id)} style={styles.deleteEventBtn}>
                        <Icon name="delete-outline" size={20} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      {/* Add Event FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => setShowAddEvent(true)}
      >
        <Icon name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Add Event Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAddEvent}
        onRequestClose={() => setShowAddEvent(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
              Add Custom Event
            </Text>
            
            <TextInput
              style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
              placeholder="Event Title"
              placeholderTextColor={theme.colors.textSecondary}
              value={newEvent.title}
              onChangeText={(text) => setNewEvent({...newEvent, title: text})}
            />
            
            <TextInput
              style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor={theme.colors.textSecondary}
              value={newEvent.date}
              onChangeText={(text) => setNewEvent({...newEvent, date: text})}
            />
            
            <View style={styles.typeSelector}>
              {['Birth', 'Marriage', 'Anniversary', 'Custom'].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    newEvent.type === type && { backgroundColor: theme.colors.primary }
                  ]}
                  onPress={() => setNewEvent({...newEvent, type})}
                >
                  <Text style={[
                    styles.typeButtonText,
                    newEvent.type === type && { color: '#fff' }
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TextInput
              style={[styles.input, styles.textArea, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
              placeholder="Description (optional)"
              placeholderTextColor={theme.colors.textSecondary}
              value={newEvent.description}
              onChangeText={(text) => setNewEvent({...newEvent, description: text})}
              multiline
              numberOfLines={3}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.error }]}
                onPress={() => setShowAddEvent(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleAddEvent}
              >
                <Text style={styles.modalButtonText}>Add Event</Text>
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
  timeline: {
    flex: 1,
    padding: 16,
  },
  yearSection: {
    marginBottom: 24,
  },
  yearHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  yearText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  eventsContainer: {
    paddingLeft: 16,
  },
  eventCard: {
    flexDirection: 'row',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  eventIcon: {
    marginRight: 16,
    justifyContent: 'center',
  },
  eventContent: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 14,
  },
  deleteEventBtn: {
    justifyContent: 'center',
    paddingLeft: 8,
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
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#E5E7EB',
  },
  typeButtonText: {
    fontSize: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
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