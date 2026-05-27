// Simple tree layout algorithm for family tree positioning
export const calculateTreeLayout = (nodes, edges) => {
  // Find root nodes (those with no parents)
  const childrenMap = new Map();
  edges.forEach(edge => {
    if (!childrenMap.has(edge.from)) {
      childrenMap.set(edge.from, []);
    }
    childrenMap.get(edge.from).push(edge.to);
  });
  
  const parentMap = new Map();
  edges.forEach(edge => {
    parentMap.set(edge.to, edge.from);
  });
  
  const roots = nodes.filter(node => !parentMap.has(node.id));
  
  // Calculate positions recursively
  const positions = new Map();
  const levels = new Map();
  
  const calculatePositions = (nodeId, level, xOffset) => {
    levels.set(nodeId, level);
    const node = nodes.find(n => n.id === nodeId);
    const x = xOffset;
    const y = -level * 2;
    positions.set(nodeId, { x, y });
    
    const children = childrenMap.get(nodeId) || [];
    const childrenCount = children.length;
    const childSpacing = 1.5;
    let childXOffset = xOffset - (childrenCount - 1) * childSpacing / 2;
    
    children.forEach((child, index) => {
      calculatePositions(child, level + 1, childXOffset + index * childSpacing);
    });
  };
  
  let rootXOffset = 0;
  roots.forEach((root, index) => {
    calculatePositions(root.id, 0, rootXOffset);
    rootXOffset += 4;
  });
  
  return positions;
};

export const getNodeConnections = (edges, nodeId) => {
  const connections = edges.filter(edge => edge.from === nodeId || edge.to === nodeId);
  return connections;
};