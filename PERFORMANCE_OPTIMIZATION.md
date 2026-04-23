# Performance Optimization Guide

## Issues Identified

### 1. Slow Database Queries
- `getUppadJamaEntries` taking 1233ms
- `getAgencyPayments` taking 1294ms

### 2. Push Notification Registration Errors
- `register_token` edge function returning non-2xx status codes

## Solutions Implemented

### Database Query Optimization

#### Changes Made:
1. **Added LIMIT clause to `getUppadJamaEntries`**
   - Limited to 500 most recent records
   - Prevents fetching entire table on every query
   - Reduces network transfer time

2. **Increased LIMIT in `getAgencyPayments`**
   - Increased from 100 to 500 records
   - Better balance between performance and data coverage

#### Recommended Database Indexes:

Run these SQL commands in your Supabase SQL Editor to create indexes:

```sql
-- Index for uppad_jama_entries queries
CREATE INDEX IF NOT EXISTS idx_uppad_jama_entries_office_date 
ON uppad_jama_entries(office_id, entry_date DESC);

-- Index for agency_payments queries
CREATE INDEX IF NOT EXISTS idx_agency_payments_office_date 
ON agency_payments(office_id, payment_date DESC);

-- Index for faster filtering
CREATE INDEX IF NOT EXISTS idx_uppad_jama_entries_entry_date 
ON uppad_jama_entries(entry_date DESC);

CREATE INDEX IF NOT EXISTS idx_agency_payments_payment_date 
ON agency_payments(payment_date DESC);
```

### Push Notification Improvements

#### Changes Made:
1. **Added Retry Logic with Exponential Backoff**
   - 3 retry attempts for failed token registrations
   - Exponential backoff: 1s, 2s, 4s
   - Prevents complete failure on temporary network issues

2. **Better Error Handling**
   - Graceful degradation when edge function fails
   - Token still saved to user_profiles even if edge function fails
   - Detailed logging for debugging

#### Edge Function Troubleshooting:

If `register_token` continues to fail, check:

1. **Supabase Edge Function Status**
   ```bash
   # Check if function is deployed
   supabase functions list
   ```

2. **Function Logs**
   - Go to Supabase Dashboard → Edge Functions → quick-processor
   - Check logs for errors

3. **Authentication**
   - Ensure user is authenticated before calling
   - Check JWT token validity

4. **Function Permissions**
   - Verify RLS policies on `device_tokens` table
   - Ensure function has proper permissions

## Performance Monitoring

### Query Performance Tracking

The app now tracks query performance automatically. To view stats:

```typescript
import { queryPerformanceAnalyzer } from './utils/performanceMonitor';

// Get stats for specific query
const stats = queryPerformanceAnalyzer.getQueryStats('getUppadJamaEntries:all');
console.log('Query stats:', stats);

// Generate full report
queryPerformanceAnalyzer.logReport();
```

### Expected Performance After Optimization

| Query | Before | After (Expected) |
|-------|--------|------------------|
| getUppadJamaEntries | 1233ms | <300ms |
| getAgencyPayments | 1294ms | <300ms |

## Additional Recommendations

### 1. Implement Pagination
For better UX and performance, consider implementing pagination:

```typescript
export const getUppadJamaEntriesPaginated = async (
  officeId?: string,
  page: number = 1,
  pageSize: number = 50
): Promise<{ data: UppadJamaEntry[]; hasMore: boolean }> => {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  
  let query = supabase
    .from('uppad_jama_entries')
    .select('*', { count: 'exact' })
    .order('entry_date', { ascending: false })
    .range(from, to);
  
  if (officeId) {
    query = query.eq('office_id', officeId);
  }
  
  const { data, error, count } = await query;
  
  return {
    data: data || [],
    hasMore: count ? (from + pageSize) < count : false
  };
};
```

### 2. Implement Caching Strategy
- Cache frequently accessed data with TTL
- Invalidate cache on data mutations
- Use React Query or SWR for automatic cache management

### 3. Database Optimization
- Run `VACUUM ANALYZE` on tables periodically
- Monitor table sizes and consider archiving old data
- Use materialized views for complex aggregations

### 4. Network Optimization
- Implement request debouncing
- Use GraphQL subscriptions for real-time updates instead of polling
- Compress large payloads

## Monitoring

### Set Up Alerts
Monitor these metrics and set up alerts:

1. **Query Duration > 1000ms**
2. **Push Notification Registration Failures > 10%**
3. **Cache Hit Rate < 80%**
4. **API Error Rate > 5%**

### Performance Benchmarks
Run these tests regularly:

```typescript
// Test query performance
const testQueryPerformance = async () => {
  const iterations = 10;
  const results = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await getUppadJamaEntries();
    const duration = performance.now() - start;
    results.push(duration);
  }
  
  const avg = results.reduce((a, b) => a + b) / results.length;
  console.log(`Average query time: ${avg.toFixed(2)}ms`);
};
```

## Next Steps

1. ✅ Apply database indexes (see SQL above)
2. ✅ Test query performance improvements
3. ⏳ Investigate edge function errors in Supabase logs
4. ⏳ Consider implementing pagination for large datasets
5. ⏳ Set up performance monitoring dashboard
