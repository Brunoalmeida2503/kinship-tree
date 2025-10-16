import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';

interface MediaItem {
  url: string;
  type: 'image' | 'video';
}

interface MediaGalleryProps {
  media: MediaItem[];
}

export function MediaGallery({ media }: MediaGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (media.length === 0) return null;

  const openLightbox = (index: number) => setSelectedIndex(index);
  const closeLightbox = () => setSelectedIndex(null);
  
  const goToPrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  const goToNext = () => {
    if (selectedIndex !== null && selectedIndex < media.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const renderMedia = (item: MediaItem, index: number, className: string = '') => {
    if (item.type === 'video') {
      return (
        <div className={`relative group cursor-pointer ${className}`} onClick={() => openLightbox(index)}>
          <video src={item.url} className="w-full h-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Play className="h-12 w-12 text-white" />
          </div>
        </div>
      );
    }
    return (
      <img
        src={item.url}
        alt={`Media ${index + 1}`}
        className={`w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity ${className}`}
        onClick={() => openLightbox(index)}
      />
    );
  };

  const getGridLayout = () => {
    if (media.length === 1) {
      return (
        <div className="rounded-lg overflow-hidden max-h-[500px]">
          {renderMedia(media[0], 0)}
        </div>
      );
    }

    if (media.length === 2) {
      return (
        <div className="grid grid-cols-2 gap-2 rounded-lg overflow-hidden max-h-[400px]">
          {media.map((item, index) => (
            <div key={index} className="aspect-square">
              {renderMedia(item, index)}
            </div>
          ))}
        </div>
      );
    }

    if (media.length === 3) {
      return (
        <div className="grid grid-cols-2 gap-2 rounded-lg overflow-hidden max-h-[400px]">
          <div className="row-span-2 aspect-square">
            {renderMedia(media[0], 0)}
          </div>
          {media.slice(1).map((item, index) => (
            <div key={index + 1} className="aspect-square">
              {renderMedia(item, index + 1)}
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-3 gap-2 rounded-lg overflow-hidden max-h-[400px]">
        {media.slice(0, 5).map((item, index) => (
          <div key={index} className="aspect-square relative">
            {renderMedia(item, index)}
            {index === 4 && media.length > 5 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-2xl font-bold">
                +{media.length - 5}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      {getGridLayout()}

      <Dialog open={selectedIndex !== null} onOpenChange={(open) => !open && closeLightbox()}>
        <DialogContent className="max-w-4xl p-0">
          {selectedIndex !== null && (
            <div className="relative">
              {media[selectedIndex].type === 'video' ? (
                <video src={media[selectedIndex].url} controls className="w-full max-h-[80vh]" />
              ) : (
                <img src={media[selectedIndex].url} alt="Full size" className="w-full max-h-[80vh] object-contain" />
              )}
              
              {media.length > 1 && (
                <>
                  {selectedIndex > 0 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                      onClick={goToPrevious}
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </Button>
                  )}
                  {selectedIndex < media.length - 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background"
                      onClick={goToNext}
                    >
                      <ChevronRight className="h-6 w-6" />
                    </Button>
                  )}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-background/80 px-4 py-2 rounded-full text-sm">
                    {selectedIndex + 1} / {media.length}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}