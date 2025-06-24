-- Fix processing_status column type in uploaded_documents table
-- The original migration had a typo: 'inquiry_status' instead of proper enum

-- First, create the proper enum type for processing status
CREATE TYPE processing_status_enum AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Drop the existing column and recreate it with the correct type
ALTER TABLE uploaded_documents 
DROP COLUMN IF EXISTS processing_status;

ALTER TABLE uploaded_documents 
ADD COLUMN processing_status processing_status_enum DEFAULT 'pending';

-- Recreate the index
DROP INDEX IF EXISTS idx_uploaded_documents_processing_status;
CREATE INDEX idx_uploaded_documents_processing_status ON uploaded_documents(processing_status);

-- Update any existing records to have a valid status
UPDATE uploaded_documents 
SET processing_status = 'pending' 
WHERE processing_status IS NULL;
