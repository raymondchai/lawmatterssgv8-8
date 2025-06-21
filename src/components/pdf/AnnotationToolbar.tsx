/**
 * Annotation Toolbar Component
 * Provides tools for creating and editing PDF annotations
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Highlighter,
  MessageSquare,
  Edit3,
  Stamp,
  Palette,
  Type,
  ChevronDown
} from 'lucide-react';
import type { AnnotationTool, AnnotationType, AnnotationColor } from '@/types/annotations';
import { cn } from '@/lib/utils';

interface AnnotationToolbarProps {
  activeTool: AnnotationTool;
  onToolSelect: (type: AnnotationType, color?: AnnotationColor) => void;
  onToolDeselect: () => void;
  className?: string;
}

const annotationTools = [
  {
    type: 'highlight' as AnnotationType,
    icon: Highlighter,
    label: 'Highlight',
    description: 'Highlight text or areas'
  },
  {
    type: 'note' as AnnotationType,
    icon: MessageSquare,
    label: 'Note',
    description: 'Add sticky notes'
  },
  {
    type: 'text' as AnnotationType,
    icon: Type,
    label: 'Text',
    description: 'Add text annotations'
  },
  {
    type: 'drawing' as AnnotationType,
    icon: Edit3,
    label: 'Draw',
    description: 'Draw freehand annotations'
  },
  {
    type: 'stamp' as AnnotationType,
    icon: Stamp,
    label: 'Stamp',
    description: 'Add stamps and signatures'
  }
];

const annotationColors: { color: AnnotationColor; label: string; value: string }[] = [
  { color: 'yellow', label: 'Yellow', value: '#FFFF00' },
  { color: 'red', label: 'Red', value: '#FF0000' },
  { color: 'blue', label: 'Blue', value: '#0000FF' },
  { color: 'green', label: 'Green', value: '#00FF00' },
  { color: 'purple', label: 'Purple', value: '#800080' },
  { color: 'orange', label: 'Orange', value: '#FFA500' },
  { color: 'pink', label: 'Pink', value: '#FFC0CB' },
  { color: 'gray', label: 'Gray', value: '#808080' }
];

const stampTypes = [
  { type: 'approved', label: 'Approved', emoji: '✅' },
  { type: 'rejected', label: 'Rejected', emoji: '❌' },
  { type: 'reviewed', label: 'Reviewed', emoji: '👁️' },
  { type: 'confidential', label: 'Confidential', emoji: '🔒' },
  { type: 'draft', label: 'Draft', emoji: '📝' }
];

export function AnnotationToolbar({
  activeTool,
  onToolSelect,
  onToolDeselect,
  className
}: AnnotationToolbarProps) {
  const [selectedColor, setSelectedColor] = useState<AnnotationColor>('yellow');

  const handleToolClick = (type: AnnotationType) => {
    if (activeTool.isActive && activeTool.type === type) {
      onToolDeselect();
    } else {
      onToolSelect(type, selectedColor);
    }
  };

  const handleColorSelect = (color: AnnotationColor) => {
    setSelectedColor(color);
    if (activeTool.isActive) {
      onToolSelect(activeTool.type, color);
    }
  };

  const handleStampSelect = (stampType: string) => {
    onToolSelect('stamp', selectedColor);
  };

  return (
    <TooltipProvider>
      <div className={cn("flex items-center space-x-1", className)}>
        {/* Annotation Tools */}
        {annotationTools.map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool.isActive && activeTool.type === tool.type;

          if (tool.type === 'stamp') {
            return (
              <DropdownMenu key={tool.type}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant={isActive ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "relative",
                      isActive && "bg-blue-600 text-white"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {stampTypes.map((stamp) => (
                    <DropdownMenuItem
                      key={stamp.type}
                      onClick={() => handleStampSelect(stamp.type)}
                      className="flex items-center space-x-2"
                    >
                      <span>{stamp.emoji}</span>
                      <span>{stamp.label}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }

          return (
            <Tooltip key={tool.type}>
              <TooltipTrigger asChild>
                <Button
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToolClick(tool.type)}
                  className={cn(
                    "relative",
                    isActive && "bg-blue-600 text-white"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {isActive && (
                    <Badge
                      variant="secondary"
                      className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-xs"
                      style={{ backgroundColor: annotationColors.find(c => c.color === activeTool.color)?.value }}
                    >
                      ●
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{tool.label}</p>
                <p className="text-xs text-gray-500">{tool.description}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}

        <Separator orientation="vertical" className="h-6" />

        {/* Color Picker */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center space-x-1">
              <Palette className="h-4 w-4" />
              <div
                className="w-3 h-3 rounded-full border"
                style={{ backgroundColor: annotationColors.find(c => c.color === selectedColor)?.value }}
              />
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <div className="grid grid-cols-4 gap-2 p-2">
              {annotationColors.map((color) => (
                <button
                  key={color.color}
                  onClick={() => handleColorSelect(color.color)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 hover:scale-110 transition-transform",
                    selectedColor === color.color ? "border-gray-800" : "border-gray-300"
                  )}
                  style={{ backgroundColor: color.value }}
                  title={color.label}
                />
              ))}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Active Tool Indicator */}
        {activeTool.isActive && (
          <>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex items-center space-x-2 text-sm">
              <Badge variant="outline" className="flex items-center space-x-1">
                <span>
                  {annotationTools.find(t => t.type === activeTool.type)?.label}
                </span>
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: annotationColors.find(c => c.color === activeTool.color)?.value }}
                />
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={onToolDeselect}
                className="h-6 px-2 text-xs"
              >
                Deselect
              </Button>
            </div>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
