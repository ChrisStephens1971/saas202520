/**
 * Lazy Loading Utilities
 *
 * Provides utilities for lazy loading components and resources:
 * - Intersection Observer-based lazy loading
 * - Component code splitting
 * - Route prefetching
 * - Resource prioritization
 */

export interface LazyLoadOptions {
  rootMargin?: string;
  threshold?: number | number[];
  triggerOnce?: boolean;
}

/**
 * Create an Intersection Observer for lazy loading
 */
export function createLazyObserver(
  callback: (entry: IntersectionObserverEntry) => void,
  options: LazyLoadOptions = {}
): IntersectionObserver | null {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return null;
  }

  const { rootMargin = '50px', threshold = 0.01, triggerOnce = true } = options;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback(entry);

          if (triggerOnce) {
            observer.unobserve(entry.target);
          }
        }
      });
    },
    {
      rootMargin,
      threshold,
    }
  );

  return observer;
}

/**
 * Lazy load an image element
 */
export function lazyLoadImage(img: HTMLImageElement, src: string): void {
  const observer = createLazyObserver(() => {
    img.src = src;
    img.classList.add('loaded');
  });

  if (observer) {
    observer.observe(img);
  } else {
    // Fallback for browsers without Intersection Observer
    img.src = src;
  }
}

/**
 * Lazy load multiple images
 */
export function lazyLoadImages(selector: string = 'img[data-src]'): void {
  if (typeof window === 'undefined') {
    return;
  }

  const images = document.querySelectorAll<HTMLImageElement>(selector);

  images.forEach((img) => {
    const src = img.getAttribute('data-src');
    if (src) {
      lazyLoadImage(img, src);
    }
  });
}

/**
 * Prefetch a route for faster navigation
 */
export function prefetchRoute(url: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = url;
  document.head.appendChild(link);
}

/**
 * Preload a critical route
 */
export function preloadRoute(url: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'document';
  link.href = url;
  document.head.appendChild(link);
}

/**
 * Debounce function for scroll handlers
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Throttle function for scroll handlers
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Request idle callback with fallback
 */
export function requestIdleCallback(callback: () => void): void {
  if (typeof window === 'undefined') {
    return;
  }

  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(callback);
  } else {
    setTimeout(callback, 1);
  }
}

/**
 * Batch multiple DOM updates
 */
export function batchDOMUpdates(updates: Array<() => void>): void {
  if (typeof window === 'undefined') {
    return;
  }

  requestAnimationFrame(() => {
    updates.forEach((update) => update());
  });
}

/**
 * Lazy load component with dynamic import
 */
export async function lazyLoadComponent<T = any>(
  importFn: () => Promise<{ default: T }>
): Promise<T> {
  try {
    const module = await importFn();
    return module.default;
  } catch (error) {
    console.error('Failed to lazy load component:', error);
    throw error;
  }
}

/**
 * Priority levels for resource loading
 */
export enum LoadPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

/**
 * Load resource with priority
 */
export function loadResourceWithPriority(
  url: string,
  type: 'script' | 'style' | 'image',
  priority: LoadPriority = LoadPriority.MEDIUM
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }

    let element: HTMLScriptElement | HTMLLinkElement | HTMLImageElement;

    switch (type) {
      case 'script':
        element = document.createElement('script');
        (element as HTMLScriptElement).src = url;
        (element as HTMLScriptElement).async = true;
        break;

      case 'style':
        element = document.createElement('link');
        (element as HTMLLinkElement).rel = 'stylesheet';
        (element as HTMLLinkElement).href = url;
        break;

      case 'image':
        element = document.createElement('img');
        (element as HTMLImageElement).src = url;
        break;

      default:
        reject(new Error(`Unsupported resource type: ${type}`));
        return;
    }

    // Set priority (if supported)
    if ('fetchPriority' in element) {
      (element as any).fetchPriority = priority;
    }

    element.onload = () => resolve();
    element.onerror = () => reject(new Error(`Failed to load: ${url}`));

    document.head.appendChild(element);
  });
}

/**
 * Check if element is in viewport
 */
export function isInViewport(element: HTMLElement): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const rect = element.getBoundingClientRect();

  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}
