/**
 * Image Optimization Utilities
 *
 * Provides utilities for optimizing images for web performance:
 * - WebP conversion
 * - Responsive image generation
 * - Lazy loading
 * - Blur placeholder generation
 */

export interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
  blur?: boolean;
}

export interface ResponsiveImageSet {
  src: string;
  srcSet: string;
  sizes: string;
  placeholder?: string;
}

/**
 * Generate responsive image srcset for different screen sizes
 */
export function generateResponsiveImageSet(
  src: string,
  widths: number[] = [320, 640, 768, 1024, 1280, 1536]
): ResponsiveImageSet {
  const srcSet = widths
    .map((width) => {
      const params = new URLSearchParams({
        url: src,
        w: width.toString(),
        q: '75',
      });
      return `/_next/image?${params.toString()} ${width}w`;
    })
    .join(', ');

  const sizes =
    '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1536px) 33vw, 25vw';

  return {
    src,
    srcSet,
    sizes,
  };
}

/**
 * Generate blur placeholder data URL
 */
export function generateBlurDataURL(width: number = 10, height: number = 10): string {
  const canvas = typeof window !== 'undefined' ? document.createElement('canvas') : null;

  if (!canvas) {
    // Fallback for server-side
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"%3E%3Crect fill="%23e5e7eb" width="10" height="10"/%3E%3C/svg%3E';
  }

  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return '';
  }

  // Create gradient for placeholder
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f3f4f6');
  gradient.addColorStop(1, '#e5e7eb');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  return canvas.toDataURL('image/png');
}

/**
 * Check if WebP is supported
 */
export function isWebPSupported(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;

  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

/**
 * Get optimized image URL with Next.js Image Optimization
 */
export function getOptimizedImageUrl(
  src: string,
  options: ImageOptimizationOptions = {}
): string {
  const {
    width,
    height,
    quality = 75,
    format: _format = 'webp',
  } = options;

  const params = new URLSearchParams({
    url: src,
    q: quality.toString(),
  });

  if (width) {
    params.append('w', width.toString());
  }

  if (height) {
    params.append('h', height.toString());
  }

  return `/_next/image?${params.toString()}`;
}

/**
 * Image size constraints for different use cases
 */
export const IMAGE_SIZE_LIMITS = {
  thumbnail: {
    maxWidth: 200,
    maxHeight: 200,
    maxSizeKB: 100,
  },
  card: {
    maxWidth: 400,
    maxHeight: 300,
    maxSizeKB: 200,
  },
  full: {
    maxWidth: 1920,
    maxHeight: 1080,
    maxSizeKB: 500,
  },
} as const;

/**
 * Calculate optimal image dimensions while maintaining aspect ratio
 */
export function calculateOptimalDimensions(
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number } {
  const aspectRatio = originalWidth / originalHeight;

  let width = originalWidth;
  let height = originalHeight;

  if (width > maxWidth) {
    width = maxWidth;
    height = width / aspectRatio;
  }

  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }

  return {
    width: Math.round(width),
    height: Math.round(height),
  };
}

/**
 * Preload critical images
 */
export function preloadImage(src: string, options: ImageOptimizationOptions = {}): void {
  if (typeof window === 'undefined') {
    return;
  }

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = getOptimizedImageUrl(src, options);

  if (options.format === 'webp' && isWebPSupported()) {
    link.type = 'image/webp';
  }

  document.head.appendChild(link);
}

/**
 * Batch preload multiple images
 */
export function preloadImages(images: Array<{ src: string; options?: ImageOptimizationOptions }>): void {
  images.forEach(({ src, options }) => preloadImage(src, options));
}
