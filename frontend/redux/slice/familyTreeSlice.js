import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  treeData: {
    nodes: [],
    edges: [],
  },
  zoomLevel: 1,
  centerPosition: { x: 0, y: 0 },
  selectedMember: null,
  isLoading: false,
  error: null,
};

const familyTreeSlice = createSlice({
  name: 'familyTree',
  initialState,
  reducers: {
    setTreeData: (state, action) => {
      state.treeData = action.payload;
    },
    addMember: (state, action) => {
      state.treeData.nodes.push(action.payload);
    },
    updateMember: (state, action) => {
      const index = state.treeData.nodes.findIndex(
        (node) => node.id === action.payload.id
      );
      if (index !== -1) {
        state.treeData.nodes[index] = action.payload;
      }
    },
    deleteMember: (state, action) => {
      state.treeData.nodes = state.treeData.nodes.filter(
        (node) => node.id !== action.payload
      );
      state.treeData.edges = state.treeData.edges.filter(
        (edge) => edge.from !== action.payload && edge.to !== action.payload
      );
    },
    setZoom: (state, action) => {
      state.zoomLevel = action.payload;
    },
    setCenter: (state, action) => {
      state.centerPosition = action.payload;
    },
    selectMember: (state, action) => {
      state.selectedMember = action.payload;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const {
  setTreeData,
  addMember,
  updateMember,
  deleteMember,
  setZoom,
  setCenter,
  selectMember,
  setLoading,
  setError,
} = familyTreeSlice.actions;

export default familyTreeSlice.reducer;