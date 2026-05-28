// Timeline.js - Complete working version with MongoDB integration
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  LayoutAnimation,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../../components/Theme/useTheme';
import { treeService } from '../../services/treeService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function Timeline({ refreshTrigger, onMemberPress }) {
  const { theme } = useTheme();
  const [events, setEvents] = useState([]);
  const [originalEvents, setOriginalEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState({});
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [selectedYear, setSelectedYear] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [sortOrder, setSortOrder] = useState('desc');
  const [editingEvent, setEditingEvent] = useState(null);
  const [currentTreeId, setCurrentTreeId] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    type: 'Birth',
    description: '',
    location: '',
    isHighlighted: false,
    memberId: null
  });

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const eventTypes = ['All', 'Birth', 'Marriage', 'Anniversary', 'Death', 'Custom'];

  // Load data from MongoDB
  useEffect(() => {
    loadFamilyData();
  }, [refreshTrigger]);

  const loadFamilyData = async () => {
    try {
      setLoading(true);
      const savedTreeId = await AsyncStorage.getItem('currentTreeId');
      console.log('Loading timeline for tree:', savedTreeId);
      
      if (savedTreeId) {
        setCurrentTreeId(savedTreeId);
        const response = await treeService.getTree(savedTreeId);
        
        if (response.success && response.nodes) {
          setFamilyMembers(response.nodes);
          
          // Convert family members to timeline events
          const timelineEvents = convertMembersToEvents(response.nodes, response.edges);
          
          setOriginalEvents(timelineEvents);
          setEvents(timelineEvents);
          
          // Get statistics
          const stats = calculateStatistics(response.nodes, timelineEvents);
          setStatistics(stats);
          
          console.log(`Loaded ${timelineEvents.length} events from ${response.nodes.length} members`);
        } else {
          console.log('No tree data found');
        }
      }
    } catch (error) {
      console.error('Error loading family data:', error);
      Alert.alert('Error', 'Failed to load family data');
    } finally {
      setLoading(false);
    }
  };

  // Convert MongoDB family members to timeline events
  const convertMembersToEvents = (members, edges) => {
    const events = [];
    
    // Create birth events
    members.forEach(member => {
      if (member.birthYear && member.birthYear !== '') {
        const year = parseInt(member.birthYear);
        if (!isNaN(year)) {
          events.push({
            id: `${member.id}_birth`,
            memberId: member.id,
            memberName: member.name,
            title: `${member.name} was born`,
            date: `${member.birthYear}-01-01`,
            year: year,
            type: 'Birth',
            description: member.location || `Birth of ${member.name}`,
            location: member.location,
            image: member.image,
            isHighlighted: true,
            icon: '👶',
            color: '#10B981'
          });
        }
      }
      
      // Create death events
      if (member.deathYear && member.deathYear !== '') {
        const year = parseInt(member.deathYear);
        if (!isNaN(year)) {
          events.push({
            id: `${member.id}_death`,
            memberId: member.id,
            memberName: member.name,
            title: `${member.name} passed away`,
            date: `${member.deathYear}-01-01`,
            year: year,
            type: 'Death',
            description: `Passing of ${member.name}`,
            location: member.location,
            image: member.image,
            isHighlighted: false,
            icon: '🕊️',
            color: '#EF4444'
          });
        }
      }
    });
    
    // Create marriage events from spouse relationships
    const processedSpouses = new Set();
    
    if (edges) {
      edges.forEach(edge => {
        if (edge.type === 'spouse') {
          const coupleKey = [edge.from, edge.to].sort().join('-');
          
          if (!processedSpouses.has(coupleKey)) {
            processedSpouses.add(coupleKey);
            
            const member1 = members.find(m => m.id === edge.from);
            const member2 = members.find(m => m.id === edge.to);
            
            if (member1 && member2) {
              // Estimate marriage year based on birth years
              const birthYear1 = member1.birthYear ? parseInt(member1.birthYear) : null;
              const birthYear2 = member2.birthYear ? parseInt(member2.birthYear) : null;
              const marriageYear = Math.max(
                birthYear1 ? birthYear1 + 20 : 1900,
                birthYear2 ? birthYear2 + 20 : 1900
              );
              
              events.push({
                id: `${edge.from}_${edge.to}_marriage`,
                memberId: edge.from,
                spouseId: edge.to,
                memberName: member1.name,
                spouseName: member2.name,
                title: `Wedding of ${member1.name} and ${member2.name}`,
                date: `${marriageYear}-06-15`,
                year: marriageYear,
                type: 'Marriage',
                description: `Marriage union between ${member1.name} and ${member2.name}`,
                isHighlighted: true,
                icon: '💑',
                color: '#F59E0B'
              });
            }
          }
        }
      });
    }
    
    // Sort by year
    events.sort((a, b) => a.year - b.year);
    
    return events;
  };

  // Calculate family statistics
  const calculateStatistics = (members, events) => {
    const birthYears = members
      .filter(m => m.birthYear && m.birthYear !== '')
      .map(m => parseInt(m.birthYear))
      .filter(y => !isNaN(y));
    
    const deathYears = members
      .filter(m => m.deathYear && m.deathYear !== '')
      .map(m => parseInt(m.deathYear))
      .filter(y => !isNaN(y));
    
    // Calculate average lifespan
    let averageLifespan = null;
    const lifespans = members
      .filter(m => m.birthYear && m.deathYear && m.birthYear !== '' && m.deathYear !== '')
      .map(m => {
        const birth = parseInt(m.birthYear);
        const death = parseInt(m.deathYear);
        return !isNaN(birth) && !isNaN(death) ? death - birth : null;
      })
      .filter(l => l !== null);
    
    if (lifespans.length > 0) {
      const sum = lifespans.reduce((a, b) => a + b, 0);
      averageLifespan = Math.round(sum / lifespans.length);
    }
    
    return {
      totalMembers: members.length,
      totalEvents: events.length,
      totalBirths: events.filter(e => e.type === 'Birth').length,
      totalMarriages: events.filter(e => e.type === 'Marriage').length,
      totalDeaths: events.filter(e => e.type === 'Death').length,
      oldestMember: birthYears.length > 0 ? Math.min(...birthYears) : null,
      youngestMember: birthYears.length > 0 ? Math.max(...birthYears) : null,
      earliestEvent: events.length > 0 ? events[0].year : null,
      latestEvent: events.length > 0 ? events[events.length - 1].year : null,
      averageLifespan: averageLifespan
    };
  };

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

  const getEventEmoji = (type) => {
    const emojis = {
      Birth: '👶',
      Marriage: '💑',
      Anniversary: '🎉',
      Death: '🕊️',
      Custom: '📌'
    };
    return emojis[type] || '📅';
  };

  const filterEvents = () => {
    let filtered = [...originalEvents];

    if (searchQuery) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (event.location && event.location.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    if (filterType !== 'All') {
      filtered = filtered.filter(event => event.type === filterType);
    }

    filtered.sort((a, b) => sortOrder === 'desc' ? b.year - a.year : a.year - b.year);

    return filtered;
  };

  const groupEventsByYear = () => {
    const filteredEvents = filterEvents();
    const grouped = {};
    filteredEvents.forEach(event => {
      if (!grouped[event.year]) grouped[event.year] = [];
      grouped[event.year].push(event);
    });
    return Object.keys(grouped).sort((a, b) => sortOrder === 'desc' ? b - a : a - b);
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.date) {
      Alert.alert('Error', 'Please fill in title and date');
      return;
    }

    const year = new Date(newEvent.date).getFullYear();

    if (isNaN(year)) {
      Alert.alert('Error', 'Invalid date format. Please use YYYY-MM-DD');
      return;
    }

    const event = {
      id: Date.now(),
      ...newEvent,
      year,
      date: newEvent.date,
      isHighlighted: newEvent.isHighlighted || false,
      icon: getEventEmoji(newEvent.type),
      color: getEventColor(newEvent.type),
      isCustom: true
    };

    animateAndUpdate(() => {
      if (editingEvent) {
        const updatedEvents = originalEvents.map(e => e.id === editingEvent.id ? event : e);
        setOriginalEvents(updatedEvents);
        setEvents(filterEvents());
        Alert.alert('Success', 'Event updated successfully');
      } else {
        const updatedEvents = [...originalEvents, event];
        setOriginalEvents(updatedEvents);
        setEvents(filterEvents());
        Alert.alert('Success', 'Event added successfully');
      }
    });

    resetForm();
  };

  const resetForm = () => {
    setShowAddEvent(false);
    setEditingEvent(null);
    setNewEvent({
      title: '',
      date: '',
      type: 'Birth',
      description: '',
      location: '',
      isHighlighted: false,
      memberId: null
    });
  };

  const editEvent = (event) => {
    setEditingEvent(event);
    setNewEvent({
      title: event.title,
      date: event.date,
      type: event.type,
      description: event.description || '',
      location: event.location || '',
      isHighlighted: event.isHighlighted || false,
      memberId: event.memberId || null
    });
    setShowAddEvent(true);
  };

  const deleteEvent = (eventId) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            animateAndUpdate(() => {
              const updatedEvents = originalEvents.filter(e => e.id !== eventId);
              setOriginalEvents(updatedEvents);
              setEvents(filterEvents());
            });
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
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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

  const toggleHighlight = (eventId) => {
    const updatedEvents = originalEvents.map(event =>
      event.id === eventId
        ? { ...event, isHighlighted: !event.isHighlighted }
        : event
    );
    setOriginalEvents(updatedEvents);
    setEvents(filterEvents());
  };

  const renderRightActions = (event) => {
    // Only allow editing/deleting custom events
    if (!event.isCustom) return null;
    
    return (
      <View style={styles.swipeActions}>
        <TouchableOpacity
          style={[styles.swipeButton, { backgroundColor: '#3B82F6' }]}
          onPress={() => editEvent(event)}
        >
          <Icon name="edit" size={24} color="#fff" />
          <Text style={styles.swipeButtonText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.swipeButton, { backgroundColor: '#EF4444' }]}
          onPress={() => deleteEvent(event.id)}
        >
          <Icon name="delete" size={24} color="#fff" />
          <Text style={styles.swipeButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEventCard = (event, index) => {
    return (
      <Swipeable
        key={event.id}
        renderRightActions={() => renderRightActions(event)}
        overshootRight={false}
      >
        <Animated.View
          style={[
            styles.eventCard,
            event.isHighlighted && styles.highlightedEvent,
            {
              backgroundColor: theme.colors.surface,
              borderLeftColor: event.color || getEventColor(event.type),
            }
          ]}
        >
          <View style={[styles.eventIcon, { backgroundColor: `${event.color || getEventColor(event.type)}20` }]}>
            <Text style={styles.eventEmoji}>{event.icon || getEventEmoji(event.type)}</Text>
          </View>

          <View style={styles.eventContent}>
            <View style={styles.eventHeader}>
              <Text style={[styles.eventTitle, { color: theme.colors.textPrimary }]}>
                {event.title}
              </Text>
              <TouchableOpacity
                onPress={() => toggleHighlight(event.id)}
                style={styles.highlightButton}
              >
                <Icon
                  name={event.isHighlighted ? "star" : "star-border"}
                  size={20}
                  color={event.isHighlighted ? "#F59E0B" : theme.colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.eventMeta}>
              <View style={styles.metaItem}>
                <Icon name="event" size={14} color={theme.colors.textSecondary} />
                <Text style={[styles.eventDate, { color: theme.colors.textSecondary }]}>
                  {new Date(event.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Text>
              </View>

              {event.location && (
                <View style={styles.metaItem}>
                  <Icon name="location-on" size={14} color={theme.colors.textSecondary} />
                  <Text style={[styles.eventLocation, { color: theme.colors.textSecondary }]}>
                    {event.location}
                  </Text>
                </View>
              )}

              <View style={[styles.typeBadge, { backgroundColor: `${event.color || getEventColor(event.type)}20` }]}>
                <Text style={[styles.typeBadgeText, { color: event.color || getEventColor(event.type) }]}>
                  {event.type}
                </Text>
              </View>
            </View>

            {event.description && (
              <Text style={[styles.eventDescription, { color: theme.colors.textSecondary }]}>
                {event.description}
              </Text>
            )}

            {event.memberName && onMemberPress && (
              <TouchableOpacity
                style={styles.memberLink}
                onPress={() => onMemberPress(event.memberId)}
              >
                <Icon name="person" size={14} color="#FFD700" />
                <Text style={styles.memberLinkText}>View {event.memberName}</Text>
              </TouchableOpacity>
            )}
            
            {!event.isCustom && event.type !== 'Birth' && event.type !== 'Death' && event.type !== 'Marriage' && (
              <View style={styles.autoGeneratedBadge}>
                <Icon name="auto-awesome" size={12} color="#8B5CF6" />
                <Text style={styles.autoGeneratedText}>Auto-generated</Text>
              </View>
            )}
          </View>
        </Animated.View>
      </Swipeable>
    );
  };

  const years = groupEventsByYear();
  const filteredEvents = filterEvents();

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
          <Icon name="timeline" size={60} color="#FFD700" />
          <Text style={[styles.loadingText, { color: theme.colors.textPrimary }]}>
            Loading family timeline...
          </Text>
        </Animated.View>
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
      {/* Header with Stats */}
      <View style={styles.statsContainer}>
        <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
          <Icon name="people" size={24} color="#FFD700" />
          <Text style={[styles.statNumber, { color: theme.colors.textPrimary }]}>
            {statistics.totalMembers || 0}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Family Members
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
          <Icon name="event" size={24} color="#FFD700" />
          <Text style={[styles.statNumber, { color: theme.colors.textPrimary }]}>
            {originalEvents.length}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Total Events
          </Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
          <Icon name="date-range" size={24} color="#FFD700" />
          <Text style={[styles.statNumber, { color: theme.colors.textPrimary }]}>
            {statistics.earliestEvent && statistics.latestEvent ?
              `${statistics.earliestEvent} - ${statistics.latestEvent}` : 'N/A'}
          </Text>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            Year Range
          </Text>
        </View>
      </View>

      {/* Search and Filters */}
      <View style={styles.searchSection}>
        <View style={[styles.searchBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Icon name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.textPrimary }]}
            placeholder="Search events..."
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {eventTypes.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.filterChip,
                filterType === type && { backgroundColor: theme.colors.primary },
                { borderColor: theme.colors.border }
              ]}
              onPress={() => setFilterType(type)}
            >
              {type !== 'All' && (
                <Text style={styles.filterEmoji}>
                  {getEventEmoji(type)}
                </Text>
              )}
              <Text style={[
                styles.filterChipText,
                { color: filterType === type ? '#fff' : theme.colors.textSecondary }
              ]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.sortButton, { borderColor: theme.colors.border }]}
            onPress={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          >
            <Icon name={sortOrder === 'desc' ? 'arrow-downward' : 'arrow-upward'} size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.sortButtonText, { color: theme.colors.textSecondary }]}>
              {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Timeline */}
      {filteredEvents.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="event-busy" size={80} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
            No events found
          </Text>
          <Text style={[styles.emptyStateSubText, { color: theme.colors.textSecondary }]}>
            {originalEvents.length === 0 ?
              'Add family members to see their life events automatically' :
              'Try adjusting your search or filters'}
          </Text>
          {originalEvents.length === 0 && onMemberPress && (
            <TouchableOpacity
              style={[styles.emptyStateButton, { backgroundColor: theme.colors.primary }]}
              onPress={() => onMemberPress(null)}
            >
              <Text style={styles.emptyStateButtonText}>Add Family Members</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <ScrollView style={styles.timeline}>
          {years.map((year) => (
            <View key={year} style={styles.yearSection}>
              <TouchableOpacity
                style={[
                  styles.yearHeader,
                  { backgroundColor: theme.colors.primary },
                  selectedYear === year && styles.yearHeaderExpanded
                ]}
                onPress={() => setSelectedYear(selectedYear === year ? null : year)}
                activeOpacity={0.8}
              >
                <View style={styles.yearHeaderLeft}>
                  <Icon name="date-range" size={24} color="#fff" />
                  <Text style={styles.yearText}>{year}</Text>
                </View>
                <View style={styles.yearHeaderRight}>
                  <Text style={styles.eventCount}>
                    {originalEvents.filter(e => e.year === parseInt(year)).length} events
                  </Text>
                  <Icon name={selectedYear === year ? "expand-less" : "expand-more"} size={24} color="#fff" />
                </View>
              </TouchableOpacity>

              {(selectedYear === null || selectedYear === year) && (
                <View style={styles.eventsContainer}>
                  {originalEvents
                    .filter(event => event.year === parseInt(year))
                    .map((event, index) => renderEventCard(event, index))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add Event FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => {
          setEditingEvent(null);
          setShowAddEvent(true);
        }}
        activeOpacity={0.8}
      >
        <Icon name="add" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Add/Edit Event Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showAddEvent}
        onRequestClose={resetForm}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>
                {editingEvent ? 'Edit Event' : 'Add Family Event'}
              </Text>
              <TouchableOpacity onPress={resetForm}>
                <Icon name="close" size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <TextInput
                style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                placeholder="Event Title *"
                placeholderTextColor={theme.colors.textSecondary}
                value={newEvent.title}
                onChangeText={(text) => setNewEvent({ ...newEvent, title: text })}
              />

              <TextInput
                style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                placeholder="Date (YYYY-MM-DD) *"
                placeholderTextColor={theme.colors.textSecondary}
                value={newEvent.date}
                onChangeText={(text) => setNewEvent({ ...newEvent, date: text })}
              />

              <TextInput
                style={[styles.input, { color: theme.colors.textPrimary, borderColor: theme.colors.border }]}
                placeholder="Location"
                placeholderTextColor={theme.colors.textSecondary}
                value={newEvent.location}
                onChangeText={(text) => setNewEvent({ ...newEvent, location: text })}
              />

              <View style={styles.typeSelector}>
                {['Birth', 'Marriage', 'Anniversary', 'Death', 'Custom'].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      newEvent.type === type && { backgroundColor: theme.colors.primary }
                    ]}
                    onPress={() => setNewEvent({ ...newEvent, type })}
                  >
                    <Text style={styles.typeEmoji}>{getEventEmoji(type)}</Text>
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
                onChangeText={(text) => setNewEvent({ ...newEvent, description: text })}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity
                style={[styles.highlightOption, newEvent.isHighlighted && { backgroundColor: `${theme.colors.primary}20` }]}
                onPress={() => setNewEvent({ ...newEvent, isHighlighted: !newEvent.isHighlighted })}
              >
                <Icon
                  name={newEvent.isHighlighted ? "star" : "star-border"}
                  size={24}
                  color={newEvent.isHighlighted ? "#F59E0B" : theme.colors.textSecondary}
                />
                <View style={styles.highlightOptionText}>
                  <Text style={[styles.highlightOptionTitle, { color: theme.colors.textPrimary }]}>
                    Highlight as Important
                  </Text>
                  <Text style={[styles.highlightOptionSubtitle, { color: theme.colors.textSecondary }]}>
                    Mark this event as significant in family history
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Link to Family Member */}
              {familyMembers.length > 0 && (
                <View style={styles.memberSelector}>
                  <Text style={[styles.memberSelectorLabel, { color: theme.colors.textPrimary }]}>
                    Link to Family Member (Optional)
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.memberScroll}>
                    <TouchableOpacity
                      style={[
                        styles.memberChip,
                        !newEvent.memberId && { backgroundColor: theme.colors.primary }
                      ]}
                      onPress={() => setNewEvent({ ...newEvent, memberId: null })}
                    >
                      <Text style={styles.memberChipText}>None</Text>
                    </TouchableOpacity>
                    {familyMembers.map(member => (
                      <TouchableOpacity
                        key={member.id}
                        style={[
                          styles.memberChip,
                          newEvent.memberId === member.id && { backgroundColor: theme.colors.primary }
                        ]}
                        onPress={() => setNewEvent({ ...newEvent, memberId: member.id, memberName: member.name })}
                      >
                        {member.image ? (
                          <Image source={{ uri: member.image }} style={styles.memberChipImage} />
                        ) : (
                          <View style={styles.memberChipAvatar}>
                            <Text style={styles.memberChipInitial}>
                              {member.name?.charAt(0) || '?'}
                            </Text>
                          </View>
                        )}
                        <Text style={[
                          styles.memberChipText,
                          newEvent.memberId === member.id && { color: '#fff' }
                        ]}>
                          {member.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.error }]}
                onPress={resetForm}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleAddEvent}
              >
                <Text style={styles.modalButtonText}>
                  {editingEvent ? 'Update Event' : 'Add Event'}
                </Text>
              </TouchableOpacity>
            </View>
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
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  filterScroll: {
    flexGrow: 0,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    gap: 6,
  },
  filterEmoji: {
    fontSize: 14,
  },
  filterChipText: {
    fontSize: 14,
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  sortButtonText: {
    fontSize: 14,
  },
  timeline: {
    flex: 1,
    paddingHorizontal: 16,
  },
  yearSection: {
    marginBottom: 20,
  },
  yearHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  yearHeaderExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  yearHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  yearHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  yearText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  eventCount: {
    color: '#fff',
    fontSize: 11,
    opacity: 0.9,
  },
  eventsContainer: {
    paddingLeft: 12,
  },
  eventCard: {
    flexDirection: 'row',
    padding: 14,
    marginBottom: 10,
    borderRadius: 12,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  highlightedEvent: {
    borderWidth: 2,
    borderColor: '#F59E0B',
    elevation: 4,
  },
  eventIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  eventEmoji: {
    fontSize: 28,
  },
  eventContent: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  highlightButton: {
    padding: 4,
  },
  eventMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  eventDate: {
    fontSize: 12,
  },
  eventLocation: {
    fontSize: 12,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '500',
  },
  eventDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  memberLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  memberLinkText: {
    fontSize: 12,
    color: '#FFD700',
  },
  autoGeneratedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  autoGeneratedText: {
    fontSize: 10,
    color: '#8B5CF6',
  },
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginLeft: 8,
  },
  swipeButton: {
    width: 70,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginLeft: 8,
  },
  swipeButtonText: {
    color: '#fff',
    fontSize: 11,
    marginTop: 4,
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
    maxHeight: '80%',
    padding: 20,
    borderRadius: 16,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    gap: 6,
  },
  typeEmoji: {
    fontSize: 16,
  },
  typeButtonText: {
    fontSize: 14,
  },
  highlightOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    gap: 12,
  },
  highlightOptionText: {
    flex: 1,
  },
  highlightOptionTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  highlightOptionSubtitle: {
    fontSize: 12,
  },
  memberSelector: {
    marginBottom: 12,
  },
  memberSelectorLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  memberScroll: {
    flexGrow: 0,
  },
  memberChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginRight: 8,
    gap: 6,
  },
  memberChipImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  memberChipAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,215,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberChipInitial: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFD700',
  },
  memberChipText: {
    fontSize: 12,
    color: '#fff',
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
    marginBottom: 24,
  },
  emptyStateButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});