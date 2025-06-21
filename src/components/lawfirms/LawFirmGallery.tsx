import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { LawFirmGalleryImage } from '@/types';

interface LawFirmGalleryProps {
  images: LawFirmGalleryImage[];
}

export const LawFirmGallery: React.FC<LawFirmGalleryProps> = ({ images }) => {
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  const openLightbox = (index: number) => {
    setSelectedImage(index);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
  };

  const navigateImage = (direction: 'prev' | 'next') => {
    if (selectedImage === null) return;
    
    if (direction === 'prev') {
      setSelectedImage(selectedImage > 0 ? selectedImage - 1 : images.length - 1);
    } else {
      setSelectedImage(selectedImage < images.length - 1 ? selectedImage + 1 : 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeLightbox();
    } else if (e.key === 'ArrowLeft') {
      navigateImage('prev');
    } else if (e.key === 'ArrowRight') {
      navigateImage('next');
    }
  };

  if (images.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">📷</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No gallery images</h3>
          <p className="text-gray-500">
            Gallery images have not been added yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {images.map((image, index) => (
          <Card 
            key={image.id} 
            className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => openLightbox(index)}
          >
            <div className="aspect-video relative">
              <img
                src={image.image_url}
                alt={image.alt_text || image.caption || `Gallery image ${index + 1}`}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
              />
            </div>
            {image.caption && (
              <CardContent className="p-3">
                <p className="text-sm text-gray-600 line-clamp-2">{image.caption}</p>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedImage !== null && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
          onClick={closeLightbox}
          onKeyDown={handleKeyDown}
          tabIndex={0}
        >
          {/* Close Button */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
            onClick={closeLightbox}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Navigation Buttons */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateImage('prev');
                }}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:bg-white/20 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  navigateImage('next');
                }}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>
            </>
          )}

          {/* Image Container */}
          <div 
            className="max-w-4xl max-h-[80vh] mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[selectedImage].image_url}
              alt={images[selectedImage].alt_text || images[selectedImage].caption || `Gallery image ${selectedImage + 1}`}
              className="max-w-full max-h-full object-contain"
            />
            
            {/* Caption */}
            {images[selectedImage].caption && (
              <div className="bg-black/50 text-white p-4 mt-2 rounded">
                <p className="text-center">{images[selectedImage].caption}</p>
              </div>
            )}
          </div>

          {/* Image Counter */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded">
              {selectedImage + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </>
  );
};
