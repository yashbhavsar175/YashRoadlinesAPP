/**
 * Database Optimization Utilities
 * 
 * Provides recommendations and utilities for optimizing database performance
 * with multi-office support.
 */

import { queryPerformanceAnalyzer } from './performanceMonitor';

/**
 * Database index recommendations for multi-office support
 */
export const INDEX_RECOMMENDATIONS = {
  offices: [
    {
      name: 'idx_offices_name',
      columns: ['name'],
      reason: 'Fast lookup by office name for uniqueness checks',
      sql: 'CREATE INDEX IF NOT EXISTS idx_offices_name ON offices(name);'
    },
    {
      name: 'idx_offices_is_active',
      columns: ['is_active'],
      reason: 'Filter active offices efficiently',
      sql: 'CREATE INDEX IF NOT EXISTS idx_offices_is_active ON offices(is_active);'
    }
  ],
  user_profiles: [
    {
      name: 'idx_user_profiles_office_id',
      columns: ['office_id'],
      reason: 'Fast lookup of users by office assignment',
      sql: 'CREATE INDEX IF NOT EXISTS idx_user_profiles_office_id ON user_profiles(office_id);'
    }
  ],
  agency_payments: [
    {
      name: 'idx_agency_payments_office_id',
      columns: ['office_id'],
      reason: 'Filter payments by office efficiently',
      sql: 'CREATE INDEX IF NOT EXISTS idx_agency_payments_office_id ON agency_payments(office_id);'
    },
    {
      name: 'idx_agency_payments_office_date',
      columns: ['office_id', 'payment_date'],
      reason: 'Composite index for office-filtered date queries',
      sql: 'CREATE INDEX IF NOT EXISTS idx_agency_payments_office_date ON agency_payments(office_id, payment_date DESC);'
    }
  ],
  agency_majuri: [
    {
      name: 'idx_agency_majuri_office_id',
      columns: ['office_id'],
      reason: 'Filter majuri by office efficiently',
      sql: 'CREATE INDEX IF NOT EXISTS idx_agency_majuri_office_id ON agency_majuri(office_id);'
    }
  ],
  driver_transactions: [
    {
      name: 'idx_driver_transactions_office_id',
      columns: ['office_id'],
      reason: 'Filter driver transactions by office',
      sql: 'CREATE INDEX IF NOT EXISTS idx_driver_transactions_office_id ON driver_transactions(office_id);'
    }
  ],
  truck_fuel_entries: [
    {
      name: 'idx_truck_fuel_entries_office_id',
      columns: ['office_id'],
      reason: 'Filter fuel entries by office',
      sql: 'CREATE INDEX IF NOT EXISTS idx_truck_fuel_entries_office_id ON truck_fuel_entries(office_id);'
    }
  ],
  general_entries: [
    {
      name: 'idx_general_entries_office_id',
      columns: ['office_id'],
      reason: 'Filter general entries by office',
      sql: 'CREATE INDEX IF NOT EXISTS idx_general_entries_office_id ON general_entries(office_id);'
    }
  ],
  agency_entries: [
    {
      name: 'idx_agency_entries_office_id',
      columns: ['office_id'],
      reason: 'Filter agency entries by office',
      sql: 'CREATE INDEX IF NOT EXISTS idx_agency_entries_office_id ON agency_entries(office_id);'
    }
  ],
  uppad_jama_entries: [
    {
      name: 'idx_uppad_jama_entries_office_id',
      columns: ['office_id'],
      reason: 'Filter uppad/jama entries by office',
      sql: 'CREATE INDEX IF NOT EXISTS idx_uppad_jama_entries_office_id ON uppad_jama_entries(office_id);'
    }
  ],
  cash_records: [
    {
      name: 'idx_cash_records_office_id',
      columns: ['office_id'],
      reason: 'Filter cash records by office',
      sql: 'CREATE INDEX IF NOT EXISTS idx_cash_records_office_id ON cash_records(office_id);'
    }
  ]
};

/**
 * Generate SQL script to create all recommended indexes
 * @returns SQL script as string
 */
export function generateIndexCreationScript(): string {
  const lines: string[] = [
    '-- Database Index Creation Script for Multi-Office Support',
    '-- Generated: ' + new Date().toISOString(),
    '-- Purpose: Optimize query performance for office-filtered queries',
    '',
    '-- Note: These indexes should already exist if migrations were applied correctly.',
    '-- This script can be used to verify or recreate indexes if needed.',
    ''
  ];

  Object.entries(INDEX_RECOMMENDATIONS).forEach(([table, indexes]) => {
    lines.push(`-- Indexes for ${table}`);
    indexes.forEach(index => {
      lines.push(`-- ${index.reason}`);
      lines.push(index.sql);
      lines.push('');
    });
  });

  return lines.join('\n');
}

/**
 * Analyze query performance and provide optimization recommendations
 * @returns Array of optimization recommendations
 */
export function analyzePerformanceAndRecommend(): {
  slowQueries: Array<{ query: string; avgTime: number; count: number }>;
  recommendations: string[];
  summary: string;
} {
  const allStats = queryPerformanceAnalyzer.getAllStats();
  const slowQueries: Array<{ query: string; avgTime: number; count: number }> = [];
  const recommendations: string[] = [];

  // Identify slow queries (avg > 500ms)
  allStats.forEach((stats, queryName) => {
    if (stats && stats.avg > 500) {
      slowQueries.push({
        query: queryName,
        avgTime: stats.avg,
        count: stats.count
      });
    }
  });

  // Sort by average time (slowest first)
  slowQueries.sort((a, b) => b.avgTime - a.avgTime);

  // Generate recommendations
  if (slowQueries.length === 0) {
    recommendations.push('✅ All queries are performing well (avg < 500ms)');
  } else {
    recommendations.push(`⚠️ Found ${slowQueries.length} slow queries that need attention:`);
    
    slowQueries.forEach(({ query, avgTime, count }) => {
      recommendations.push(`  - ${query}: ${avgTime.toFixed(2)}ms avg (${count} executions)`);
      
      // Specific recommendations based on query type
      if (query.includes('filtered')) {
        recommendations.push('    → Ensure office_id indexes are created and up to date');
        recommendations.push('    → Consider composite indexes for frequently combined filters');
      }
      
      if (query.includes('getAgencyPayments')) {
        recommendations.push('    → Consider pagination for large datasets');
        recommendations.push('    → Review if all fields in SELECT are necessary');
      }
      
      if (avgTime > 1000) {
        recommendations.push('    → CRITICAL: Query exceeds 1 second, immediate optimization needed');
      }
    });
  }

  // General recommendations
  recommendations.push('');
  recommendations.push('General Optimization Tips:');
  recommendations.push('  1. Ensure all database indexes are created (run generateIndexCreationScript())');
  recommendations.push('  2. Use office_id filters consistently in all queries');
  recommendations.push('  3. Implement pagination for large result sets');
  recommendations.push('  4. Cache frequently accessed data (office list is already cached)');
  recommendations.push('  5. Monitor cache hit rates in OfficeContext');

  const summary = slowQueries.length === 0
    ? '✅ Performance is optimal'
    : `⚠️ ${slowQueries.length} queries need optimization`;

  return {
    slowQueries,
    recommendations,
    summary
  };
}

/**
 * Generate a comprehensive performance report
 * @returns Formatted report string
 */
export function generatePerformanceReport(): string {
  const lines: string[] = [
    '═'.repeat(70),
    '📊 MULTI-OFFICE PERFORMANCE REPORT',
    '═'.repeat(70),
    '',
    'Generated: ' + new Date().toISOString(),
    ''
  ];

  // Query performance section
  lines.push('─'.repeat(70));
  lines.push('QUERY PERFORMANCE ANALYSIS');
  lines.push('─'.repeat(70));
  lines.push('');
  lines.push(queryPerformanceAnalyzer.generateReport());
  lines.push('');

  // Optimization recommendations
  lines.push('─'.repeat(70));
  lines.push('OPTIMIZATION RECOMMENDATIONS');
  lines.push('─'.repeat(70));
  lines.push('');
  
  const analysis = analyzePerformanceAndRecommend();
  lines.push(analysis.summary);
  lines.push('');
  analysis.recommendations.forEach(rec => lines.push(rec));
  lines.push('');

  // Index status
  lines.push('─'.repeat(70));
  lines.push('DATABASE INDEX STATUS');
  lines.push('─'.repeat(70));
  lines.push('');
  lines.push('Expected indexes for optimal performance:');
  
  let totalIndexes = 0;
  Object.entries(INDEX_RECOMMENDATIONS).forEach(([table, indexes]) => {
    lines.push(`  ${table}: ${indexes.length} indexes`);
    totalIndexes += indexes.length;
  });
  
  lines.push('');
  lines.push(`Total recommended indexes: ${totalIndexes}`);
  lines.push('');
  lines.push('To create missing indexes, run:');
  lines.push('  generateIndexCreationScript()');
  lines.push('');

  lines.push('═'.repeat(70));

  return lines.join('\n');
}

/**
 * Log the performance report to console
 */
export function logPerformanceReport(): void {
  console.log(generatePerformanceReport());
}

/**
 * Check if database indexes are likely present based on query performance
 * @returns Object with index health status
 */
export function checkIndexHealth(): {
  healthy: boolean;
  issues: string[];
  suggestions: string[];
} {
  const allStats = queryPerformanceAnalyzer.getAllStats();
  const issues: string[] = [];
  const suggestions: string[] = [];

  // Check for consistently slow filtered queries (might indicate missing indexes)
  allStats.forEach((stats, queryName) => {
    if (queryName.includes('filtered') && stats && stats.avg > 300) {
      issues.push(`Slow filtered query: ${queryName} (${stats.avg.toFixed(2)}ms avg)`);
      suggestions.push(`Verify office_id index exists for ${queryName.split(':')[0]}`);
    }
  });

  const healthy = issues.length === 0;

  if (healthy) {
    suggestions.push('✅ All indexes appear to be working correctly');
  } else {
    suggestions.push('Run: generateIndexCreationScript() to get SQL for missing indexes');
  }

  return {
    healthy,
    issues,
    suggestions
  };
}

/**
 * Export performance data for external analysis
 * @returns JSON string of performance data
 */
export function exportPerformanceData(): string {
  const data = {
    timestamp: new Date().toISOString(),
    queryStats: Array.from(queryPerformanceAnalyzer.getAllStats().entries()).map(([name, stats]) => ({
      name,
      ...stats
    })),
    indexRecommendations: INDEX_RECOMMENDATIONS,
    analysis: analyzePerformanceAndRecommend()
  };

  return JSON.stringify(data, null, 2);
}
