import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  realtimeService, 
  type WebSocketMessage, 
  type DocumentProcessingUpdate,
  type AIQueryUpdate,
  type SystemNotification
} from '@/lib/services/websocket';
import { toast } from '@/components/ui/sonner';

export interface RealTimeStatus {
  isConnected: boolean;
  connectionState: string;
  lastUpdate: string | null;
}

export interface DocumentProcessingState {
  [documentId: string]: {
    status: 'uploading' | 'processing' | 'analyzing' | 'completed' | 'failed';
    progress: number;
    message: string;
    stage?: string;
    error?: string;
    lastUpdate: string;
  };
}

export interface AIQueryState {
  [queryId: string]: {
    status: 'processing' | 'completed' | 'failed';
    progress: number;
    message: string;
    response?: string;
    error?: string;
    lastUpdate: string;
  };
}

/**
 * Hook for managing real-time WebSocket connection status
 */
export function useRealTimeStatus(): RealTimeStatus {
  const [status, setStatus] = useState<RealTimeStatus>({
    isConnected: realtimeService.isConnected,
    connectionState: realtimeService.connectionState,
    lastUpdate: null
  });

  useEffect(() => {
    // Connect to WebSocket
    realtimeService.connect();

    // Set up status polling
    const statusInterval = setInterval(() => {
      setStatus(prev => ({
        ...prev,
        isConnected: realtimeService.isConnected,
        connectionState: realtimeService.connectionState
      }));
    }, 1000);

    // Subscribe to all messages to track last update
    const unsubscribe = realtimeService.subscribe('all', () => {
      setStatus(prev => ({
        ...prev,
        lastUpdate: new Date().toISOString()
      }));
    });

    return () => {
      clearInterval(statusInterval);
      unsubscribe();
    };
  }, []);

  return status;
}

/**
 * Hook for tracking document processing updates
 */
export function useDocumentProcessing(documentId?: string) {
  const [processingStates, setProcessingStates] = useState<DocumentProcessingState>({});
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const unsubscribe = realtimeService.subscribe('document_processing', (message: WebSocketMessage) => {
      const update = message.payload as DocumentProcessingUpdate;
      
      setProcessingStates(prev => ({
        ...prev,
        [update.documentId]: {
          status: update.status,
          progress: update.progress,
          message: update.message,
          stage: update.stage,
          error: update.error,
          lastUpdate: message.timestamp
        }
      }));

      // Update global processing state
      setIsProcessing(update.status !== 'completed' && update.status !== 'failed');

      // Show toast notifications for important updates
      if (update.status === 'completed') {
        toast.success('Document processing completed', {
          description: update.message
        });
      } else if (update.status === 'failed') {
        toast.error('Document processing failed', {
          description: update.error || update.message
        });
      }
    });

    return unsubscribe;
  }, []);

  // Get processing state for specific document
  const getDocumentState = useCallback((docId: string) => {
    return processingStates[docId] || null;
  }, [processingStates]);

  // Get processing state for current document (if specified)
  const currentDocumentState = documentId ? processingStates[documentId] || null : null;

  return {
    processingStates,
    isProcessing,
    getDocumentState,
    currentDocumentState
  };
}

/**
 * Hook for tracking AI query updates
 */
export function useAIQueryUpdates(queryId?: string) {
  const [queryStates, setQueryStates] = useState<AIQueryState>({});
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const unsubscribe = realtimeService.subscribe('ai_query', (message: WebSocketMessage) => {
      const update = message.payload as AIQueryUpdate;
      
      setQueryStates(prev => ({
        ...prev,
        [update.queryId]: {
          status: update.status,
          progress: update.progress,
          message: update.message,
          response: update.response,
          error: update.error,
          lastUpdate: message.timestamp
        }
      }));

      // Update global processing state
      setIsProcessing(update.status === 'processing');

      // Show toast notifications for completed queries
      if (update.status === 'completed') {
        toast.success('AI query completed');
      } else if (update.status === 'failed') {
        toast.error('AI query failed', {
          description: update.error || update.message
        });
      }
    });

    return unsubscribe;
  }, []);

  // Get query state for specific query
  const getQueryState = useCallback((qId: string) => {
    return queryStates[qId] || null;
  }, [queryStates]);

  // Get query state for current query (if specified)
  const currentQueryState = queryId ? queryStates[queryId] || null : null;

  return {
    queryStates,
    isProcessing,
    getQueryState,
    currentQueryState
  };
}

/**
 * Hook for receiving system notifications
 */
export function useSystemNotifications() {
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const notificationTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    const unsubscribe = realtimeService.subscribe('system_notification', (message: WebSocketMessage) => {
      const notification = message.payload as SystemNotification;
      
      // Add notification to state
      setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10

      // Show toast notification
      const toastOptions = {
        description: notification.message,
        action: notification.action ? {
          label: notification.action.label,
          onClick: () => window.open(notification.action!.url, '_blank')
        } : undefined
      };

      switch (notification.type) {
        case 'success':
          toast.success(notification.title, toastOptions);
          break;
        case 'warning':
          toast.warning(notification.title, toastOptions);
          break;
        case 'error':
          toast.error(notification.title, toastOptions);
          break;
        default:
          toast.info(notification.title, toastOptions);
      }

      // Auto-remove notification after 30 seconds
      const timeout = setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== notification.id));
        notificationTimeouts.current.delete(notification.id);
      }, 30000);

      notificationTimeouts.current.set(notification.id, timeout);
    });

    return () => {
      unsubscribe();
      // Clear all timeouts
      notificationTimeouts.current.forEach(timeout => clearTimeout(timeout));
      notificationTimeouts.current.clear();
    };
  }, []);

  const dismissNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    
    const timeout = notificationTimeouts.current.get(notificationId);
    if (timeout) {
      clearTimeout(timeout);
      notificationTimeouts.current.delete(notificationId);
    }
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    notificationTimeouts.current.forEach(timeout => clearTimeout(timeout));
    notificationTimeouts.current.clear();
  }, []);

  return {
    notifications,
    dismissNotification,
    clearAllNotifications
  };
}

/**
 * Combined hook for all real-time features
 */
export function useRealTime(options?: {
  documentId?: string;
  queryId?: string;
  enableNotifications?: boolean;
}) {
  const status = useRealTimeStatus();
  const documentProcessing = useDocumentProcessing(options?.documentId);
  const aiQueries = useAIQueryUpdates(options?.queryId);
  const notifications = options?.enableNotifications !== false 
    ? useSystemNotifications() 
    : { notifications: [], dismissNotification: () => {}, clearAllNotifications: () => {} };

  return {
    status,
    documentProcessing,
    aiQueries,
    notifications
  };
}

/**
 * Hook for simulating real-time updates in development
 */
export function useRealTimeSimulation() {
  const simulateDocumentProcessing = useCallback((documentId: string) => {
    if (import.meta.env.DEV && 'simulateDocumentProcessing' in realtimeService) {
      (realtimeService as any).simulateDocumentProcessing(documentId);
    }
  }, []);

  const simulateAIQuery = useCallback((queryId: string) => {
    if (import.meta.env.DEV && 'simulateAIQuery' in realtimeService) {
      (realtimeService as any).simulateAIQuery(queryId);
    }
  }, []);

  const simulateSystemNotification = useCallback((notification: Omit<SystemNotification, 'id'>) => {
    realtimeService.sendSystemNotification({
      id: `notification_${Date.now()}`,
      ...notification
    });
  }, []);

  return {
    simulateDocumentProcessing,
    simulateAIQuery,
    simulateSystemNotification
  };
}
