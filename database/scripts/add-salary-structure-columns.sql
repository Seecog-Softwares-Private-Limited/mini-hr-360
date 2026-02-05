-- Add missing columns to salary_structures table
-- Run this script to fix the "Unknown column 'version'" error

ALTER TABLE salary_structures 
ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;

ALTER TABLE salary_structures 
ADD COLUMN IF NOT EXISTS status ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE';
