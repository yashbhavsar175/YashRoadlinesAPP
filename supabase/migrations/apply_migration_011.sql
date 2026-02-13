-- Quick Apply Script for Migration 011
-- This script applies the data migration and runs verification in one go

\echo ''
\echo '╔════════════════════════════════════════════════════════════════╗'
\echo '║  Migration 011: Data Migration to Default Office              ║'
\echo '╚════════════════════════════════════════════════════════════════╝'
\echo ''

-- Include the migration script
\i 011_migrate_existing_data_to_default_office.sql

\echo ''
\echo '╔════════════════════════════════════════════════════════════════╗'
\echo '║  Running Verification Checks                                   ║'
\echo '╚════════════════════════════════════════════════════════════════╝'
\echo ''

-- Include the verification script
\i verify_data_migration_011.sql

\echo ''
\echo '╔════════════════════════════════════════════════════════════════╗'
\echo '║  Migration 011 Complete                                        ║'
\echo '╚════════════════════════════════════════════════════════════════╝'
\echo ''
