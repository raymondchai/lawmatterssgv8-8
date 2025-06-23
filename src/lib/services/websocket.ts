import { supabase } from '@/lib/supabase';

export interface WebSocketMessage {
  type: 'document_processing' | 'ai_query' | 'system_notification' | 'user_activity';
  payload: any;
  timestamp: string;
  userId?: string;
  documentId?: string;
}

export interface DocumentProcessingUpdate {
  documentId: string;
  status: 'uploading' | 'processing' | 'analyzing' | 'completed' | 'failed';
  progress: number;
  message: string;
  stage?: string;
  error?: string;
}

export interface AIQueryUpdate {
  queryId: string;
  status: 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  response?: string;
  error?: string;
}

export interface SystemNotification {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  action?: {
    label: string;
    url: string;
  };
}

export type WebSocketEventHandler = (message: WebSocketMessage) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private handlers: Map<string, WebSocketEventHandler[]> = new Map();
  private isConnecting = false;
  private userId: string | null = null;

  constructor() {
    // Only set up auth listener in production
    if (!import.meta.env.DEV) {
      this.setupAuthListener();
    }
  }

  private setupAuthListener() {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        this.userId = session.user.id;
        this.connect();
      } else if (event === 'SIGNED_OUT') {
        this.userId = null;
        this.disconnect();
      }
    });
  }

  async connect(): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    if (!this.userId) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        console.warn('Cannot connect WebSocket: No authenticated user');
        return;
      }
      this.userId = session.user.id;
    }

    this.isConnecting = true;

    try {
      // Get WebSocket URL from environment or construct it
      const wsUrl = this.getWebSocketUrl();
      
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        
        // Send authentication message
        this.send({
          type: 'auth',
          payload: { userId: this.userId },
          timestamp: new Date().toISOString()
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        this.isConnecting = false;
        this.ws = null;

        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnecting = false;
      };

    } catch (error) {
      console.error('Error connecting WebSocket:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private getWebSocketUrl(): string {
    // For development, use a mock WebSocket server or fallback
    const isDev = import.meta.env.DEV;
    
    if (isDev) {
      // In development, we'll simulate WebSocket with a mock implementation
      return 'ws://localhost:3001/ws';
    }

    // In production, use Supabase Realtime or your WebSocket server
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (supabaseUrl) {
      return supabaseUrl.replace('https://', 'wss://') + '/realtime/v1/websocket';
    }

    throw new Error('WebSocket URL not configured');
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  private send(message: WebSocketMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message:', message);
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    const handlers = this.handlers.get(message.type) || [];
    handlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in WebSocket message handler:', error);
      }
    });

    // Also trigger handlers for 'all' events
    const allHandlers = this.handlers.get('all') || [];
    allHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in WebSocket all-events handler:', error);
      }
    });
  }

  // Subscribe to specific message types
  subscribe(type: string, handler: WebSocketEventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    
    this.handlers.get(type)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(type);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  // Send document processing update
  sendDocumentProcessingUpdate(update: DocumentProcessingUpdate): void {
    this.send({
      type: 'document_processing',
      payload: update,
      timestamp: new Date().toISOString(),
      userId: this.userId || undefined,
      documentId: update.documentId
    });
  }

  // Send AI query update
  sendAIQueryUpdate(update: AIQueryUpdate): void {
    this.send({
      type: 'ai_query',
      payload: update,
      timestamp: new Date().toISOString(),
      userId: this.userId || undefined
    });
  }

  // Send system notification
  sendSystemNotification(notification: SystemNotification): void {
    this.send({
      type: 'system_notification',
      payload: notification,
      timestamp: new Date().toISOString(),
      userId: this.userId || undefined
    });
  }

  // Get connection status
  get isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  get connectionState(): string {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'closing';
      case WebSocket.CLOSED: return 'closed';
      default: return 'unknown';
    }
  }
}

// Create singleton instance
export const webSocketService = new WebSocketService();

// Mock WebSocket implementation for development
class MockWebSocketService {
  private mockTimers: NodeJS.Timeout[] = [];
  private handlers: Map<string, WebSocketEventHandler[]> = new Map();

  async connect(): Promise<void> {
    console.log('Mock WebSocket: Connected');

    // Simulate connection delay
    setTimeout(() => {
      console.log('Mock WebSocket: Authentication successful');
    }, 100);
  }

  disconnect(): void {
    console.log('Mock WebSocket: Disconnected');
    this.mockTimers.forEach(timer => clearTimeout(timer));
    this.mockTimers = [];
  }

  send(message: WebSocketMessage): void {
    console.log('Mock WebSocket: Sending message', message);
  }

  subscribe(type: string, handler: WebSocketEventHandler): () => void {
    console.log(`Mock WebSocket: Subscribing to ${type}`);

    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }

    this.handlers.get(type)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(type);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  private handleMessage(message: WebSocketMessage): void {
    const handlers = this.handlers.get(message.type) || [];
    const allHandlers = this.handlers.get('all') || [];

    [...handlers, ...allHandlers].forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error('Error in WebSocket message handler:', error);
      }
    });
  }

  // Simulate document processing updates
  simulateDocumentProcessing(documentId: string): void {
    const stages = [
      { status: 'uploading', progress: 20, message: 'Uploading document...' },
      { status: 'processing', progress: 40, message: 'Processing document...' },
      { status: 'analyzing', progress: 70, message: 'Analyzing content...' },
      { status: 'completed', progress: 100, message: 'Document processing completed' }
    ];

    stages.forEach((stage, index) => {
      const timer = setTimeout(() => {
        this.handleMessage({
          type: 'document_processing',
          payload: {
            documentId,
            ...stage
          } as DocumentProcessingUpdate,
          timestamp: new Date().toISOString(),
          documentId
        });
      }, (index + 1) * 2000);

      this.mockTimers.push(timer);
    });
  }

  // Simulate AI query updates
  simulateAIQuery(queryId: string): void {
    const updates = [
      { status: 'processing', progress: 30, message: 'Processing your query...' },
      { status: 'processing', progress: 70, message: 'Generating response...' },
      { status: 'completed', progress: 100, message: 'Response ready', response: 'Mock AI response' }
    ];

    updates.forEach((update, index) => {
      const timer = setTimeout(() => {
        this.handleMessage({
          type: 'ai_query',
          payload: {
            queryId,
            ...update
          } as AIQueryUpdate,
          timestamp: new Date().toISOString()
        });
      }, (index + 1) * 1500);

      this.mockTimers.push(timer);
    });
  }

  get isConnected(): boolean {
    return true; // Always connected in mock mode
  }

  get connectionState(): string {
    return 'connected';
  }
}

// Export the appropriate service based on environment
export const realtimeService = import.meta.env.DEV 
  ? new MockWebSocketService() 
  : webSocketService;
