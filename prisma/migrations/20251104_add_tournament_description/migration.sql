-- Migration: Add description field to tournaments table
-- Date: 2025-11-04
-- Purpose: Allow tournament directors to add optional descriptions to tournaments

-- Add description column
ALTER TABLE "tournaments" ADD COLUMN "description" TEXT;

-- Add comment for documentation
COMMENT ON COLUMN "tournaments"."description" IS 'Optional tournament description for additional context';
