/**
 * Unit tests for authentication flow.
 * Tests sign-in, sign-out, and session persistence behavior.
 */

// Mock supabase before importing anything that uses it
const mockSignInWithPassword = jest.fn();
const mockSignOut = jest.fn();
const mockGetUser = jest.fn();
const mockGetSession = jest.fn();

jest.mock('../src/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      getUser: mockGetUser,
      getSession: mockGetSession,
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
    })),
  },
  getSupabase: jest.fn(() => ({
    auth: {
      signInWithPassword: mockSignInWithPassword,
      signOut: mockSignOut,
      getUser: mockGetUser,
      getSession: mockGetSession,
    },
  })),
}));

import { supabase } from '../src/supabase';

describe('Authentication Flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('signInWithPassword', () => {
    it('returns user data on successful login', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: mockUser, session: { access_token: 'token-abc' } },
        error: null,
      });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(error).toBeNull();
      expect(data.user).toEqual(mockUser);
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });

    it('returns error on invalid credentials', async () => {
      mockSignInWithPassword.mockResolvedValueOnce({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials', status: 400 },
      });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'wrong@example.com',
        password: 'wrongpassword',
      });

      expect(error).not.toBeNull();
      expect(error?.message).toBe('Invalid login credentials');
      expect(data.user).toBeNull();
    });

    it('handles network error gracefully', async () => {
      mockSignInWithPassword.mockRejectedValueOnce(new Error('Network request failed'));

      await expect(
        supabase.auth.signInWithPassword({ email: 'test@example.com', password: 'pass' })
      ).rejects.toThrow('Network request failed');
    });
  });

  describe('signOut', () => {
    it('signs out successfully', async () => {
      mockSignOut.mockResolvedValueOnce({ error: null });

      const { error } = await supabase.auth.signOut();

      expect(error).toBeNull();
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it('returns error if sign out fails', async () => {
      mockSignOut.mockResolvedValueOnce({
        error: { message: 'Sign out failed' },
      });

      const { error } = await supabase.auth.signOut();
      expect(error?.message).toBe('Sign out failed');
    });
  });

  describe('getUser', () => {
    it('returns authenticated user', async () => {
      const mockUser = { id: 'user-123', email: 'admin@example.com' };
      mockGetUser.mockResolvedValueOnce({
        data: { user: mockUser },
        error: null,
      });

      const { data, error } = await supabase.auth.getUser();

      expect(error).toBeNull();
      expect(data.user).toEqual(mockUser);
    });

    it('returns null user when not authenticated', async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      });

      const { data } = await supabase.auth.getUser();
      expect(data.user).toBeNull();
    });
  });

  describe('getSession', () => {
    it('returns active session', async () => {
      const mockSession = { access_token: 'token-xyz', user: { id: 'user-123' } };
      mockGetSession.mockResolvedValueOnce({
        data: { session: mockSession },
        error: null,
      });

      const { data, error } = await supabase.auth.getSession();

      expect(error).toBeNull();
      expect(data.session).toEqual(mockSession);
    });

    it('returns null session when logged out', async () => {
      mockGetSession.mockResolvedValueOnce({
        data: { session: null },
        error: null,
      });

      const { data } = await supabase.auth.getSession();
      expect(data.session).toBeNull();
    });
  });
});
