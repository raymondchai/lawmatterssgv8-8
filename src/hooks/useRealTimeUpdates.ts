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
    // Skip realtime connections in production to avoid console errors
    console.log('Skipping realtime connections - disabled in production');
    setStatus({
      isConnected: false,
      connectionState: 'disabled',
      lastUpdate: null
    });
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
    // Skip real-time subscriptions - disabled in production
    console.log('Skipping document processing real-time subscription - disabled');
    return () => {}; // Return empty cleanup function
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
    // Skip real-time subscriptions - disabled in production
    console.log('Skipping AI query real-time subscription - disabled');
    return () => {}; // Return empty cleanup function
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
    // Skip real-time subscriptions - disabled in production
    console.log('Skipping system notifications real-time subscription - disabled');
    return () => {}; // Return empty cleanup function
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
