import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ZoomIn, ZoomOut, X, ChevronLeft, ChevronRight } from "lucide-react";

interface RealImagesViewerProps {
  isOpen: boolean;
  onClose: () => void;
  images: string[];
  aiCoverImage?: string;
  productTitle: string;
}

const RealImagesViewer = ({ isOpen, onClose, images, aiCoverImage, productTitle }: RealImagesViewerProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const imageRef = useRef<HTMLDivElement>(null);

  // If viewing real images, don't include AI cover. If AI cover is provided, show it first
  const allImages = aiCoverImage ? [aiCoverImage, ...images] : images;
  
  // Set initial index based on whether we're showing AI cover or real images
  useEffect(() => {
    if (isOpen) {
      // If no AI cover image, we're viewing real images directly - start at first real image
      setCurrentIndex(aiCoverImage ? 0 : 0);
    }
  }, [isOpen, aiCoverImage]);

  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setIsLoading(true);
  }, [currentIndex]);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = () => {
    setScale(prev => {
      const newScale = Math.max(prev - 0.5, 1);
      if (newScale === 1) {
        setPosition({ x: 0, y: 0 });
      }
      return newScale;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handlePrev = () => {
    setCurrentIndex(prev => prev > 0 ? prev - 1 : allImages.length - 1);
  };

  const handleNext = () => {
    setCurrentIndex(prev => prev < allImages.length - 1 ? prev + 1 : 0);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] p-0 bg-black/95 flex flex-col">
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-black/50 flex-shrink-0">
            <div className="text-white">
              <h3 className="font-semibold">{productTitle}</h3>
              <p className="text-sm text-white/70">
                {currentIndex === 0 && aiCoverImage ? "AI Generated Image" : `Image ${aiCoverImage ? currentIndex : currentIndex + 1} of ${images.length}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleZoomOut}
                disabled={scale <= 1}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-white text-sm min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={handleZoomIn}
                disabled={scale >= 4}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={onClose}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 ml-4"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Main Image - Scrollable */}
          <div 
            ref={imageRef}
            className="flex-1 relative overflow-auto flex items-center justify-center cursor-grab min-h-0"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
              </div>
            )}
            <img
              src={allImages[currentIndex]}
              alt={`${productTitle} - Image ${currentIndex + 1}`}
              className="max-w-full object-contain transition-transform duration-100"
              style={{
                transform: `scale(${scale}) translate(${position.x / scale}px, ${position.y / scale}px)`,
                opacity: isLoading ? 0 : 1,
                maxHeight: scale === 1 ? '100%' : 'none'
              }}
              onLoad={() => setIsLoading(false)}
              draggable={false}
            />

            {/* Navigation Arrows */}
            {allImages.length > 1 && (
              <>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handlePrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </>
            )}
          </div>

          {/* Thumbnail Strip */}
          {allImages.length > 1 && (
            <div className="bg-black/50 p-4 flex-shrink-0">
              <ScrollArea className="w-full">
                <div className="flex gap-2 justify-center">
                  {allImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        currentIndex === idx 
                          ? "border-primary ring-2 ring-primary/50" 
                          : "border-white/20 hover:border-white/50"
                      }`}
                    >
                      <img 
                        src={img} 
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {idx === 0 && aiCoverImage && (
                        <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                          <span className="text-[8px] text-white font-bold">AI</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RealImagesViewer;