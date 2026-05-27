// services/treeService.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Platform } from 'react-native';

const getBaseUrl = () => {
  if (Platform.OS === 'android') {
    return 'http://192.168.0.223:5000/api';
  }
  return 'http://localhost:5000/api';
};

const API_URL = getBaseUrl();

console.log(`[API Service] Using API URL: ${API_URL}`);

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor
api.interceptors.request.use(
  async (config) => {
    console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('[API Request] Token added');
      } else {
        console.log('[API Request] No token found');
      }
    } catch (error) {
      console.log('[API Request] Error getting token:', error);
    }
    return config;
  },
  (error) => {
    console.log('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} - ${response.config.url}`);
    return response;
  },
  async (error) => {
    console.log('[API Response Error]');
    if (error.response) {
      console.log('Status:', error.response.status);
      console.log('Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.log('No response received - Backend might not be running');
      console.log('Request URL:', error.config?.url);
    } else {
      console.log('Error:', error.message);
    }
    
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export const treeService = {
  createTree: async (name) => {
    try {
      const response = await api.post('/tree/create', { name });
      console.log('Create tree response:', response.data);
      return { success: true, tree: response.data.tree };
    } catch (error) {
      console.error('Create tree error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  getTree: async (treeId) => {
    try {
      console.log('=== GET TREE CALLED ===');
      console.log('Tree ID:', treeId);
      
      // Get members for this tree
      const response = await api.get(`/members/${treeId}`);
      console.log('Response status:', response.status);
      console.log('Response data:', JSON.stringify(response.data, null, 2));
      
      // Extract members from response
      let members = [];
      if (response.data && response.data.success && response.data.members) {
        members = response.data.members;
      } else if (response.data && Array.isArray(response.data)) {
        members = response.data;
      } else if (response.data && response.data.members && Array.isArray(response.data.members)) {
        members = response.data.members;
      }
      
      console.log(`Found ${members.length} members`);
      
      // Build nodes from members with normalized IDs and empty relationship arrays
      const nodes = members.map(member => {
        const id = member._id?.toString();
        return ({
          id,
          name: member.name,
          birthYear: member.birthDate ? new Date(member.birthDate).getFullYear().toString() : '',
          deathYear: member.deathDate ? new Date(member.deathDate).getFullYear().toString() : '',
          gender: member.gender,
          location: member.bio || '',
          image: member.avatar,
          parents: Array.isArray(member.parents) ? member.parents.map(p => p.toString()) : [],
          spouse: member.spouse ? member.spouse.toString() : null,
          children: Array.isArray(member.children) ? member.children.map(c => c.toString()) : [],
          x: 0,
          y: 0,
          generation: 0
        });
      });
      
      const nodesById = new Map(nodes.map(node => [node.id, node]));
      
      // Build edges from relationships and populate missing children relationships
      const edges = [];
      const processedRelations = new Set();
      
      nodes.forEach(node => {
        // Handle parent-child relationships
        if (Array.isArray(node.parents) && node.parents.length > 0) {
          node.parents.forEach(parentId => {
            if (!parentId) return;
            const edgeKey = `${parentId}-${node.id}-parent-child`;
            if (!processedRelations.has(edgeKey)) {
              edges.push({
                from: parentId,
                to: node.id,
                type: 'parent-child'
              });
              processedRelations.add(edgeKey);
            }

            const parentNode = nodesById.get(parentId);
            if (parentNode && !parentNode.children.includes(node.id)) {
              parentNode.children.push(node.id);
            }
          });
        }
        
        // Handle spouse relationships
        if (node.spouse) {
          const edgeKey = [node.id, node.spouse].sort().join('-') + '-spouse';
          if (!processedRelations.has(edgeKey)) {
            edges.push({
              from: node.id,
              to: node.spouse,
              type: 'spouse'
            });
            processedRelations.add(edgeKey);
          }
        }
      });
      
      // Ensure children arrays are derived from relationships when missing
      edges.forEach(edge => {
        if (edge.type === 'parent-child') {
          const parentNode = nodesById.get(edge.from);
          const childNode = nodesById.get(edge.to);
          if (parentNode && childNode && !parentNode.children.includes(childNode.id)) {
            parentNode.children.push(childNode.id);
          }
          if (childNode && parentNode && !childNode.parents.includes(parentNode.id)) {
            childNode.parents.push(parentNode.id);
          }
        }
      });
      
      console.log(`Built ${nodes.length} nodes and ${edges.length} edges`);
      
      return { 
        success: true, 
        nodes: nodes,
        edges: edges
      };
      
    } catch (error) {
      console.error('Get tree error:', error);
      console.error('Error details:', error.response?.data);
      return { 
        success: false, 
        nodes: [], 
        edges: [], 
        error: error.response?.data?.message || error.message 
      };
    }
  },

  addMember: async (memberData) => {
    try {
      console.log('Adding member with data:', JSON.stringify(memberData, null, 2));
      const response = await api.post('/members/add', memberData);
      console.log('Add member response:', response.data);
      
      if (response.data && response.data.success && response.data.member) {
        return { success: true, member: response.data.member };
      }
      
      return { success: false, error: 'Invalid response from server' };
    } catch (error) {
      console.error('Add member error details:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  updateMember: async (memberId, memberData) => {
    try {
      const response = await api.put(`/members/${memberId}`, memberData);
      return { success: true, member: response.data.member };
    } catch (error) {
      console.error('Update member error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },

  deleteMember: async (memberId) => {
    try {
      const response = await api.delete(`/members/${memberId}`);
      return { success: true };
    } catch (error) {
      console.error('Delete member error:', error.response?.data || error.message);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  },
  
  getTreeDetails: async (treeId) => {
    try {
      const response = await api.get(`/tree/${treeId}`);
      return { success: true, tree: response.data.tree };
    } catch (error) {
      console.error('Get tree details error:', error);
      return { success: false, error: error.response?.data?.message || error.message };
    }
  }
};

export default api;