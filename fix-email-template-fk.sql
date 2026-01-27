-- Fix email_templates.document_type_id foreign key constraint
-- Run this in MySQL Workbench on mini_hr_360 database

USE mini_hr_360;

-- Step 1: Check current column types
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    COLUMN_TYPE,
    IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND ((TABLE_NAME = 'document_types' AND COLUMN_NAME = 'id')
    OR (TABLE_NAME = 'email_templates' AND COLUMN_NAME = 'document_type_id'))
ORDER BY TABLE_NAME, COLUMN_NAME;

-- Step 2: Drop the foreign key constraint if it exists
SET @fk_name = (
    SELECT CONSTRAINT_NAME
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'email_templates'
      AND COLUMN_NAME = 'document_type_id'
      AND REFERENCED_TABLE_NAME = 'document_types'
    LIMIT 1
);

SET @sql = IF(@fk_name IS NOT NULL, 
    CONCAT('ALTER TABLE email_templates DROP FOREIGN KEY ', @fk_name, ';'),
    'SELECT "Foreign key does not exist, skipping drop";');

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 3: Get the actual type of document_types.id
SET @doc_type_id_type = (
    SELECT COLUMN_TYPE
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'document_types'
      AND COLUMN_NAME = 'id'
    LIMIT 1
);

-- Step 4: Alter email_templates.document_type_id to match document_types.id type
-- This will use the actual type from your database
SET @alter_sql = CONCAT('ALTER TABLE email_templates MODIFY COLUMN document_type_id ', @doc_type_id_type, ' NULL;');
PREPARE stmt FROM @alter_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 5: Recreate the foreign key constraint
ALTER TABLE email_templates
ADD CONSTRAINT fk_email_templates_document_type
FOREIGN KEY (document_type_id) REFERENCES document_types(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Step 6: Verify the fix
SELECT 
    kcu.CONSTRAINT_NAME,
    kcu.TABLE_NAME,
    kcu.COLUMN_NAME,
    kcu.REFERENCED_TABLE_NAME,
    kcu.REFERENCED_COLUMN_NAME,
    '✅ Foreign key created successfully' as status
FROM information_schema.KEY_COLUMN_USAGE kcu
WHERE kcu.TABLE_SCHEMA = DATABASE()
  AND kcu.TABLE_NAME = 'email_templates'
  AND kcu.COLUMN_NAME = 'document_type_id'
  AND kcu.REFERENCED_TABLE_NAME = 'document_types';
