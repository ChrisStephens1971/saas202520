/**
 * API Response Compression Utilities
 * Sprint 9 Phase 3 - API Compression and Optimization
 *
 * Provides utilities for compressing API responses with gzip and brotli,
 * tracking response sizes, and optimizing payload delivery.
 */

import { gzipSync, brotliCompressSync, constants } from 'zlib';

/**
 * Compression configuration
 */
export interface CompressionConfig {
  /** Minimum response size in bytes to enable compression (default: 1024 = 1KB) */
  threshold: number;
  /** Compression level for gzip (0-9, default: 6) */
  gzipLevel: number;
  /** Compression level for brotli (0-11, default: 4) */
  brotliQuality: number;
  /** Enable brotli compression (default: true) */
  enableBrotli: boolean;
  /** Enable gzip compression (default: true) */
  enableGzip: boolean;
}

/**
 * Default compression configuration
 */
export const DEFAULT_COMPRESSION_CONFIG: CompressionConfig = {
  threshold: 1024, // 1KB
  gzipLevel: 6,
  brotliQuality: 4,
  enableBrotli: true,
  enableGzip: true,
};

/**
 * Supported compression encodings
 */
export type CompressionEncoding = 'br' | 'gzip' | 'identity';

/**
 * Compression result
 */
export interface CompressionResult {
  /** Compressed data */
  data: Buffer;
  /** Compression encoding used */
  encoding: CompressionEncoding;
  /** Original size in bytes */
  originalSize: number;
  /** Compressed size in bytes */
  compressedSize: number;
  /** Compression ratio (0-1, higher is better) */
  ratio: number;
}

/**
 * Determine best compression encoding based on Accept-Encoding header
 *
 * @param acceptEncoding - Value of Accept-Encoding header
 * @param config - Compression configuration
 * @returns Best supported encoding
 *
 * @example
 * ```typescript
 * const encoding = getBestEncoding('gzip, deflate, br');
 * // Returns: 'br' (brotli is preferred)
 * ```
 */
export function getBestEncoding(
  acceptEncoding: string | null,
  config: CompressionConfig = DEFAULT_COMPRESSION_CONFIG
): CompressionEncoding {
  if (!acceptEncoding) {
    return 'identity';
  }

  const encodings = acceptEncoding
    .toLowerCase()
    .split(',')
    .map((e) => e.trim());

  // Prefer brotli (better compression ratio)
  if (config.enableBrotli && encodings.includes('br')) {
    return 'br';
  }

  // Fall back to gzip (widely supported)
  if (config.enableGzip && encodings.includes('gzip')) {
    return 'gzip';
  }

  // No compression
  return 'identity';
}

/**
 * Compress data using the specified encoding
 *
 * @param data - Data to compress (string or Buffer)
 * @param encoding - Compression encoding to use
 * @param config - Compression configuration
 * @returns Compression result with metrics
 *
 * @example
 * ```typescript
 * const result = compressData(
 *   JSON.stringify(largeObject),
 *   'br'
 * );
 * console.log(`Compressed ${result.originalSize} -> ${result.compressedSize} bytes`);
 * console.log(`Ratio: ${(result.ratio * 100).toFixed(1)}%`);
 * ```
 */
export function compressData(
  data: string | Buffer,
  encoding: CompressionEncoding,
  config: CompressionConfig = DEFAULT_COMPRESSION_CONFIG
): CompressionResult {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8');
  const originalSize = buffer.length;

  // Skip compression for small responses
  if (originalSize < config.threshold) {
    return {
      data: buffer,
      encoding: 'identity',
      originalSize,
      compressedSize: originalSize,
      ratio: 0,
    };
  }

  let compressed: Buffer;

  switch (encoding) {
    case 'br':
      compressed = brotliCompressSync(buffer, {
        params: {
          [constants.BROTLI_PARAM_QUALITY]: config.brotliQuality,
          [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
        },
      });
      break;

    case 'gzip':
      compressed = gzipSync(buffer, {
        level: config.gzipLevel,
      });
      break;

    case 'identity':
    default:
      compressed = buffer;
      break;
  }

  const compressedSize = compressed.length;
  const ratio = originalSize > 0 ? 1 - compressedSize / originalSize : 0;

  return {
    data: compressed,
    encoding,
    originalSize,
    compressedSize,
    ratio,
  };
}

/**
 * Compress JSON response with automatic encoding selection
 *
 * @param data - Data to compress (will be JSON stringified)
 * @param acceptEncoding - Value of Accept-Encoding header
 * @param config - Compression configuration
 * @returns Compression result with metrics
 *
 * @example
 * ```typescript
 * const result = compressResponse(
 *   { users: [...largeArray] },
 *   request.headers.get('accept-encoding')
 * );
 *
 * return new Response(result.data, {
 *   headers: {
 *     'Content-Encoding': result.encoding,
 *     'Content-Type': 'application/json',
 *     'X-Original-Size': result.originalSize.toString(),
 *     'X-Compressed-Size': result.compressedSize.toString(),
 *   },
 * });
 * ```
 */
export function compressResponse(
  data: any,
  acceptEncoding: string | null,
  config: CompressionConfig = DEFAULT_COMPRESSION_CONFIG
): CompressionResult {
  const json = JSON.stringify(data);
  const encoding = getBestEncoding(acceptEncoding, config);
  return compressData(json, encoding, config);
}

/**
 * Calculate response size metrics
 *
 * @param data - Response data
 * @returns Size metrics
 *
 * @example
 * ```typescript
 * const metrics = getResponseSizeMetrics({ users: [...] });
 * console.log(`Response size: ${metrics.sizeKB.toFixed(2)} KB`);
 * ```
 */
export function getResponseSizeMetrics(data: any): {
  sizeBytes: number;
  sizeKB: number;
  sizeMB: number;
  isLarge: boolean;
} {
  const json = JSON.stringify(data);
  const sizeBytes = Buffer.byteLength(json, 'utf-8');
  const sizeKB = sizeBytes / 1024;
  const sizeMB = sizeKB / 1024;
  const isLarge = sizeBytes > 100 * 1024; // > 100KB

  return {
    sizeBytes,
    sizeKB,
    sizeMB,
    isLarge,
  };
}

/**
 * Trim response payload to reduce size
 *
 * Removes null/undefined values, empty arrays/objects, and optionally
 * truncates long strings.
 *
 * @param data - Data to trim
 * @param options - Trimming options
 * @returns Trimmed data
 *
 * @example
 * ```typescript
 * const trimmed = trimPayload({
 *   name: 'John',
 *   email: null,
 *   profile: {},
 *   tags: [],
 * });
 * // Result: { name: 'John' }
 * ```
 */
export function trimPayload(
  data: any,
  options: {
    removeNull?: boolean;
    removeEmpty?: boolean;
    truncateStrings?: number;
  } = {}
): any {
  const { removeNull = true, removeEmpty = true, truncateStrings } = options;

  if (data === null || data === undefined) {
    return removeNull ? undefined : data;
  }

  if (Array.isArray(data)) {
    const trimmed = data
      .map((item) => trimPayload(item, options))
      .filter((item) => {
        if (removeNull && (item === null || item === undefined)) return false;
        if (removeEmpty && Array.isArray(item) && item.length === 0) return false;
        if (removeEmpty && typeof item === 'object' && Object.keys(item).length === 0) return false;
        return true;
      });

    return removeEmpty && trimmed.length === 0 ? undefined : trimmed;
  }

  if (typeof data === 'object') {
    const trimmed: any = {};

    for (const [key, value] of Object.entries(data)) {
      const trimmedValue = trimPayload(value, options);

      // Skip null/undefined
      if (removeNull && (trimmedValue === null || trimmedValue === undefined)) {
        continue;
      }

      // Skip empty arrays/objects
      if (removeEmpty) {
        if (Array.isArray(trimmedValue) && trimmedValue.length === 0) continue;
        if (
          typeof trimmedValue === 'object' &&
          trimmedValue !== null &&
          Object.keys(trimmedValue).length === 0
        )
          continue;
      }

      trimmed[key] = trimmedValue;
    }

    return Object.keys(trimmed).length === 0 && removeEmpty ? undefined : trimmed;
  }

  if (typeof data === 'string' && truncateStrings && data.length > truncateStrings) {
    return data.substring(0, truncateStrings) + '...';
  }

  return data;
}

/**
 * Format compression metrics for logging
 *
 * @param result - Compression result
 * @returns Formatted metrics string
 *
 * @example
 * ```typescript
 * const result = compressResponse(data, acceptEncoding);
 * console.log(formatCompressionMetrics(result));
 * // "brotli: 45.2KB -> 12.1KB (73.2% reduction)"
 * ```
 */
export function formatCompressionMetrics(result: CompressionResult): string {
  const originalKB = (result.originalSize / 1024).toFixed(1);
  const compressedKB = (result.compressedSize / 1024).toFixed(1);
  const ratioPercent = (result.ratio * 100).toFixed(1);

  if (result.encoding === 'identity') {
    return `no compression: ${originalKB}KB (below threshold)`;
  }

  return `${result.encoding}: ${originalKB}KB -> ${compressedKB}KB (${ratioPercent}% reduction)`;
}

/**
 * Check if compression is beneficial
 *
 * Sometimes compression can make responses larger (e.g., small JSON,
 * pre-compressed data). This function checks if compression is worthwhile.
 *
 * @param result - Compression result
 * @returns True if compression reduced size by at least 5%
 *
 * @example
 * ```typescript
 * const result = compressData(smallData, 'gzip');
 * if (!isCompressionBeneficial(result)) {
 *   // Send uncompressed
 *   return new Response(originalData);
 * }
 * ```
 */
export function isCompressionBeneficial(result: CompressionResult): boolean {
  // Compression is beneficial if it reduces size by at least 5%
  return result.ratio >= 0.05;
}
