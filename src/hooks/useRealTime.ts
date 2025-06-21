import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  realTimeService, 
  type UserPresence, 
  type DocumentProcessingUpdate, 
  type CollaborationUpdate,
  type RealTimeEvent 
} from '@/lib/services/realTimeService';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/components/ui/sonner';

// Hook for document processing updates
export const useDocumentProcessing = (documentId: string) => {
  const [processingStatus, setProcessingStatus] = useState<DocumentProcessingUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!documentId) return;

    setIsConnected(true);
    
    const unsubscribe = realTimeService.subscribeToDocumentProcessing(
      documentId,
      (update) => {
        setProcessingStatus(update);
        
        // Show toast notifications for status changes
        if (update.status === 'completed') {
          toast.success('Document processing completed!');
        } else if (update.status === 'failed') {
          toast.error(`Document processing failed: ${update.error_message || 'Unknown error'}`);
        }
      }
    );

    return () => {
      unsubscribe();
      setIsConnected(false);
    };
  }, [documentId]);

  return {
    processingStatus,
    isConnected
  };
};

// Hook for user presence in collaborative documents
export const useUserPresence = (documentId: string) => {
  const [presenceData, setPresenceData] = useState<UserPresence[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();
  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!documentId || !user) return;

    setIsConnected(true);

    const unsubscribe = realTimeService.subscribeToUserPresence(
      documentId,
      user.id,
      (presence) => {
        setPresenceData(presence);
      }
    );

    unsubscribeRef.current = unsubscribe;

    return () => {
      unsubscribe();
      setIsConnected(false);
    };
  }, [documentId, user]);

  const updatePresence = useCallback(async (updates: Partial<UserPresence>) => {
    if (documentId && user) {
      await realTimeService.updatePresence(documentId, {
        user_id: user.id,
        document_id: documentId,
        ...updates
      });
    }
  }, [documentId, user]);

  const updateCurrentPage = useCallback((pageNumber: number) => {
    updatePresence({ current_page: pageNumber });
  }, [updatePresence]);

  const setStatus = useCallback((status: 'online' | 'away' | 'offline') => {
    updatePresence({ 
      status, 
      last_seen: new Date().toISOString() 
    });
  }, [updatePresence]);

  return {
    presenceData,
    isConnected,
    updateCurrentPage,
    setStatus,
    updatePresence
  };
};

// Hook for real-time annotations
export const useRealTimeAnnotations = (documentId: string) => {
  const [realtimeEvents, setRealtimeEvents] = useState<RealTimeEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!documentId) return;

    setIsConnected(true);

    const unsubscribe = realTimeService.subscribeToDocumentAnnotations(
      documentId,
      (event) => {
        setRealtimeEvents(prev => [...prev.slice(-49), event]); // Keep last 50 events
        
        // Show notifications for other users' actions
        if (event.type === 'annotation_change' && event.payload.event_type === 'INSERT') {
          toast.info('New annotation added by collaborator');
        }
      }
    );

    return () => {
      unsubscribe();
      setIsConnected(false);
    };
  }, [documentId]);

  return {
    realtimeEvents,
    isConnected
  };
};

// Hook for collaboration updates
export const useCollaborationUpdates = () => {
  const [collaborationUpdates, setCollaborationUpdates] = useState<CollaborationUpdate[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    setIsConnected(true);

    const unsubscribe = realTimeService.subscribeToCollaborationUpdates(
      user.id,
      (update) => {
        setCollaborationUpdates(prev => [...prev.slice(-19), update]); // Keep last 20 updates
        
        // Show notifications for collaboration events
        if (update.action === 'joined') {
          toast.info('You have been added as a collaborator to a document');
        }
      }
    );

    return () => {
      unsubscribe();
      setIsConnected(false);
    };
  }, [user]);

  return {
    collaborationUpdates,
    isConnected
  };
};

// Hook for system notifications
export const useSystemNotifications = () => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    setIsConnected(true);

    const unsubscribe = realTimeService.subscribeToSystemNotifications(
      user.id,
      (notification) => {
        setNotifications(prev => [...prev.slice(-9), notification]); // Keep last 10 notifications
        
        // Show toast for new notifications
        toast.info(notification.message || 'New notification received');
      }
    );

    return () => {
      unsubscribe();
      setIsConnected(false);
    };
  }, [user]);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true }
          : notif
      )
    );
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    isConnected,
    markAsRead,
    clearAll
  };
};

// Hook for connection status monitoring
export const useConnectionStatus = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');

  useEffect(() => {
    const checkConnection = () => {
      const connected = realTimeService.isConnected();
      const status = realTimeService.getConnectionStatus();
      
      setIsConnected(connected);
      setConnectionStatus(status);
    };

    // Check immediately
    checkConnection();

    // Check periodically
    const interval = setInterval(checkConnection, 5000);

    return () => clearInterval(interval);
  }, []);

  return {
    isConnected,
    connectionStatus
  };
};

// Hook for cleanup on component unmount
export const useRealTimeCleanup = () => {
  useEffect(() => {
    return () => {
      // Cleanup all subscriptions when the app unmounts
      realTimeService.unsubscribeAll();
    };
  }, []);
};

// Combined hook for document collaboration features
export const useDocumentCollaboration = (documentId: string) => {
  const processingHook = useDocumentProcessing(documentId);
  const presenceHook = useUserPresence(documentId);
  const annotationsHook = useRealTimeAnnotations(documentId);
  const connectionHook = useConnectionStatus();

  return {
    // Processing status
    processingStatus: processingHook.processingStatus,
    
    // User presence
    presenceData: presenceHook.presenceData,
    updateCurrentPage: presenceHook.updateCurrentPage,
    setUserStatus: presenceHook.setStatus,
    
    // Real-time annotations
    realtimeEvents: annotationsHook.realtimeEvents,
    
    // Connection status
    isConnected: connectionHook.isConnected,
    connectionStatus: connectionHook.connectionStatus
  };
};
