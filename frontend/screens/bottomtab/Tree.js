
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useSelector } from 'react-redux';
import { useTheme } from '../../components/Theme/useTheme';
import { treeService } from '../../services/treeService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Configuration Constants
const NODE_SIZE = 100;
const NODE_SIZE_SMALL = 85;
const GENERATION_GAP = 260;
const SIBLING_SPACING = 250;
const COUPLE_SPACING = 850;
 


export default function Tree() {
  const { theme } = useTheme();
  const { user } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [familyRelations, setFamilyRelations] = useState({ spouse: null, mother: null, father: null, children: [] });

  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [currentTreeId, setCurrentTreeId] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showLabels, setShowLabels] = useState(true);

  const [isAddingNode, setIsAddingNode] = useState(false);
  const [parentNodeId, setParentNodeId] = useState(null);
  const [relationType, setRelationType] = useState('child');
  const [formName, setFormName] = useState('');
  const [formBirth, setFormBirth] = useState('');
  const [formDeath, setFormDeath] = useState('');
  const [formGender, setFormGender] = useState('male');
  const [formLocation, setFormLocation] = useState('');
  const [formImage, setFormImage] = useState(null);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  useEffect(() => {
    loadOrCreateTree();
  }, [user]);

  const loadOrCreateTree = async () => {
    try {
      setLoading(true);
      const savedTreeId = await AsyncStorage.getItem('currentTreeId');

      if (savedTreeId) {
        await loadTreeData(savedTreeId);
      } else if (user) {
        await createNewTree();
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Load tree error:', error);
      Alert.alert('Error', 'Failed to load family tree: ' + error.message);
      setLoading(false);
    }
  };

  const loadTreeData = async (treeId) => {
    try {
      const response = await treeService.getTree(treeId);

      if (response.success) {
        setNodes(response.nodes || []);
        setEdges(response.edges || []);
        setCurrentTreeId(treeId);
      }
    } catch (error) {
      console.error('Load tree data error:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewTree = async () => {
    try {
      const treeName = `${user?.name || 'My'}'s Family Tree`;
      const response = await treeService.createTree(treeName);

      if (response.success && response.tree) {
        setCurrentTreeId(response.tree._id);
        await AsyncStorage.setItem('currentTreeId', response.tree._id);
        setNodes([]);
        setEdges([]);
      }
    } catch (error) {
      console.error('Create tree error:', error);
      Alert.alert('Error', 'Failed to create family tree: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (currentTreeId) {
      await loadTreeData(currentTreeId);
    }
    setRefreshing(false);
  }, [currentTreeId]);

  const saveMemberToDB = async (memberData, parentId = null, type = 'child') => {
    try {
      setIsSaving(true);

      let birthDate = null;
      let deathDate = null;

      if (memberData.birthYear && memberData.birthYear.length > 0) {
        const year = parseInt(memberData.birthYear);
        if (!isNaN(year) && year > 0 && year < 3000) {
          birthDate = new Date(year, 0, 1).toISOString();
        }
      }

      if (memberData.deathYear && memberData.deathYear.length > 0) {
        const year = parseInt(memberData.deathYear);
        if (!isNaN(year) && year > 0 && year < 3000) {
          deathDate = new Date(year, 0, 1).toISOString();
        }
      }

      const memberToSave = {
        name: memberData.name,
        birthDate: birthDate,
        deathDate: deathDate,
        gender: memberData.gender || 'male',
        bio: memberData.location || '',
        avatar: memberData.image || null,
        treeId: currentTreeId,
        parents: [],
        spouse: null
      };

      if (type === 'child' && parentId) {
        memberToSave.parents = [parentId];
        const parentNode = nodes.find(n => n.id === parentId);
        if (parentNode && parentNode.spouse) {
          memberToSave.parents.push(parentNode.spouse);
        }
      } else if (type === 'spouse' && parentId) {
        memberToSave.spouse = parentId;
      }

      const response = await treeService.addMember(memberToSave);

      if (response.success && response.member) {
        if (type === 'spouse' && parentId) {
          await treeService.updateMember(parentId, { spouse: response.member._id });
        }
        return response.member;
      }
      return null;
    } catch (error) {
      console.error('Save member error:', error);
      Alert.alert('Error', 'Failed to save member: ' + (error.message || 'Unknown error'));
      return null;
    } finally {
      setIsSaving(false);
    }
  };

 
  const computeTreeLayout = useCallback((nodesList, edgesList) => {
    if (nodesList.length === 0) return [];

   
    const nodeMap = new Map();
    nodesList.forEach(node => {
      nodeMap.set(node.id, {
        ...node,
        spouse: null,
        children: [],
        parents: node.parents || [],
        x: 0,
        y: 0,
        generation: 0,
        hasParent: false
      });
    });

    // Build relationships from edges
    edgesList.forEach(edge => {
      const fromNode = nodeMap.get(edge.from);
      const toNode = nodeMap.get(edge.to);
      if (!fromNode || !toNode) return;

      if (edge.type === 'spouse') {
        fromNode.spouse = toNode.id;
        toNode.spouse = fromNode.id;
      } else if (edge.type === 'parent-child') {
        if (!fromNode.children.includes(toNode.id)) {
          fromNode.children.push(toNode.id);
        }
        if (!toNode.parents.includes(fromNode.id)) {
          toNode.parents.push(fromNode.id);
        }
        toNode.hasParent = true;
      }
    });

    
    let roots = Array.from(nodeMap.values()).filter(node => !node.hasParent);

    if (roots.length === 0 && nodesList.length > 0) {
      roots = [Array.from(nodeMap.values())[0]];
    }

    if (roots.length === 0) return [];

    const layoutNodes = [];
    const processed = new Set();

    // Assign generations
    const assignGenerations = (node, gen) => {
      if (processed.has(node.id)) return;
      processed.add(node.id);
      node.generation = gen;

      if (node.spouse) {
        const spouse = nodeMap.get(node.spouse);
        if (spouse && !processed.has(spouse.id)) {
          spouse.generation = gen;
          processed.add(spouse.id);
        }
      }

      node.children.forEach(childId => {
        const child = nodeMap.get(childId);
        if (child && !processed.has(child.id)) {
          assignGenerations(child, gen + 1);
        }
      });
    };

    roots.forEach(root => assignGenerations(root, 0));

    // Group by generation
    const generations = new Map();
    Array.from(nodeMap.values()).forEach(node => {
      const gen = node.generation;
      if (!generations.has(gen)) {
        generations.set(gen, []);
      }
      generations.get(gen).push(node);
    });

    const sortedGenerations = Array.from(generations.keys()).sort((a, b) => a - b);
    const startY = 100;

    
    sortedGenerations.forEach((gen, genIndex) => {
      const genNodes = generations.get(gen);
      const y = startY + (genIndex * GENERATION_GAP);
      const processedInGen = new Set();
      let currentX = 200;

      genNodes.forEach(node => {
        if (processedInGen.has(node.id)) return;

        
        if (node.spouse && !processedInGen.has(node.spouse)) {
          const spouse = nodeMap.get(node.spouse);
          if (spouse) {
            
            spouse.x = currentX;
            node.x = currentX + NODE_SIZE + COUPLE_SPACING;
            spouse.y = y;
            node.y = y;

            processedInGen.add(node.id);
            processedInGen.add(spouse.id);
            currentX += (NODE_SIZE * 2) + COUPLE_SPACING + SIBLING_SPACING;
          }
        } else if (!node.spouse && !processedInGen.has(node.id)) {
          node.x = currentX;
          node.y = y;
          processedInGen.add(node.id);
          currentX += NODE_SIZE + SIBLING_SPACING;
        }
      });
    });

    // Second pass: Center children under parents
    const positionChildren = (node) => {
      if (!node.children || node.children.length === 0) return;

      const childrenNodes = node.children.map(childId => nodeMap.get(childId)).filter(c => c);
      if (childrenNodes.length === 0) return;

      // Calculate the center X position of the parent couple
      let parentCenterX = node.x + NODE_SIZE / 2;

      // If parent has a spouse, center between them
      if (node.spouse) {
        const spouse = nodeMap.get(node.spouse);
        if (spouse) {
          parentCenterX = (node.x + spouse.x + NODE_SIZE) / 2;
        }
      }

      // Calculate total width of children
      const totalChildrenWidth = (childrenNodes.length - 1) * SIBLING_SPACING + NODE_SIZE;
      const startChildX = parentCenterX - (totalChildrenWidth / 2);

      // Position children
      childrenNodes.forEach((child, index) => {
        const childX = startChildX + (index * SIBLING_SPACING);
        child.x = childX;
        // Recursively position grandchildren
        positionChildren(child);
      });
    };

    // Apply child positioning for all roots
    roots.forEach(root => {
      positionChildren(root);
    });

    // Collect all positioned nodes
    Array.from(nodeMap.values()).forEach(node => {
      layoutNodes.push(node);
    });

    // Center the entire tree horizontally
    if (layoutNodes.length > 0) {
      const minX = Math.min(...layoutNodes.map(n => n.x));
      const maxX = Math.max(...layoutNodes.map(n => n.x + NODE_SIZE));
      const treeWidth = maxX - minX;
      const offsetX = (SCREEN_WIDTH / 2) - (minX + treeWidth / 2);

      layoutNodes.forEach(node => {
        node.x += offsetX;
      });
    }

    return layoutNodes;
  }, []);

  const activeNodes = computeTreeLayout(nodes, edges);

  const getFamilyRelations = useCallback((memberId, currentNodes, currentEdges) => {
    const member = currentNodes.find(n => n.id === memberId);
    if (!member) return { spouse: null, mother: null, father: null, children: [] };

    const spouseEdge = currentEdges.find(e => e.type === 'spouse' && (e.from === memberId || e.to === memberId));
    const spouse = spouseEdge
      ? currentNodes.find(n => n.id === (spouseEdge.from === memberId ? spouseEdge.to : spouseEdge.from))
      : null;

    const parentEdges = currentEdges.filter(e => e.type === 'parent-child' && e.to === memberId);
    let mother = null;
    let father = null;
    parentEdges.forEach(edge => {
      const parent = currentNodes.find(n => n.id === edge.from);
      if (parent) {
        if (parent.gender === 'female') mother = parent;
        else if (parent.gender === 'male') father = parent;
      }
    });

    const childEdges = currentEdges.filter(e => e.type === 'parent-child' && e.from === memberId);
    const children = childEdges
      .map(edge => currentNodes.find(n => n.id === edge.to))
      .filter(Boolean);

    return { spouse, mother, father, children };
  }, []);

  const handleMemberPress = useCallback((member) => {
    const relations = getFamilyRelations(member.id, nodes, edges);
    setFamilyRelations(relations);
    setSelectedMember(member);
    setModalVisible(true);
  }, [nodes, edges, getFamilyRelations]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      const newScale = Math.max(0.5, Math.min(savedScale.value * e.scale, 2));
      scale.value = newScale;
      runOnJS(setZoomLevel)(newScale);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      scale.value = withSpring(1);
      savedScale.value = 1;
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      runOnJS(setZoomLevel)(1);
    });

  const combinedGestures = Gesture.Race(pinchGesture, panGesture, doubleTapGesture);

  const animatedCanvasStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value }
    ],
  }));

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        setFormImage(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Image picker error:', error);
    }
  };

  const handleCreateRoot = async () => {
    if (!formName) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    const newMember = await saveMemberToDB({
      name: formName,
      birthYear: formBirth,
      deathYear: formDeath,
      gender: formGender,
      location: formLocation,
      image: formImage
    });

    if (newMember) {
      await loadTreeData(currentTreeId);
      clearForm();
      Alert.alert('Success', 'Root ancestor added successfully!');
    }
  };

  const handleAddRelative = async () => {
    if (!formName) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    const newMember = await saveMemberToDB({
      name: formName,
      birthYear: formBirth,
      deathYear: formDeath,
      gender: formGender,
      location: formLocation,
      image: formImage
    }, parentNodeId, relationType);

    if (newMember) {
      await loadTreeData(currentTreeId);
      clearForm();
      Alert.alert('Success', `${relationType} added successfully!`);
    }
  };

  const clearForm = () => {
    setFormName('');
    setFormBirth('');
    setFormDeath('');
    setFormGender('male');
    setFormLocation('');
    setFormImage(null);
    setIsAddingNode(false);
    setParentNodeId(null);
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    if (!query) return;
    const target = activeNodes.find(n => n.name && n.name.toLowerCase().includes(query.toLowerCase()));
    if (target) {
      const newX = SCREEN_WIDTH / 2 - target.x * scale.value;
      const newY = SCREEN_HEIGHT / 2 - target.y * scale.value;
      translateX.value = withTiming(newX);
      translateY.value = withTiming(newY);
      savedTranslateX.value = newX;
      savedTranslateY.value = newY;
    }
  };

  const openAddRelativeModal = (parent, type) => {
    setParentNodeId(parent.id);
    setRelationType(type);
    setIsAddingNode(true);
    setModalVisible(false);
  };

  const getNodeStyle = (node) => {
    const nodeSize = node.generation === 0 ? NODE_SIZE : NODE_SIZE_SMALL;

    let borderColor, bgColor;
    if (node.generation === 0) {
      borderColor = '#FFD700';
      bgColor = 'rgba(255, 215, 0, 0.15)';
    } else if (node.gender === 'female') {
      borderColor = '#FF69B4';
      bgColor = 'rgba(255, 105, 180, 0.15)';
    } else {
      borderColor = '#4A90E2';
      bgColor = 'rgba(74, 144, 226, 0.15)';
    }

    return {
      position: 'absolute',
      width: nodeSize,
      height: nodeSize,
      borderRadius: nodeSize / 2,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 5,
      borderWidth: 3,
      borderColor: borderColor,
      backgroundColor: bgColor,
      shadowColor: borderColor,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    };
  };

  // ENHANCED: Traditional Family Tree Connection Lines
  // ULTRA FAMILY TREE CONNECTION SYSTEM
  const renderConnectionLines = () => {
    const lines = [];

    // ==========================================
    // HELPERS
    // ==========================================

    const getNodeSize = (node) => {
      return node.generation === 0
        ? NODE_SIZE
        : NODE_SIZE_SMALL;
    };

    const getNodeById = (id) => {
      return activeNodes.find(n => n.id === id);
    };

    // ==========================================
    // BUILD CHILD MAP
    // ==========================================

    const childrenMap = {};

    edges.forEach(edge => {
      if (edge.type === 'parent-child') {
        if (!childrenMap[edge.from]) {
          childrenMap[edge.from] = [];
        }

        childrenMap[edge.from].push(edge.to);
      }
    });

    // ==========================================
    // PREVENT DUPLICATES
    // ==========================================

    const renderedFamilies = new Set();

    // ==========================================
    // MAIN FAMILY RENDER
    // ==========================================

    const renderFamily = (person) => {
      if (!person) return;

      // ==========================================
      // SPOUSE
      // ==========================================

      let spouse = null;

      if (person.spouse) {
        spouse = getNodeById(person.spouse);
      }

      // ==========================================
      // UNIQUE FAMILY KEY
      // ==========================================

      const familyKey = spouse
        ? [person.id, spouse.id].sort().join('-')
        : `single-${person.id}`;

      if (renderedFamilies.has(familyKey)) {
        return;
      }

      renderedFamilies.add(familyKey);

      // ==========================================
      // POSITION DATA
      // ==========================================

      const personSize = getNodeSize(person);

      let coupleCenterX = person.x;
      let coupleY = person.y;

      // ==========================================
      // DRAW SPOUSE CONNECTION
      // ==========================================

      if (spouse) {
        const spouseSize = getNodeSize(spouse);

        const leftNode =
          person.x < spouse.x
            ? person
            : spouse;

        const rightNode =
          person.x < spouse.x
            ? spouse
            : person;

        const leftSize = getNodeSize(leftNode);
        const rightSize = getNodeSize(rightNode);

        const startX =
          leftNode.x + leftSize / 2;

        const endX =
          rightNode.x - rightSize / 2;

        const lineY = leftNode.y;

        // HUSBAND/WIFE LINE
        lines.push(
          <View
            key={`spouse-line-${familyKey}`}
            style={{
              position: 'absolute',
              left: startX,
              top: lineY,
              width: endX - startX,
              height: 4,
              backgroundColor: '#E91E63',
              borderRadius: 4,
              zIndex: 1,
            }}
          />
        );

        // HEART
        lines.push(
          <View
            key={`heart-${familyKey}`}
            style={{
              position: 'absolute',
              left:
                (startX + endX) / 2 - 10,
              top: lineY - 10,
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: '#E91E63',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 5,
            }}
          >
            <Text
              style={{
                color: '#fff',
                fontSize: 10,
              }}
            >
              ❤
            </Text>
          </View>
        );

        // TRUE CENTER OF COUPLE
        coupleCenterX =
          (leftNode.x + rightNode.x) / 2;

        coupleY = leftNode.y;
      }

      // ==========================================
      // GET CHILDREN
      // ==========================================

      const ownChildren =
        childrenMap[person.id] || [];

      // REMOVE DUPLICATES
      const uniqueChildren = [
        ...new Set(ownChildren),
      ];

      const children = uniqueChildren
        .map(id => getNodeById(id))
        .filter(Boolean);

      if (children.length === 0) {
        return;
      }

      // ==========================================
      // CHILD POSITION RANGE
      // ==========================================

      const childXs = children.map(
        child => child.x
      );

      const minChildX = Math.min(...childXs);
      const maxChildX = Math.max(...childXs);

      // ==========================================
      // VERTICAL START
      // ==========================================

      const startY =
        coupleY + personSize / 2;

      // SPACE BETWEEN PARENT + CHILDREN
      const siblingLineY = startY + 60;

      // ==========================================
      // CENTER DOWN LINE
      // ==========================================

      lines.push(
        <View
          key={`center-down-${familyKey}`}
          style={{
            position: 'absolute',
            left: coupleCenterX - 1.5,
            top: startY,
            width: 3,
            height: siblingLineY - startY,
            backgroundColor: '#FFD700',
            zIndex: 1,
          }}
        />
      );

      // ==========================================
      // HORIZONTAL SIBLING LINE
      // ==========================================

      lines.push(
        <View
          key={`siblings-${familyKey}`}
          style={{
            position: 'absolute',
            left: minChildX,
            top: siblingLineY,
            width: maxChildX - minChildX,
            height: 3,
            backgroundColor: '#FFD700',
            borderRadius: 3,
            zIndex: 1,
          }}
        />
      );

      // ==========================================
      // CONNECT EACH CHILD
      // ==========================================

      children.forEach(child => {
        const childSize =
          getNodeSize(child);

        const childTopY =
          child.y - childSize / 2;

        // VERTICAL CHILD LINE
        lines.push(
          <View
            key={`child-line-${child.id}`}
            style={{
              position: 'absolute',
              left: child.x - 1.5,
              top: siblingLineY,
              width: 3,
              height:
                childTopY - siblingLineY,
              backgroundColor: '#FFD700',
              zIndex: 1,
            }}
          />
        );

        // CONNECTION DOT
        lines.push(
          <View
            key={`dot-${child.id}`}
            style={{
              position: 'absolute',
              left: child.x - 4,
              top: siblingLineY - 4,
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#FFD700',
              zIndex: 2,
            }}
          />
        );

        // ==========================================
        // RECURSIVE RENDER
        // THIS ENABLES:
        // Child -> spouse -> children
        // Grandchildren
        // Great grandchildren
        // ==========================================

        renderFamily(child);
      });
    };

    // ==========================================
    // FIND ROOTS
    // ==========================================

    const roots = activeNodes.filter(node => {
      return !edges.some(
        edge =>
          edge.type === 'parent-child' &&
          edge.to === node.id
      );
    });

    // ==========================================
    // START RENDERING TREE
    // ==========================================

    roots.forEach(root => {
      renderFamily(root);
    });

    return lines;
  };

  const renderNode = (node) => {
    const nodeStyle = getNodeStyle(node);
    const isDeceased = node.deathYear && node.deathYear.length > 0;
    const nodeSize = node.generation === 0 ? NODE_SIZE : NODE_SIZE_SMALL;
    const isRoot = node.generation === 0;

    return (
      <TouchableOpacity
        key={`node-${node.id}`}
        style={[
          nodeStyle,
          {
            left: node.x - nodeSize / 2,
            top: node.y - nodeSize / 2,
            opacity: isDeceased ? 0.6 : 1,
          }
        ]}
        activeOpacity={0.8}
        onPress={() => handleMemberPress(node)}
      >
        <View style={styles.orbInnerContent}>
          {node.image ? (
            <Image source={{ uri: node.image }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: node.gender === 'female' ? 'rgba(255,105,180,0.3)' : 'rgba(74,144,226,0.3)' }]}>
              <Text style={[styles.initialTextChar, isRoot && styles.rootText]}>
                {node.name?.charAt(0) || '?'}
              </Text>
            </View>
          )}
          {isDeceased && (
            <View style={styles.deceasedBadge}>
              <Icon name="local-hospital" size={12} color="#fff" />
            </View>
          )}
        </View>
        {showLabels && (
          <View style={[styles.floatingLabelContainer, isRoot && styles.rootLabelContainer]}>
            <Text numberOfLines={1} style={[styles.nodeMiniatureName, isRoot && styles.rootName]}>
              {node.name}
            </Text>
            {node.birthYear && (
              <Text style={styles.nodeMiniatureYear}>
                {node.birthYear}{node.deathYear ? `-${node.deathYear}` : ''}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color="#FFD700" />
        <Text style={{ color: theme.colors.textPrimary, marginTop: 16 }}>Loading family tree...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.zoomIndicator}>
          <Text style={styles.zoomText}>{Math.round(zoomLevel * 100)}%</Text>
        </View>

        <View style={[styles.blurSearchWrapper, { backgroundColor: 'rgba(0,0,0,0.8)', borderColor: 'rgba(255,215,0,0.3)' }]}>
          <Icon name="search" size={20} color="#FFD700" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search family members..."
            placeholderTextColor="rgba(255,255,255,0.5)"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <TouchableOpacity onPress={() => setShowLabels(!showLabels)}>
            <Icon name={showLabels ? "label" : "label-outline"} size={20} color="#FFD700" />
          </TouchableOpacity>
        </View>

        {nodes.length === 0 ? (
          <View style={styles.emptyState}>
            <TouchableOpacity
              style={[styles.glassCard, styles.initialButton]}
              onPress={() => setIsAddingNode(true)}
            >
              <Icon name="account-tree" size={60} color="#FFD700" />
              <Text style={styles.initialText}>Start Your Family Tree</Text>
              <Text style={styles.initialSubText}>Add your first ancestor</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <GestureDetector gesture={combinedGestures}>
            <Animated.View style={[styles.canvasFrame, animatedCanvasStyle]}>
              {renderConnectionLines()}
              {activeNodes.map(node => renderNode(node))}
            </Animated.View>
          </GestureDetector>
        )}

        {/* Member Details Modal */}
        <Modal animationType="fade" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
              <View style={[styles.glassModalCard, { backgroundColor: 'rgba(30, 30, 40, 0.95)' }]}>
                <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                  <Icon name="close" size={24} color="#fff" />
                </TouchableOpacity>

                {selectedMember?.image && (
                  <Image source={{ uri: selectedMember.image }} style={styles.detailedModalAvatar} />
                )}
                <Text style={styles.modalTitle}>{selectedMember?.name}</Text>

                <View style={styles.lifeInfo}>
                  {selectedMember?.birthYear && (
                    <View style={styles.lifeBadge}>
                      <Icon name="cake" size={16} color="#FFD700" />
                      <Text style={styles.lifeText}>Born: {selectedMember.birthYear}</Text>
                    </View>
                  )}
                  {selectedMember?.deathYear && (
                    <View style={styles.lifeBadge}>
                      <Icon name="cloud" size={16} color="#FFD700" />
                      <Text style={styles.lifeText}>Died: {selectedMember.deathYear}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.dataMetaGrid}>
                  <Text style={styles.modalText}>
                    <Icon name="wc" size={16} color="#FFD700" /> {selectedMember?.gender || 'N/A'}
                  </Text>
                  {selectedMember?.location && (
                    <Text style={styles.modalText}>
                      <Icon name="location-on" size={16} color="#FFD700" /> {selectedMember.location}
                    </Text>
                  )}
                </View>

                <View style={styles.familyRelationsSection}>
                  <Text style={styles.sectionTitle}>Family Relations</Text>

                  {familyRelations.spouse && (
                    <TouchableOpacity
                      style={styles.relationCard}
                      onPress={() => {
                        setSelectedMember(familyRelations.spouse);
                        const relations = getFamilyRelations(familyRelations.spouse.id, nodes, edges);
                        setFamilyRelations(relations);
                      }}
                    >
                      <Icon name="favorite" size={20} color="#E91E63" />
                      <View style={styles.relationInfo}>
                        <Text style={styles.relationLabel}>Spouse</Text>
                        <Text style={styles.relationName}>{familyRelations.spouse.name}</Text>
                      </View>
                      <Icon name="chevron-right" size={20} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>
                  )}

                  {familyRelations.mother && (
                    <TouchableOpacity
                      style={styles.relationCard}
                      onPress={() => {
                        setSelectedMember(familyRelations.mother);
                        const relations = getFamilyRelations(familyRelations.mother.id, nodes, edges);
                        setFamilyRelations(relations);
                      }}
                    >
                      <Icon name="woman" size={20} color="#FF69B4" />
                      <View style={styles.relationInfo}>
                        <Text style={styles.relationLabel}>Mother</Text>
                        <Text style={styles.relationName}>{familyRelations.mother.name}</Text>
                      </View>
                      <Icon name="chevron-right" size={20} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>
                  )}

                  {familyRelations.father && (
                    <TouchableOpacity
                      style={styles.relationCard}
                      onPress={() => {
                        setSelectedMember(familyRelations.father);
                        const relations = getFamilyRelations(familyRelations.father.id, nodes, edges);
                        setFamilyRelations(relations);
                      }}
                    >
                      <Icon name="man" size={20} color="#4A90E2" />
                      <View style={styles.relationInfo}>
                        <Text style={styles.relationLabel}>Father</Text>
                        <Text style={styles.relationName}>{familyRelations.father.name}</Text>
                      </View>
                      <Icon name="chevron-right" size={20} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>
                  )}

                  {familyRelations.children.length > 0 && (
                    <View style={styles.childrenSection}>
                      <Text style={styles.subsectionTitle}>
                        <Icon name="child-care" size={16} color="#FFD700" /> Children ({familyRelations.children.length})
                      </Text>
                      {familyRelations.children.map((child, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.childCard}
                          onPress={() => {
                            setSelectedMember(child);
                            const relations = getFamilyRelations(child.id, nodes, edges);
                            setFamilyRelations(relations);
                          }}
                        >
                          <View style={styles.childAvatar}>
                            <Text style={styles.childInitial}>{child.name?.charAt(0) || '?'}</Text>
                          </View>
                          <View style={styles.childInfo}>
                            <Text style={styles.childName}>{child.name}</Text>
                            {child.birthYear && <Text style={styles.childYear}>Born: {child.birthYear}</Text>}
                          </View>
                          <Icon name="chevron-right" size={20} color="rgba(255,255,255,0.5)" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.actionButtonRow}>
                  <TouchableOpacity
                    style={[styles.modalActionBtn, { backgroundColor: '#4A90E2' }]}
                    onPress={() => openAddRelativeModal(selectedMember, 'child')}
                  >
                    <Icon name="child-care" size={20} color="#fff" />
                    <Text style={styles.btnTxt}>Add Child</Text>
                  </TouchableOpacity>
                  {!familyRelations.spouse && (
                    <TouchableOpacity
                      style={[styles.modalActionBtn, { backgroundColor: '#E91E63' }]}
                      onPress={() => openAddRelativeModal(selectedMember, 'spouse')}
                    >
                      <Icon name="favorite" size={20} color="#fff" />
                      <Text style={styles.btnTxt}>Add Spouse</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* Add Member Modal */}
        {/* Member Details Modal */}
        <Modal animationType="fade" transparent visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <ScrollView
              contentContainerStyle={styles.modalScrollContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
              <View style={styles.glassModalCard}>
                <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
                  <Icon name="close" size={24} color="#fff" />
                </TouchableOpacity>

                {selectedMember?.image && (
                  <Image source={{ uri: selectedMember.image }} style={styles.detailedModalAvatar} />
                )}
                <Text style={styles.modalTitle}>{selectedMember?.name}</Text>

                <View style={styles.lifeInfo}>
                  {selectedMember?.birthYear && (
                    <View style={styles.lifeBadge}>
                      <Icon name="cake" size={16} color="#FFD700" />
                      <Text style={styles.lifeText}>Born: {selectedMember.birthYear}</Text>
                    </View>
                  )}
                  {selectedMember?.deathYear && (
                    <View style={styles.lifeBadge}>
                      <Icon name="cloud" size={16} color="#FFD700" />
                      <Text style={styles.lifeText}>Died: {selectedMember.deathYear}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.dataMetaGrid}>
                  <Text style={styles.modalText}>
                    <Icon name="wc" size={16} color="#FFD700" /> {selectedMember?.gender || 'N/A'}
                  </Text>
                  {selectedMember?.location && (
                    <Text style={styles.modalText}>
                      <Icon name="location-on" size={16} color="#FFD700" /> {selectedMember.location}
                    </Text>
                  )}
                </View>

                <View style={styles.familyRelationsSection}>
                  <Text style={styles.sectionTitle}>Family Relations</Text>

                  {familyRelations.spouse && (
                    <TouchableOpacity
                      style={styles.relationCard}
                      onPress={() => {
                        setSelectedMember(familyRelations.spouse);
                        const relations = getFamilyRelations(familyRelations.spouse.id, nodes, edges);
                        setFamilyRelations(relations);
                      }}
                    >
                      <Icon name="favorite" size={20} color="#E91E63" />
                      <View style={styles.relationInfo}>
                        <Text style={styles.relationLabel}>Spouse</Text>
                        <Text style={styles.relationName}>{familyRelations.spouse.name}</Text>
                      </View>
                      <Icon name="chevron-right" size={20} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>
                  )}

                  {familyRelations.mother && (
                    <TouchableOpacity
                      style={styles.relationCard}
                      onPress={() => {
                        setSelectedMember(familyRelations.mother);
                        const relations = getFamilyRelations(familyRelations.mother.id, nodes, edges);
                        setFamilyRelations(relations);
                      }}
                    >
                      <Icon name="woman" size={20} color="#FF69B4" />
                      <View style={styles.relationInfo}>
                        <Text style={styles.relationLabel}>Mother</Text>
                        <Text style={styles.relationName}>{familyRelations.mother.name}</Text>
                      </View>
                      <Icon name="chevron-right" size={20} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>
                  )}

                  {familyRelations.father && (
                    <TouchableOpacity
                      style={styles.relationCard}
                      onPress={() => {
                        setSelectedMember(familyRelations.father);
                        const relations = getFamilyRelations(familyRelations.father.id, nodes, edges);
                        setFamilyRelations(relations);
                      }}
                    >
                      <Icon name="man" size={20} color="#4A90E2" />
                      <View style={styles.relationInfo}>
                        <Text style={styles.relationLabel}>Father</Text>
                        <Text style={styles.relationName}>{familyRelations.father.name}</Text>
                      </View>
                      <Icon name="chevron-right" size={20} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>
                  )}

                  {familyRelations.children.length > 0 && (
                    <View style={styles.childrenSection}>
                      <Text style={styles.subsectionTitle}>
                        <Icon name="child-care" size={16} color="#FFD700" /> Children ({familyRelations.children.length})
                      </Text>
                      {familyRelations.children.map((child, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.childCard}
                          onPress={() => {
                            setSelectedMember(child);
                            const relations = getFamilyRelations(child.id, nodes, edges);
                            setFamilyRelations(relations);
                          }}
                        >
                          <View style={styles.childAvatar}>
                            <Text style={styles.childInitial}>{child.name?.charAt(0) || '?'}</Text>
                          </View>
                          <View style={styles.childInfo}>
                            <Text style={styles.childName}>{child.name}</Text>
                            {child.birthYear && <Text style={styles.childYear}>Born: {child.birthYear}</Text>}
                          </View>
                          <Icon name="chevron-right" size={20} color="rgba(255,255,255,0.5)" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.actionButtonRow}>
                  <TouchableOpacity
                    style={[styles.modalActionBtn, { backgroundColor: '#4A90E2' }]}
                    onPress={() => openAddRelativeModal(selectedMember, 'child')}
                  >
                    <Icon name="child-care" size={20} color="#fff" />
                    <Text style={styles.btnTxt}>Add Child</Text>
                  </TouchableOpacity>
                  {!familyRelations.spouse && (
                    <TouchableOpacity
                      style={[styles.modalActionBtn, { backgroundColor: '#E91E63' }]}
                      onPress={() => openAddRelativeModal(selectedMember, 'spouse')}
                    >
                      <Icon name="favorite" size={20} color="#fff" />
                      <Text style={styles.btnTxt}>Add Spouse</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </ScrollView>
          </View>
        </Modal>

        {/* Add Member Modal */}
        <Modal animationType="slide" transparent visible={isAddingNode} onRequestClose={() => setIsAddingNode(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.glassModalCard}>
              <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%' }}>
                <Text style={styles.modalTitle}>
                  {nodes.length === 0 ? '🌳 Start Your Family Tree' : `➕ Add ${relationType === 'child' ? 'Child' : 'Spouse'}`}
                </Text>

                <TouchableOpacity style={styles.avatarPickerTrigger} onPress={handlePickImage}>
                  {formImage ? (
                    <Image source={{ uri: formImage }} style={styles.formImagePreview} />
                  ) : (
                    <View style={styles.avatarPlaceholderLarge}>
                      <Icon name="add-a-photo" size={32} color="rgba(255,255,255,0.6)" />
                      <Text style={styles.avatarPickerText}>Add Photo</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TextInput
                  placeholder="Full Name *"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  style={styles.glassInput}
                  value={formName}
                  onChangeText={setFormName}
                />

                <View style={styles.dateRow}>
                  <TextInput
                    placeholder="Birth date (DD-MM-YYYY)" 
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    keyboardType="default" 
                    maxLength={10}
                    style={styles.dateInput}
                    value={formBirth}
                    onChangeText={setFormBirth}
                  />
                  <TextInput
                    placeholder="Death date (DD-MM-YYYY)"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    keyboardType="default"
                    maxLength={10}
                    style={styles.dateInput}
                    value={formDeath}
                    onChangeText={setFormDeath}
                  />
                </View>

                <View style={styles.genderSelector}>
                  <TouchableOpacity
                    style={[styles.genderOption, formGender === 'male' && styles.genderOptionActive]}
                    onPress={() => setFormGender('male')}
                  >
                    <Icon name="male" size={22} color={formGender === 'male' ? '#000' : 'rgba(255,255,255,0.6)'} />
                    <Text style={[styles.genderOptionText, formGender === 'male' && styles.genderOptionTextActive]}>Male</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.genderOption, formGender === 'female' && styles.genderOptionActive]}
                    onPress={() => setFormGender('female')}
                  >
                    <Icon name="female" size={22} color={formGender === 'female' ? '#000' : 'rgba(255,255,255,0.6)'} />
                    <Text style={[styles.genderOptionText, formGender === 'female' && styles.genderOptionTextActive]}>Female</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  placeholder="Location / Birthplace"
                  placeholderTextColor="rgba(255,255,255,0.4)"
                  style={styles.glassInput}
                  value={formLocation}
                  onChangeText={setFormLocation}
                />

                <View style={styles.formButtonActions}>
                  <TouchableOpacity
                    style={[styles.modalActionBtn, { backgroundColor: '#4CAF50', flex: 2, opacity: isSaving ? 0.6 : 1 }]}
                    onPress={nodes.length === 0 ? handleCreateRoot : handleAddRelative}
                    disabled={isSaving}
                  >
                    {isSaving ? <ActivityIndicator size="small" color="#fff" /> : (
                      <>
                        <Icon name="save" size={20} color="#fff" />
                        <Text style={styles.btnTxt}>Save</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: 'rgba(255,0,0,0.5)', flex: 1 }]} onPress={clearForm}>
                    <Text style={styles.btnTxt}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>

      </View>
    </GestureHandlerRootView>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  canvasFrame: { ...StyleSheet.absoluteFillObject, width: SCREEN_WIDTH * 3, height: SCREEN_HEIGHT * 3 },
  zoomIndicator: { position: 'absolute', top: Platform.OS === 'ios' ? 100 : 70, right: 20, backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, zIndex: 1000 },
  zoomText: { color: '#FFD700', fontSize: 12, fontWeight: 'bold' },
  blurSearchWrapper: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 30, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 25, borderWidth: 1, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.8)' },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 16, color: '#fff' },
  glassCard: { borderWidth: 1, borderColor: 'rgba(255, 215, 0, 0.3)', borderRadius: 24, padding: 32, backgroundColor: 'rgba(255, 255, 255, 0.08)' },
  initialButton: { alignItems: 'center', justifyContent: 'center' },
  initialText: { color: '#FFD700', marginTop: 16, fontWeight: 'bold', fontSize: 20 },
  initialSubText: { color: '#fff', marginTop: 8, fontSize: 14, opacity: 0.7 },
  orbInnerContent: { width: '100%', height: '100%', borderRadius: 100, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  avatarImage: { width: '100%', height: '100%' },
  avatarPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  avatarPlaceholderLarge: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,215,0,0.3)', borderStyle: 'dashed' },
  avatarPickerText: { color: '#fff', fontSize: 11, marginTop: 6 },
  initialTextChar: { color: '#fff', fontSize: 40, fontWeight: 'bold' },
  rootText: { fontSize: 48, color: '#FFD700' },
  deceasedBadge: { position: 'absolute', bottom: -5, right: -5, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 12, padding: 4 },
  floatingLabelContainer: { position: 'absolute', bottom: -45, left: -35, right: -35, backgroundColor: 'rgba(0, 0, 0, 0.85)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)', alignItems: 'center' },
  rootLabelContainer: { borderColor: '#FFD700', borderWidth: 2 },
  nodeMiniatureName: { color: '#FFD700', fontSize: 12, fontWeight: 'bold', textAlign: 'center' },
  rootName: { fontSize: 14, color: '#FFD700' },
  nodeMiniatureYear: { color: 'rgba(255,255,255,0.6)', fontSize: 9, marginTop: 2 },

  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  modalScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20,
  },

  glassModalCard: {
    width: SCREEN_WIDTH - 40,
    maxWidth: 400,
    maxHeight: SCREEN_HEIGHT - 80,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
    alignItems: 'center',
    backgroundColor: 'rgba(30, 30, 40, 0.98)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 5,
  },

  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 6,
  },

  detailedModalAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FFD700',
    marginTop: 8,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 16,
    textAlign: 'center'
  },

  lifeInfo: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
    flexWrap: 'wrap',
    justifyContent: 'center'
  },

  lifeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
    gap: 4
  },

  lifeText: {
    color: '#fff',
    fontSize: 12
  },

  dataMetaGrid: {
    width: '100%',
    marginBottom: 16,
    gap: 6
  },

  modalText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    gap: 6,
    textAlign: 'center',
  },

  familyRelationsSection: {
    width: '100%',
    marginBottom: 16,
    maxHeight: 220,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFD700',
    marginBottom: 10,
    textAlign: 'center'
  },

  subsectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFD700',
    marginBottom: 6,
    marginTop: 6
  },

  relationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 10,
    borderRadius: 10,
    marginBottom: 6,
    gap: 10
  },

  relationInfo: {
    flex: 1
  },

  relationLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 11
  },

  relationName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500'
  },

  childrenSection: {
    marginTop: 6,
  },

  childCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 5,
    gap: 10
  },

  childAvatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    backgroundColor: 'rgba(74, 144, 226, 0.3)',
    justifyContent: 'center',
    alignItems: 'center'
  },

  childInitial: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },

  childInfo: {
    flex: 1
  },

  childName: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '500'
  },

  childYear: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10
  },

  actionButtonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    gap: 12,
    marginTop: 8,
  },

  modalActionBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12
  },

  btnTxt: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14
  },

  avatarPickerTrigger: {
    width: 90,
    height: 90,
    borderRadius: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    overflow: 'hidden',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
    backgroundColor: 'rgba(255,255,255,0.03)'
  },

  avatarPlaceholderLarge: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4
  },

  avatarPickerText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 11,
  },

  formImagePreview: {
    width: '100%',
    height: '100%'
  },

  glassInput: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 48,
    color: '#fff',
    fontSize: 14,
    marginBottom: 12
  },

  dateRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    width: '100%'
  },

  dateInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.2)',
    borderRadius: 12,
    paddingHorizontal: 14,
    minHeight: 58,
    color: '#fff',
    fontSize: 14,
  },

  genderSelector: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    width: '100%'
  },

  genderOption: {
    flex: 1,
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'transparent'
  },

  genderOptionActive: {
    backgroundColor: '#FFD700',
    borderColor: '#FFD700'
  },

  genderOptionText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14
  },

  genderOptionTextActive: {
    color: '#000',
    fontWeight: 'bold'
  },

  formButtonActions: {
    flexDirection: 'row',
    marginTop: 8,
    width: '100%',
    gap: 12
  },
});
