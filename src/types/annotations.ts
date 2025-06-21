/**
 * Types for PDF annotations and highlights system
 */

export type AnnotationType = 'highlight' | 'note' | 'drawing' | 'text' | 'stamp';

export type AnnotationColor = 'yellow' | 'red' | 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'gray';

export interface AnnotationPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AnnotationProperties {
  // For drawing annotations
  strokeWidth?: number;
  strokeStyle?: 'solid' | 'dashed' | 'dotted';
  
  // For text annotations
  fontSize?: number;
  fontFamily?: string;
  
  // For stamps
  stampType?: 'approved' | 'rejected' | 'reviewed' | 'confidential' | 'draft';
  
  // General properties
  opacity?: number;
  rotation?: number;
  
  // Drawing path data for freehand drawings
  pathData?: string;
  
  // Additional custom properties
  [key: string]: any;
}

export interface PdfAnnotation {
  id: string;
  documentId: string;
  userId: string;
  pageNumber: number;
  annotationType: AnnotationType;
  color: AnnotationColor;
  
  // Position and dimensions (relative to page)
  x: number;
  y: number;
  width: number;
  height: number;
  
  // Content
  content?: string;
  selectedText?: string;
  
  // Additional properties
  properties: AnnotationProperties;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
  
  // Related data (populated via joins)
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  comments?: AnnotationComment[];
  shares?: AnnotationShare[];
}

export interface AnnotationComment {
  id: string;
  annotationId: string;
  userId: string;
  parentCommentId?: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  
  // Related data
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  replies?: AnnotationComment[];
}

export interface AnnotationShare {
  id: string;
  annotationId: string;
  sharedWithUserId: string;
  permissionLevel: 'view' | 'comment' | 'edit';
  sharedByUserId: string;
  createdAt: string;
  
  // Related data
  sharedWithUser?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
  sharedByUser?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}

// Request/Response types for API
export interface CreateAnnotationRequest {
  documentId: string;
  pageNumber: number;
  annotationType: AnnotationType;
  color: AnnotationColor;
  x: number;
  y: number;
  width: number;
  height: number;
  content?: string;
  selectedText?: string;
  properties?: AnnotationProperties;
}

export interface UpdateAnnotationRequest {
  color?: AnnotationColor;
  content?: string;
  properties?: AnnotationProperties;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface CreateCommentRequest {
  annotationId: string;
  content: string;
  parentCommentId?: string;
}

export interface ShareAnnotationRequest {
  annotationId: string;
  userEmail: string;
  permissionLevel: 'view' | 'comment' | 'edit';
}

// UI State types
export interface AnnotationTool {
  type: AnnotationType;
  color: AnnotationColor;
  isActive: boolean;
}

export interface AnnotationSelection {
  annotation: PdfAnnotation | null;
  isEditing: boolean;
}

export interface DrawingState {
  isDrawing: boolean;
  currentPath: string;
  strokeWidth: number;
  color: AnnotationColor;
}

// Utility types
export interface AnnotationBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface PageDimensions {
  width: number;
  height: number;
  scale: number;
}

// Event types for annotation interactions
export interface AnnotationEvent {
  type: 'create' | 'update' | 'delete' | 'select' | 'deselect';
  annotation: PdfAnnotation;
  position?: AnnotationPosition;
}

export interface AnnotationFilter {
  userId?: string;
  annotationType?: AnnotationType;
  color?: AnnotationColor;
  pageNumber?: number;
  dateFrom?: string;
  dateTo?: string;
}

// Export utility functions type
export interface AnnotationExportOptions {
  format: 'json' | 'csv' | 'pdf';
  includeComments: boolean;
  pageRange?: {
    start: number;
    end: number;
  };
  annotationTypes?: AnnotationType[];
}

// Collaboration types
export interface AnnotationCollaborator {
  userId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  permissionLevel: 'view' | 'comment' | 'edit';
  isOnline: boolean;
  lastSeen?: string;
}

export interface AnnotationActivity {
  id: string;
  userId: string;
  annotationId: string;
  action: 'created' | 'updated' | 'deleted' | 'commented' | 'shared';
  details?: string;
  timestamp: string;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
  };
}
