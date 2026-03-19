/**
 * Unit tests for Supabase client initialization guard logic.
 * Tests the validation rules for SUPABASE_URL and SUPABASE_ANON_KEY.
 */

// These tests validate the guard logic directly, without importing the real module,
// because react-native-config requires a native bridge unavailable in Jest.

function validateSupabaseConfig(url: string | undefined, key: string | undefined): void {
  if (!url || url === 'your_supabase_url_here') {
    throw new Error('SUPABASE_URL is not configured in .env');
  }
  if (!key || key === 'your_supabase_anon_key_here') {
    throw new Error('SUPABASE_ANON_KEY is not configured in .env');
  }
}

describe('Supabase config validation', () => {
  it('throws when SUPABASE_URL is empty string', () => {
    expect(() => validateSupabaseConfig('', 'valid-key')).toThrow('SUPABASE_URL is not configured');
  });

  it('throws when SUPABASE_URL is undefined', () => {
    expect(() => validateSupabaseConfig(undefined, 'valid-key')).toThrow('SUPABASE_URL is not configured');
  });

  it('throws when SUPABASE_URL is placeholder value', () => {
    expect(() => validateSupabaseConfig('your_supabase_url_here', 'valid-key')).toThrow('SUPABASE_URL is not configured');
  });

  it('throws when SUPABASE_ANON_KEY is empty string', () => {
    expect(() => validateSupabaseConfig('https://example.supabase.co', '')).toThrow('SUPABASE_ANON_KEY is not configured');
  });

  it('throws when SUPABASE_ANON_KEY is undefined', () => {
    expect(() => validateSupabaseConfig('https://example.supabase.co', undefined)).toThrow('SUPABASE_ANON_KEY is not configured');
  });

  it('throws when SUPABASE_ANON_KEY is placeholder value', () => {
    expect(() => validateSupabaseConfig('https://example.supabase.co', 'your_supabase_anon_key_here')).toThrow('SUPABASE_ANON_KEY is not configured');
  });

  it('does not throw when both values are valid', () => {
    expect(() => validateSupabaseConfig('https://example.supabase.co', 'eyJhbGciOiJIUzI1NiJ9.valid')).not.toThrow();
  });

  it('accepts any non-placeholder URL', () => {
    expect(() => validateSupabaseConfig('https://myproject.supabase.co', 'valid-key')).not.toThrow();
  });
});
