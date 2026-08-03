import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface ImageSlideItem {
  url: string;
  title?: string;
  subtitle?: string;
}

interface ImageSlideshowProps {
  images?: Array<string | ImageSlideItem>;
  className?: string;
  alt?: string;
  onIndexChange?: (index: number) => void;
  indicatorsPosition?: 'top-right' | 'top-left' | 'bottom-center' | 'top-center';
}

const ImageSlideshow: React.FC<ImageSlideshowProps> = ({
  images = [],
  className = "h-48 w-full",
  alt = "Slideshow image",
  onIndexChange,
  indicatorsPosition = 'top-right'
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const imageList: string[] = Array.isArray(images) && images.length > 0 
    ? images.map(item => (typeof item === 'string' ? item : (item?.url || "/placeholder.svg"))).filter(Boolean)
    : ["/placeholder.svg"];

  useEffect(() => {
    if (currentIndex >= imageList.length) {
      setCurrentIndex(0);
    } else {
      onIndexChange?.(currentIndex);
    }
  }, [currentIndex, imageList.length, onIndexChange]);

  useEffect(() => {
    if (imageList.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % imageList.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [imageList.length]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? imageList.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === imageList.length - 1 ? 0 : prev + 1));
  };

  const currentUrl = imageList[currentIndex] || "/placeholder.svg";

  return (
    <div className={`relative overflow-hidden bg-slate-900 group/slide ${className}`}>
      {/* Ambient Blurred Backdrop for frame precision */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img
          key={`bg-${currentIndex}`}
          src={currentUrl}
          alt=""
          className="w-full h-full object-cover object-center blur-2xl scale-125 opacity-40 transition-opacity duration-700"
        />
      </div>

      {/* Main Image cleanly fitted & centered */}
      <img
        key={`fg-${currentIndex}`}
        src={currentUrl}
        alt={`${alt} ${currentIndex + 1}`}
        className="relative z-10 w-full h-full object-cover object-center transition-all duration-700 ease-out group-hover/slide:scale-105"
      />

      {/* Subtle vignette overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-slate-950/20 z-15 pointer-events-none" />
      
      {imageList.length > 1 && (
        <>
          <button
            onClick={handlePrev}
            className="absolute left-1.5 sm:left-3 top-1/2 -translate-y-1/2 p-1 sm:p-2 rounded-full bg-slate-900/60 text-white backdrop-blur-md opacity-0 group-hover/slide:opacity-100 transition-all hover:bg-emerald-600 hover:scale-110 z-20 shadow-lg border border-white/20"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-1.5 sm:right-3 top-1/2 -translate-y-1/2 p-1 sm:p-2 rounded-full bg-slate-900/60 text-white backdrop-blur-md opacity-0 group-hover/slide:opacity-100 transition-all hover:bg-emerald-600 hover:scale-110 z-20 shadow-lg border border-white/20"
            aria-label="Next image"
          >
            <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <div 
            className={`absolute flex gap-1 sm:gap-1.5 z-20 bg-slate-950/60 backdrop-blur-md px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full border border-white/20 shadow-md ${
              indicatorsPosition === 'top-right' 
                ? 'top-2 right-2 sm:top-3 sm:right-3' 
                : indicatorsPosition === 'top-left'
                ? 'top-2 left-2 sm:top-3 sm:left-3'
                : indicatorsPosition === 'top-center'
                ? 'top-2 left-1/2 -translate-x-1/2 sm:top-3'
                : 'bottom-3 left-1/2 -translate-x-1/2'
            }`}
          >
            {imageList.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={`h-1 sm:h-1.5 rounded-full transition-all duration-300 ${
                  index === currentIndex ? "bg-emerald-400 w-3.5 sm:w-5" : "bg-white/50 w-1 sm:w-1.5 hover:bg-white/80"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ImageSlideshow;
