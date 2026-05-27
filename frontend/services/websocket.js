import io from 'socket.io-client';

const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'http://localhost:5000';

class WebSocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    this.socket = io(WS_URL);
    
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
    });
    
    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });
    
    return this.socket;
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinTree(treeId) {
    if (this.socket) {
      this.socket.emit('join-tree', treeId);
    }
  }

  leaveTree(treeId) {
    if (this.socket) {
      this.socket.emit('leave-tree', treeId);
    }
  }

  emitTreeUpdate(data) {
    if (this.socket) {
      this.socket.emit('tree-update', data);
    }
  }

  onTreeUpdated(callback) {
    if (this.socket) {
      this.socket.on('tree-updated', callback);
    }
  }

  offTreeUpdated() {
    if (this.socket) {
      this.socket.off('tree-updated');
    }
  }
}

export default new WebSocketService();