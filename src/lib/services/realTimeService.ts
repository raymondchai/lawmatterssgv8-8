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
    // Skip realtime subscriptions to avoid console errors
    console.log('Skipping document processing subscription - realtime disabled');
    return () => {}; // Return empty unsubscribe function
  }

  // Subscribe to document annotations with real-time collaboration
  subscribeToDocumentAnnotations(
    documentId: string,
    callback: (event: RealTimeEvent) => void
  ): () => void {
    // Skip realtime subscriptions to avoid console errors
    console.log('Skipping document annotations subscription - realtime disabled');
    return () => {}; // Return empty unsubscribe function
  }

  // Subscribe to user presence for collaborative editing
  subscribeToUserPresence(
    documentId: string,
    currentUserId: string,
    callback: (presenceData: UserPresence[]) => void
  ): () => void {
    // Skip realtime subscriptions to avoid console errors
    console.log('Skipping user presence subscription - realtime disabled');
    return () => {}; // Return empty unsubscribe function

  }

  // Update user presence (e.g., when changing pages)
  async updatePresence(
    documentId: string,
    updates: Partial<UserPresence>
  ): Promise<void> {
    // Skip realtime updates to avoid console errors
    console.log('Skipping presence update - realtime disabled');
  }

  // Subscribe to system-wide notifications
  subscribeToSystemNotifications(
    userId: string,
    callback: (notification: any) => void
  ): () => void {
    // Skip realtime subscriptions to avoid console errors
    console.log('Skipping system notifications subscription - realtime disabled');
    return () => {}; // Return empty unsubscribe function
  }

  // Subscribe to collaboration updates (invitations, permission changes, etc.)
  subscribeToCollaborationUpdates(
    userId: string,
    callback: (update: CollaborationUpdate) => void
  ): () => void {
    // Skip realtime subscriptions to avoid console errors
    console.log('Skipping collaboration updates subscription - realtime disabled');
    return () => {}; // Return empty unsubscribe function
  }

  // Broadcast a custom event to a channel
  async broadcastEvent(
    channelName: string,
    event: RealTimeEvent
  ): Promise<void> {
    // Skip realtime broadcasts to avoid console errors
    console.log('Skipping broadcast event - realtime disabled');
  }

  // Unsubscribe from a specific channel
  private unsubscribe(channelName: string): void {
    // Skip unsubscribe operations - realtime disabled
    console.log('Skipping unsubscribe - realtime disabled');
  }

  // Unsubscribe from all channels
  unsubscribeAll(): void {
    // Skip unsubscribe operations - realtime disabled
    console.log('Skipping unsubscribe all - realtime disabled');
  }

  // Get current presence data for a document
  getPresenceData(documentId: string): UserPresence[] {
    // Return empty array - realtime disabled
    return [];
  }

  // Check if service is connected
  isConnected(): boolean {
    // Always return false - realtime disabled
    return false;
  }

  // Get connection status
  getConnectionStatus(): string {
    // Always return disabled - realtime disabled
    return 'disabled';
  }
}

// Export singleton instance
export const realTimeService = new RealTimeService();

// Export types for use in components
export type { UserPresence, DocumentProcessingUpdate, CollaborationUpdate };
