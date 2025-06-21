/**
 * Annotation Layer for PDF Viewer
 * Handles rendering and interaction with PDF annotations
 */

import React, { useRef, useCallback, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type {
  PdfAnnotation,
  AnnotationTool,
  AnnotationSelection,
  DrawingState,
  AnnotationType,
  AnnotationColor,
  AnnotationPosition
} from '@/types/annotations';
import { cn } from '@/lib/utils';

interface AnnotationLayerProps {
  annotations: PdfAnnotation[];
  scale: number;
  rotation: number;
  activeTool: AnnotationTool;
  selectedAnnotation: AnnotationSelection;
  drawingState: DrawingState;
  readOnly?: boolean;
  onAnnotationCreate: (annotation: any) => void;
  onAnnotationSelect: (annotation: PdfAnnotation | null, isEditing?: boolean) => void;
  onAnnotationUpdate: (annotationId: string, updates: any) => void;
  onAnnotationDelete: (annotationId: string) => void;
  onDrawingStart: (color: AnnotationColor, strokeWidth?: number) => void;
  onDrawingUpdate: (path: string) => void;
  onDrawingEnd: () => void;
}

export function AnnotationLayer({
  annotations,
  scale,
  rotation,
  activeTool,
  selectedAnnotation,
  drawingState,
  readOnly = false,
  onAnnotationCreate,
  onAnnotationSelect,
  onAnnotationUpdate,
  onAnnotationDelete,
  onDrawingStart,
  onDrawingUpdate,
  onDrawingEnd
}: AnnotationLayerProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [creationStart, setCreationStart] = useState<{ x: number; y: number } | null>(null);
  const [currentSelection, setCurrentSelection] = useState<AnnotationPosition | null>(null);

  // Color mapping for annotations
  const colorMap: Record<AnnotationColor, string> = {
    yellow: 'rgba(255, 255, 0, 0.3)',
    red: 'rgba(255, 0, 0, 0.3)',
    blue: 'rgba(0, 0, 255, 0.3)',
    green: 'rgba(0, 255, 0, 0.3)',
    purple: 'rgba(128, 0, 128, 0.3)',
    orange: 'rgba(255, 165, 0, 0.3)',
    pink: 'rgba(255, 192, 203, 0.3)',
    gray: 'rgba(128, 128, 128, 0.3)'
  };

  const borderColorMap: Record<AnnotationColor, string> = {
    yellow: '#FFD700',
    red: '#FF0000',
    blue: '#0000FF',
    green: '#00FF00',
    purple: '#800080',
    orange: '#FFA500',
    pink: '#FFC0CB',
    gray: '#808080'
  };

  // Get relative position within the layer
  const getRelativePosition = useCallback((clientX: number, clientY: number) => {
    if (!layerRef.current) return { x: 0, y: 0 };
    
    const rect = layerRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / scale,
      y: (clientY - rect.top) / scale
    };
  }, [scale]);

  // Handle mouse down for creating annotations
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (readOnly || !activeTool.isActive) return;

    e.preventDefault();
    const position = getRelativePosition(e.clientX, e.clientY);

    if (activeTool.type === 'drawing') {
      onDrawingStart(activeTool.color);
      onDrawingUpdate(`M ${position.x} ${position.y}`);
    } else {
      setIsCreating(true);
      setCreationStart(position);
      setCurrentSelection({
        x: position.x,
        y: position.y,
        width: 0,
        height: 0
      });
    }
  }, [readOnly, activeTool, getRelativePosition, onDrawingStart, onDrawingUpdate]);

  // Handle mouse move for creating annotations
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (readOnly || !activeTool.isActive) return;

    const position = getRelativePosition(e.clientX, e.clientY);

    if (drawingState.isDrawing) {
      onDrawingUpdate(`${drawingState.currentPath} L ${position.x} ${position.y}`);
    } else if (isCreating && creationStart) {
      setCurrentSelection({
        x: Math.min(creationStart.x, position.x),
        y: Math.min(creationStart.y, position.y),
        width: Math.abs(position.x - creationStart.x),
        height: Math.abs(position.y - creationStart.y)
      });
    }
  }, [readOnly, activeTool, drawingState, isCreating, creationStart, getRelativePosition, onDrawingUpdate]);

  // Handle mouse up for creating annotations
  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (readOnly || !activeTool.isActive) return;

    if (drawingState.isDrawing) {
      // Create drawing annotation
      onAnnotationCreate({
        annotationType: 'drawing' as AnnotationType,
        color: drawingState.color,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        properties: {
          pathData: drawingState.currentPath,
          strokeWidth: drawingState.strokeWidth
        }
      });
      onDrawingEnd();
    } else if (isCreating && currentSelection && currentSelection.width > 5 && currentSelection.height > 5) {
      // Create rectangular annotation (highlight, note, etc.)
      onAnnotationCreate({
        annotationType: activeTool.type,
        color: activeTool.color,
        x: currentSelection.x,
        y: currentSelection.y,
        width: currentSelection.width,
        height: currentSelection.height,
        content: activeTool.type === 'note' ? 'New note' : undefined
      });
    }

    // Reset creation state
    setIsCreating(false);
    setCreationStart(null);
    setCurrentSelection(null);
  }, [readOnly, activeTool, drawingState, isCreating, currentSelection, onAnnotationCreate, onDrawingEnd]);

  // Handle annotation click
  const handleAnnotationClick = useCallback((annotation: PdfAnnotation, e: React.MouseEvent) => {
    e.stopPropagation();
    onAnnotationSelect(annotation, false);
  }, [onAnnotationSelect]);

  // Handle annotation double click for editing
  const handleAnnotationDoubleClick = useCallback((annotation: PdfAnnotation, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!readOnly) {
      onAnnotationSelect(annotation, true);
    }
  }, [readOnly, onAnnotationSelect]);

  // Render individual annotation
  const renderAnnotation = useCallback((annotation: PdfAnnotation) => {
    const isSelected = selectedAnnotation.annotation?.id === annotation.id;
    const backgroundColor = colorMap[annotation.color];
    const borderColor = borderColorMap[annotation.color];

    const style: React.CSSProperties = {
      position: 'absolute',
      left: annotation.x * scale,
      top: annotation.y * scale,
      width: annotation.width * scale,
      height: annotation.height * scale,
      backgroundColor,
      border: `2px ${isSelected ? 'solid' : 'dashed'} ${borderColor}`,
      cursor: readOnly ? 'default' : 'pointer',
      zIndex: isSelected ? 10 : 1,
      transform: `rotate(${rotation}deg)`,
    };

    if (annotation.annotationType === 'drawing' && annotation.properties.pathData) {
      return (
        <svg
          key={annotation.id}
          style={style}
          onClick={(e) => handleAnnotationClick(annotation, e)}
          onDoubleClick={(e) => handleAnnotationDoubleClick(annotation, e)}
        >
          <path
            d={annotation.properties.pathData}
            stroke={borderColor}
            strokeWidth={annotation.properties.strokeWidth || 2}
            fill="none"
          />
        </svg>
      );
    }

    return (
      <div
        key={annotation.id}
        style={style}
        onClick={(e) => handleAnnotationClick(annotation, e)}
        onDoubleClick={(e) => handleAnnotationDoubleClick(annotation, e)}
        className={cn(
          "annotation-element",
          isSelected && "ring-2 ring-blue-500 ring-offset-2"
        )}
      >
        {annotation.annotationType === 'note' && (
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full border border-yellow-600 flex items-center justify-center text-xs">
            📝
          </div>
        )}
        
        {annotation.annotationType === 'stamp' && (
          <div className="flex items-center justify-center h-full text-xs font-bold text-red-600">
            {annotation.properties.stampType?.toUpperCase() || 'STAMP'}
          </div>
        )}

        {annotation.content && isSelected && (
          <div className="absolute top-full left-0 mt-2 p-2 bg-white border rounded shadow-lg max-w-xs z-20">
            <p className="text-sm">{annotation.content}</p>
            {annotation.user && (
              <p className="text-xs text-gray-500 mt-1">
                by {annotation.user.firstName} {annotation.user.lastName}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }, [
    scale,
    rotation,
    selectedAnnotation,
    readOnly,
    colorMap,
    borderColorMap,
    handleAnnotationClick,
    handleAnnotationDoubleClick
  ]);

  // Render current selection during creation
  const renderCurrentSelection = useCallback(() => {
    if (!currentSelection || !activeTool.isActive) return null;

    const backgroundColor = colorMap[activeTool.color];
    const borderColor = borderColorMap[activeTool.color];

    return (
      <div
        style={{
          position: 'absolute',
          left: currentSelection.x * scale,
          top: currentSelection.y * scale,
          width: currentSelection.width * scale,
          height: currentSelection.height * scale,
          backgroundColor,
          border: `2px dashed ${borderColor}`,
          pointerEvents: 'none',
          zIndex: 100
        }}
      />
    );
  }, [currentSelection, activeTool, scale, colorMap, borderColorMap]);

  // Render current drawing path
  const renderCurrentDrawing = useCallback(() => {
    if (!drawingState.isDrawing || !drawingState.currentPath) return null;

    const borderColor = borderColorMap[drawingState.color];

    return (
      <svg
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 100
        }}
      >
        <path
          d={drawingState.currentPath}
          stroke={borderColor}
          strokeWidth={drawingState.strokeWidth}
          fill="none"
        />
      </svg>
    );
  }, [drawingState, borderColorMap]);

  return (
    <div
      ref={layerRef}
      className="absolute inset-0 w-full h-full"
      style={{ cursor: activeTool.isActive && !readOnly ? 'crosshair' : 'default' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Existing annotations */}
      {annotations.map(renderAnnotation)}
      
      {/* Current selection during creation */}
      {renderCurrentSelection()}
      
      {/* Current drawing path */}
      {renderCurrentDrawing()}
    </div>
  );
}
