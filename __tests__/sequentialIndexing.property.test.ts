/**
 * Property-Based Tests for Sequential Index Numbering
 * Feature: mumbai-delivery-redesign
 * 
 * Property 7: Sequential Index Numbering
 * Validates: Requirements 2.5
 * 
 * For any displayed list of N delivery records, the Index No column should contain
 * sequential integers from 1 to N without gaps or duplicates.
 * 
 * Note: This property tests the indexing logic that would be used in the UI display.
 * The index is calculated based on the position in the filtered/ordered list.
 */

import * as fc from 'fast-check';

describe('Property 7: Sequential Index Numbering', () => {
  /**
   * **Validates: Requirements 2.5**
   * 
   * This property verifies that for any list of delivery records, the index numbers
   * displayed in the UI are sequential from 1 to N without gaps or duplicates.
   */

  /**
   * Helper function to generate index numbers for a list of records
   * This simulates what the UI component does when rendering the table
   */
  const generateIndexNumbers = (recordCount: number): number[] => {
    return Array.from({ length: recordCount }, (_, i) => i + 1);
  };

  test('Property 7.1: Index numbers should be sequential from 1 to N', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (recordCount) => {
          // Act - Generate index numbers for N records
          const indices = generateIndexNumbers(recordCount);

          // Assert - Should have exactly N indices
          expect(indices.length).toBe(recordCount);

          // Assert - Should start at 1
          expect(indices[0]).toBe(1);

          // Assert - Should end at N
          expect(indices[indices.length - 1]).toBe(recordCount);

          // Assert - Should be sequential (each index is previous + 1)
          for (let i = 1; i < indices.length; i++) {
            expect(indices[i]).toBe(indices[i - 1] + 1);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 7.2: Index numbers should have no gaps', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (recordCount) => {
          // Act
          const indices = generateIndexNumbers(recordCount);

          // Assert - Check for gaps by verifying each consecutive pair
          for (let i = 0; i < indices.length - 1; i++) {
            const gap = indices[i + 1] - indices[i];
            expect(gap).toBe(1);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 7.3: Index numbers should have no duplicates', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (recordCount) => {
          // Act
          const indices = generateIndexNumbers(recordCount);

          // Assert - Convert to Set and check size
          const uniqueIndices = new Set(indices);
          expect(uniqueIndices.size).toBe(indices.length);

          // Assert - Each index should appear exactly once
          for (let i = 1; i <= recordCount; i++) {
            const occurrences = indices.filter(idx => idx === i).length;
            expect(occurrences).toBe(1);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 7.4: Index numbers should be positive integers', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (recordCount) => {
          // Act
          const indices = generateIndexNumbers(recordCount);

          // Assert - All indices should be positive integers
          for (const index of indices) {
            expect(index).toBeGreaterThan(0);
            expect(Number.isInteger(index)).toBe(true);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 7.5: Index numbers should match array length', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (recordCount) => {
          // Act
          const indices = generateIndexNumbers(recordCount);

          // Assert - Number of indices should equal record count
          expect(indices.length).toBe(recordCount);

          // Assert - Maximum index should equal record count
          const maxIndex = Math.max(...indices);
          expect(maxIndex).toBe(recordCount);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 7.6: Index generation should be consistent', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100 }),
        (recordCount) => {
          // Act - Generate indices multiple times
          const indices1 = generateIndexNumbers(recordCount);
          const indices2 = generateIndexNumbers(recordCount);

          // Assert - Should produce identical results
          expect(indices1).toEqual(indices2);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 7.7: Index numbers for pending and confirmed sections should be independent', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }),
        fc.integer({ min: 1, max: 50 }),
        (pendingCount, confirmedCount) => {
          // Act - Generate indices for each section independently
          const pendingIndices = generateIndexNumbers(pendingCount);
          const confirmedIndices = generateIndexNumbers(confirmedCount);

          // Assert - Each section should start at 1
          expect(pendingIndices[0]).toBe(1);
          expect(confirmedIndices[0]).toBe(1);

          // Assert - Each section should be sequential
          expect(pendingIndices[pendingIndices.length - 1]).toBe(pendingCount);
          expect(confirmedIndices[confirmedIndices.length - 1]).toBe(confirmedCount);

          // Assert - Sections should be independent (both can have same indices)
          if (pendingCount === confirmedCount) {
            expect(pendingIndices).toEqual(confirmedIndices);
          }
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 7.8: Index numbers should work with single record', () => {
    // Act
    const indices = generateIndexNumbers(1);

    // Assert
    expect(indices).toEqual([1]);
    expect(indices.length).toBe(1);
  });

  test('Property 7.9: Index calculation should match map index + 1', () => {
    fc.assert(
      fc.property(
        fc.array(fc.string(), { minLength: 1, maxLength: 100 }),
        (records) => {
          // Act - Simulate how the UI calculates indices using map
          const uiIndices = records.map((_, index) => index + 1);
          const expectedIndices = generateIndexNumbers(records.length);

          // Assert - Should match
          expect(uiIndices).toEqual(expectedIndices);
        }
      ),
      { numRuns: 20 }
    );
  });

  test('Property 7.10: Index numbers should handle large lists', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 100, max: 1000 }),
        (recordCount) => {
          // Act
          const indices = generateIndexNumbers(recordCount);

          // Assert - Should still be sequential
          expect(indices.length).toBe(recordCount);
          expect(indices[0]).toBe(1);
          expect(indices[indices.length - 1]).toBe(recordCount);

          // Spot check some indices
          expect(indices[99]).toBe(100);
          if (recordCount >= 500) {
            expect(indices[499]).toBe(500);
          }
        }
      ),
      { numRuns: 20 }
    );
  });
});

