/**
 * Unit tests for Supabase client initialization.
 * Verifies env-var validation and lazy singleton behavior.
 */

// Mock react-native-config before importing supabase
jest.mock('react-native-config', () => ({
  default: {},
}));

// Mock @supabase/supabase-js
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ auth: {}, from: jest.fn() })),
}));

// Mock react-native-url-polyfill/auto
jest.mock('react-native-url-polyfill/auto', () => ({}));

// Mock AsyncStorage (already in setup.js but explicit here for clarity)
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

import Config from 'react-native-config';
import { createClient } from '@supabase/supabase-js';

describe('Supabase client initialization', () => {
  beforeEach(() => {
    jest.resetModules();
    // Reset Config mock values
    (Config as any).SUPABASE_URL = undefined;
    (Config as any).SUPABASE_ANON_KEY = undefined;
  });

  it('throws when SUPABASE_URL is missing', () => {
    (Config as any).SUPABASE_URL = '';
    (Config as any).SUPABASE_ANON_KEY = 'some-key';

    jest.isolateModules(() => {
      const { getSupabase } = require('../src/supabase');
      expect(() => getSupabase()).toThrow('SUPABASE_URL is not configured');
    });
  });

  it('throws when SUPABASE_URL is placeholder', () => {
    (Config as any).SUPABASE_URL = 'your_supabase_url_here';
    (Config as any).SUPABASE_ANON_KEY = 'some-key';

    jest.isolateModules(() => {
      const { getSupabase } = require('../src/supabase');
      expect(() => getSupabase()).toThrow('SUPABASE_URL is not configured');
    });
  });

  it('throws when SUPABASE_ANON_KEY is missing', () => {
    (Config as any).SUPABASE_URL = 'https://example.supabase.co';
    (Config as any).SUPABASE_ANON_KEY = '';

    jest.isolateModules(() => {
      const { getSupabase } = require('../src/supabase');
      expect(() => getSupabase()).toThrow('SUPABASE_ANON_KEY is not configured');
    });
  });

  it('throws when SUPABASE_ANON_KEY is placeholder', () => {
    (Config as any).SUPABASE_URL = 'https://example.supabase.co';
    (Config as any).SUPABASE_ANON_KEY = 'your_supabase_anon_key_here';

    jest.isolateModules(() => {
      const { getSupabase } = require('../src/supabase');
      expect(() => getSupabase()).toThrow('SUPABASE_ANON_KEY is not configured');
    });
  });

  it('creates client when both env vars are valid', () => {
    (Config as any).SUPABASE_URL = 'https://example.supabase.co';
    (Config as any).SUPABASE_ANON_KEY = 'valid-anon-key';

    jest.isolateModules(() => {
      const { getSupabase } = require('../src/supabase');
      expect(() => getSupabase()).not.toThrow();
      expect(createClient).toHaveBeenCalledWith(
        'https://example.supabase.co',
        'valid-anon-key',
        expect.any(Object)
      );
    });
  });

  it('returns same singleton instance on repeated calls', () => {
    (Config as any).SUPABASE_URL = 'https://example.supabase.co';
    (Config as any).SUPABASE_ANON_KEY = 'valid-anon-key';

    jest.isolateModules(() => {
      const { getSupabase } = require('../src/supabase');
      const first = getSupabase();
      const second = getSupabase();
      expect(first).toBe(second);
      // createClient should only be called once
      expect(createClient).toHaveBeenCalledTimes(1);
    });
  });
});
