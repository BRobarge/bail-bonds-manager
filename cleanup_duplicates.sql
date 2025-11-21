-- Clean up duplicate/test records from Supabase
-- Run this in your Supabase SQL Editor

-- Delete all contacts (will cascade to related records)
DELETE FROM public.contacts;

-- Delete all documents
DELETE FROM public.documents;

-- Delete all cases
DELETE FROM public.cases;

-- Reset the ID sequences (optional - starts IDs back at 1)
ALTER SEQUENCE contacts_id_seq RESTART WITH 1;
ALTER SEQUENCE documents_id_seq RESTART WITH 1;
ALTER SEQUENCE cases_id_seq RESTART WITH 1;

-- Verify everything is clean
SELECT 'Cases count:', COUNT(*) FROM public.cases;
SELECT 'Contacts count:', COUNT(*) FROM public.contacts;
SELECT 'Documents count:', COUNT(*) FROM public.documents;
