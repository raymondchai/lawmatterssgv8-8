import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export type RealTimeEventType = 
  | 'document_processing_update'
  | 'annotation_change'
  | 'collaboration_update'
  | 'user_presence'
  | 'system_notification';

export interface RealTimeEvent {
  type: RealTimeEventType;
  payload: any;
  timestamp: string;
  user_id?: string;
}

export interface DocumentProcessingUpdate {
  document_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  stage: 'upload' | 'ocr' | 'embedding' | 'classification' | 'analysis';
  error_message?: string;
}

export interface UserPresence {
  user_id: string;
  document_id?: string;
  status: 'online' | 'away' | 'offline';
  last_seen: string;
  current_page?: number;
}

export interface CollaborationUpdate {
  document_id: string;
  user_id: string;
  action: 'joined' | 'left' | 'viewing' | 'editing';
  metadata?: Record<string, any>;
}

class RealTimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private eventListeners: Map<string, Set<(event: RealTimeEvent) => void>> = new Map();
  private presenceData: Map<string, UserPresence> = new Map();

  // Subscribe to document processing updates
  subscribeToDocumentProcessing(
    documentId: string,
    callback: (update: DocumentProcessingUpdate) => void
  ): () => void {
    // Skip realtime subscriptions in development to avoid console errors
    if (import.meta.env.DEV) {
      console.log('Skipping document processing subscription in development');
      return () => {}; // Return empty unsubscribe function
    }

    const channelName = `document_processing:${documentId}`;

    if (!this.channels.has(channelName)) {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'uploaded_documents',
            filter: `id=eq.${documentId}`
          },
          (payload) => {
            const update: DocumentProcessingUpdate = {
              document_id: documentId,
              status: payload.new.processing_status,
              progress: payload.new.processing_progress || 0,
              stage: payload.new.processing_stage || 'upload',
              error_message: payload.new.error_message
            };
            callback(update);
          }
        )
        .subscribe();

      this.channels.set(channelName, channel);
    }

    return () => this.unsubscribe(channelName);
  }

  // Subscribe to document annotations with real-time collaboration
  subscribeToDocumentAnnotations(
    documentId: string,
    callback: (event: RealTimeEvent) => void
  ): () => void {
    // Skip realtime subscriptions in development to avoid console errors
    if (import.meta.env.DEV) {
      console.log('Skipping document annotations subscription in development');
      return () => {}; // Return empty unsubscribe function
    }

    const channelName = `annotations:${documentId}`;

    if (!this.channels.has(channelName)) {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'document_annotations',
            filter: `document_id=eq.${documentId}`
          },
          (payload) => {
            const event: RealTimeEvent = {
              type: 'annotation_change',
              payload: {
                event_type: payload.eventType,
                annotation: payload.new || payload.old,
                document_id: documentId
              },
              timestamp: new Date().toISOString(),
              user_id: payload.new?.user_id || payload.old?.user_id
            };
            callback(event);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'annotation_replies'
          },
          (payload) => {
            // Check if this reply belongs to an annotation on this document
            if (payload.new?.annotation_id || payload.old?.annotation_id) {
              const event: RealTimeEvent = {
                type: 'annotation_change',
                payload: {
                  event_type: `reply_${payload.eventType}`,
                  reply: payload.new || payload.old,
                  document_id: documentId
                },
                timestamp: new Date().toISOString(),
                user_id: payload.new?.user_id || payload.old?.user_id
              };
              callback(event);
            }
          }
        )
        .subscribe();

      this.channels.set(channelName, channel);
    }

    return () => this.unsubscribe(channelName);
  }

  // Subscribe to user presence for collaborative editing
  subscribeToUserPresence(
    documentId: string,
    currentUserId: string,
    callback: (presenceData: UserPresence[]) => void
  ): () => void {
    const channelName = `presence:${documentId}`;
    
    if (!this.channels.has(channelName)) {
      const channel = supabase
        .channel(channelName)
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          const presenceList: UserPresence[] = [];
          
          Object.keys(state).forEach(userId => {
            const presence = state[userId][0] as UserPresence;
            presenceList.push(presence);
          });
          
          callback(presenceList);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
          console.log('User joined:', key, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
          console.log('User left:', key, leftPresences);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            // Track current user's presence
            await channel.track({
              user_id: currentUserId,
              document_id: documentId,
              status: 'online',
              last_seen: new Date().toISOString(),
              current_page: 1
            });
          }
        });

      this.channels.set(channelName, channel);
    }

    return () => this.unsubscribe(channelName);
  }

  // Update user presence (e.g., when changing pages)
  async updatePresence(
    documentId: string,
    updates: Partial<UserPresence>
  ): Promise<void> {
    const channelName = `presence:${documentId}`;
    const channel = this.channels.get(channelName);
    
    if (channel) {
      await channel.track(updates);
    }
  }

  // Subscribe to system-wide notifications
  subscribeToSystemNotifications(
    userId: string,
    callback: (notification: any) => void
  ): () => void {
    const channelName = `notifications:${userId}`;
    
    if (!this.channels.has(channelName)) {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'user_notifications',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            callback(payload.new);
          }
        )
        .subscribe();

      this.channels.set(channelName, channel);
    }

    return () => this.unsubscribe(channelName);
  }

  // Subscribe to collaboration updates (invitations, permission changes, etc.)
  subscribeToCollaborationUpdates(
    userId: string,
    callback: (update: CollaborationUpdate) => void
  ): () => void {
    const channelName = `collaboration:${userId}`;
    
    if (!this.channels.has(channelName)) {
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'annotation_collaborators',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            const update: CollaborationUpdate = {
              document_id: payload.new?.document_id || payload.old?.document_id,
              user_id: userId,
              action: payload.eventType === 'INSERT' ? 'joined' : 
                      payload.eventType === 'DELETE' ? 'left' : 'editing',
              metadata: payload.new || payload.old
            };
            callback(update);
          }
        )
        .subscribe();

      this.channels.set(channelName, channel);
    }

    return () => this.unsubscribe(channelName);
  }

  // Broadcast a custom event to a channel
  async broadcastEvent(
    channelName: string,
    event: RealTimeEvent
  ): Promise<void> {
    const channel = this.channels.get(channelName);
    if (channel) {
      await channel.send({
        type: 'broadcast',
        event: event.type,
        payload: event
      });
    }
  }

  // Unsubscribe from a specific channel
  private unsubscribe(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  // Unsubscribe from all channels
  unsubscribeAll(): void {
    this.channels.forEach((channel, channelName) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
    this.eventListeners.clear();
    this.presenceData.clear();
  }

  // Get current presence data for a document
  getPresenceData(documentId: string): UserPresence[] {
    const channelName = `presence:${documentId}`;
    const channel = this.channels.get(channelName);
    
    if (channel) {
      const state = channel.presenceState();
      return Object.keys(state).map(userId => state[userId][0] as UserPresence);
    }
    
    return [];
  }

  // Check if service is connected
  isConnected(): boolean {
    return supabase.realtime.isConnected();
  }

  // Get connection status
  getConnectionStatus(): string {
    return supabase.realtime.channels[0]?.state || 'disconnected';
  }
}

// Export singleton instance
export const realTimeService = new RealTimeService();

// Export types for use in components
export type { UserPresence, DocumentProcessingUpdate, CollaborationUpdate };
