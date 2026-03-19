/**
 * Unit tests for notification deduplication logic.
 * Tests the content-based dedup key generation and Set-based tracking.
 */

// --- Helpers mirroring AdminNotificationListener logic ---

function makeDeduplicationKey(title: string, message: string): string {
  return `${title}_${message.slice(0, 50)}`;
}

class NotificationDeduplicator {
  private shownKeys = new Set<string>();

  isDuplicate(title: string, message: string): boolean {
    const key = makeDeduplicationKey(title, message);
    if (this.shownKeys.has(key)) return true;
    this.shownKeys.add(key);
    return false;
  }

  clear() {
    this.shownKeys.clear();
  }

  size() {
    return this.shownKeys.size;
  }
}

// --- Tests ---

describe('Notification Deduplication', () => {
  let dedup: NotificationDeduplicator;

  beforeEach(() => {
    dedup = new NotificationDeduplicator();
  });

  it('allows first notification through', () => {
    expect(dedup.isDuplicate('New Payment Added', 'John added a payment')).toBe(false);
  });

  it('blocks identical notification sent twice', () => {
    dedup.isDuplicate('New Payment Added', 'John added a payment');
    expect(dedup.isDuplicate('New Payment Added', 'John added a payment')).toBe(true);
  });

  it('allows notifications with different titles', () => {
    dedup.isDuplicate('New Payment Added', 'John added a payment');
    expect(dedup.isDuplicate('Entry Deleted', 'John added a payment')).toBe(false);
  });

  it('allows notifications with different messages', () => {
    dedup.isDuplicate('New Payment Added', 'John added a payment');
    expect(dedup.isDuplicate('New Payment Added', 'Jane added a payment')).toBe(false);
  });

  it('uses only first 50 chars of message for key', () => {
    const longMsg = 'A'.repeat(100);
    const sameStartMsg = 'A'.repeat(50) + 'B'.repeat(50);
    dedup.isDuplicate('Title', longMsg);
    // Same first 50 chars → duplicate
    expect(dedup.isDuplicate('Title', sameStartMsg)).toBe(true);
  });

  it('tracks multiple unique notifications', () => {
    dedup.isDuplicate('Title A', 'Message 1');
    dedup.isDuplicate('Title B', 'Message 2');
    dedup.isDuplicate('Title C', 'Message 3');
    expect(dedup.size()).toBe(3);
  });

  it('clears state correctly', () => {
    dedup.isDuplicate('Title', 'Message');
    dedup.clear();
    expect(dedup.size()).toBe(0);
    // After clear, same notification should be allowed again
    expect(dedup.isDuplicate('Title', 'Message')).toBe(false);
  });

  it('handles empty strings without throwing', () => {
    expect(() => dedup.isDuplicate('', '')).not.toThrow();
  });

  it('handles rapid duplicate calls (race condition simulation)', () => {
    // Simulate two simultaneous calls — only first should pass
    const results = [
      dedup.isDuplicate('FCM Push', 'User added entry'),
      dedup.isDuplicate('FCM Push', 'User added entry'),
      dedup.isDuplicate('FCM Push', 'User added entry'),
    ];
    expect(results[0]).toBe(false); // first passes
    expect(results[1]).toBe(true);  // duplicate
    expect(results[2]).toBe(true);  // duplicate
  });
});
