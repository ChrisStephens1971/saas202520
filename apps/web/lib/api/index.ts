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

// ============================================================================
// PUBLIC API - Sprint 10 Week 3
// ============================================================================

// API Types
export * from './types/api';

// API Key Service
export {
  generateApiKey,
  hashApiKey,
  validateApiKey,
  getApiKeyByHash,
  revokeApiKey,
  updateLastUsed,
  getTierRateLimit,
  validateApiKeyFormat,
  getApiKeysByTenant,
  getApiKeyById,
} from './services/api-key.service';

// Rate Limiter Service
export {
  checkRateLimit,
  incrementCounter,
  getRemainingRequests,
  resetCounter,
  getRateLimitInfo,
  isRateLimited,
  getTimeUntilReset,
} from './services/rate-limiter.service';

// API Authentication Middleware
export { withApiAuth, withApiAuthCustomError } from './middleware/api-auth.middleware';

// API Response Utilities
export {
  apiSuccess,
  apiError,
  apiPaginated,
  apiUnauthorized,
  apiForbidden,
  apiNotFound,
  apiRateLimitExceeded,
  apiBadRequest,
  apiInternalError,
  apiServiceUnavailable,
  apiConflict,
  errorToApiResponse,
  formatRateLimitHeaders,
  getPaginationOffset,
  validatePagination,
} from './utils/response.utils';
