'use client';

import { useEffect, useRef, useState, ReactNode, Children } from 'react';

interface SwipeableViewsProps {
  children: ReactNode;
  index?: number;
  onChangeIndex?: (index: number) => void;
  enableMouseEvents?: boolean;
  resistance?: boolean;
  threshold?: number;
  className?: string;
}

export default function SwipeableViews({
  children,
  index = 0,
  onChangeIndex,
  enableMouseEvents = false,
  resistance = true,
  threshold = 50,
  className = '',
}: SwipeableViewsProps) {
  const [currentIndex, setCurrentIndex] = useState(index);
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const childrenArray = Children.toArray(children);
  const childCount = childrenArray.length;

  const [containerWidth, setContainerWidth] = useState(1);

  useEffect(() => {
    setCurrentIndex(index);
  }, [index]);

  // Track container width for calculations
  useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
  }, [currentIndex, translateX]);

  const getTranslateValue = () => {
    return -currentIndex * 100 + (translateX / containerWidth) * 100;
  };

  const handleStart = (clientX: number) => {
    setIsDragging(true);
    setStartX(clientX);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;

    const diff = clientX - startX;

    // Apply resistance at boundaries
    if (resistance) {
      if ((currentIndex === 0 && diff > 0) || (currentIndex === childCount - 1 && diff < 0)) {
        setTranslateX(diff * 0.3);
        return;
      }
    }

    setTranslateX(diff);
  };

  const handleEnd = () => {
    if (!isDragging) return;

    setIsDragging(false);

    const currentContainerWidth = containerRef.current?.offsetWidth || 1;
    const swipeThreshold = Math.min(threshold, currentContainerWidth * 0.2);

    let newIndex = currentIndex;

    if (Math.abs(translateX) > swipeThreshold) {
      if (translateX > 0 && currentIndex > 0) {
        newIndex = currentIndex - 1;
      } else if (translateX < 0 && currentIndex < childCount - 1) {
        newIndex = currentIndex + 1;
      }
    }

    setTranslateX(0);

    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }

      onChangeIndex?.(newIndex);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Touch events
    const handleTouchStart = (e: TouchEvent) => {
      handleStart(e.touches[0].clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      handleMove(e.touches[0].clientX);
    };

    const handleTouchEnd = () => {
      handleEnd();
    };

    container.addEventListener('touchstart', handleTouchStart);
    container.addEventListener('touchmove', handleTouchMove);
    container.addEventListener('touchend', handleTouchEnd);

    // Mouse events (optional)
    if (enableMouseEvents) {
      const handleMouseDown = (e: MouseEvent) => {
        handleStart(e.clientX);
      };

      const handleMouseMove = (e: MouseEvent) => {
        handleMove(e.clientX);
      };

      const handleMouseUp = () => {
        handleEnd();
      };

      const handleMouseLeave = () => {
        if (isDragging) {
          handleEnd();
        }
      };

      container.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      container.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
        container.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        container.removeEventListener('mouseleave', handleMouseLeave);
      };
    }

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, startX, translateX, currentIndex, enableMouseEvents]);

  return (
    <div ref={containerRef} className={`overflow-hidden ${className}`}>
      <div
        className="flex transition-transform"
        style={{
          transform: `translateX(${getTranslateValue()}%)`,
          transitionDuration: isDragging ? '0ms' : '300ms',
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {childrenArray.map((child, idx) => (
          <div
            key={idx}
            className="flex-shrink-0 w-full"
            style={{
              userSelect: isDragging ? 'none' : 'auto',
            }}
          >
            {child}
          </div>
        ))}
      </div>

      {/* Pagination Dots */}
      {childCount > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {childrenArray.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setCurrentIndex(idx);
                onChangeIndex?.(idx);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentIndex
                  ? 'bg-blue-600 dark:bg-blue-400 w-6'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
