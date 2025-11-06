/**
 * API Utilities - Compression and Optimization
 * Sprint 9 Phase 3
 *
 * Central export point for all API compression and optimization utilities.
 */

// Compression utilities
export {
  getBestEncoding,
  compressData,
  compressResponse,
  getResponseSizeMetrics,
  trimPayload,
  formatCompressionMetrics,
  isCompressionBeneficial,
  DEFAULT_COMPRESSION_CONFIG,
  type CompressionConfig,
  type CompressionEncoding,
  type CompressionResult,
} from './compression';

// Optimization utilities
export {
  parsePaginationParams,
  paginateArray,
  paginateCursor,
  parseFieldSelection,
  selectFields,
  selectFieldsArray,
  generateETag,
  etagMatches,
  executeBatch,
  parseSortParams,
  sortArray,
  type PaginationParams,
  type PaginatedResponse,
  type FieldSelectionOptions,
  type BatchRequest,
  type BatchResponse,
  type SortParams,
} from './optimization';

// Response helpers
export {
  createOptimizedResponse,
  createPaginatedResponse,
  createErrorResponse,
  createSuccessResponse,
  withOptimization,
  type OptimizedResponseOptions,
} from './response-helpers';
