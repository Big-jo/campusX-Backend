/**
 * Statistical distribution utilities for realistic social patterns
 */

/**
 * Zipf's law distribution
 * Used for: Post engagement (few posts get most likes)
 *
 * @param rank - Item rank (1-indexed)
 * @param n - Total items
 * @param s - Exponent (typically 1.0)
 */
export function zipfProbability(rank: number, n: number, s: number = 1.0): number {
  const denominator = Array.from({ length: n }, (_, i) => 1 / Math.pow(i + 1, s))
    .reduce((sum, val) => sum + val, 0);

  return (1 / Math.pow(rank, s)) / denominator;
}

/**
 * Power law distribution
 * Used for: User activity levels (80/20 rule)
 *
 * @param x - Value
 * @param alpha - Exponent (typically 2-3)
 */
export function powerLaw(x: number, alpha: number = 2.5): number {
  return Math.pow(x, -alpha);
}

/**
 * Sample from Zipf distribution
 *
 * @param n - Number of items
 * @returns Index of selected item (0-indexed)
 */
export function sampleZipf(n: number): number {
  const probabilities = Array.from({ length: n }, (_, i) =>
    zipfProbability(i + 1, n)
  );

  const random = Math.random();
  let cumulative = 0;

  for (let i = 0; i < probabilities.length; i++) {
    cumulative += probabilities[i];
    if (random <= cumulative) {
      return i;
    }
  }

  return n - 1; // Fallback
}

/**
 * Poisson distribution for time-based events
 * Used for: Post creation timing
 *
 * @param lambda - Average rate
 */
export function poissonSample(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;

  do {
    k++;
    p *= Math.random();
  } while (p > L);

  return k - 1;
}

/**
 * Time decay function
 * Recent content has higher probability of engagement
 *
 * @param ageInHours - Age of content in hours
 * @param halfLife - Hours for probability to halve (default: 24)
 */
export function timeDecay(ageInHours: number, halfLife: number = 24): number {
  return Math.exp(-Math.log(2) * ageInHours / halfLife);
}

/**
 * Sample N items from array based on weights
 *
 * @param items - Array of items
 * @param weights - Corresponding weights
 * @param n - Number of samples
 * @param replace - Sample with replacement
 */
export function weightedSample<T>(
  items: T[],
  weights: number[],
  n: number,
  replace: boolean = false
): T[] {
  if (items.length !== weights.length) {
    throw new Error('Items and weights must have same length');
  }

  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const normalizedWeights = weights.map(w => w / totalWeight);

  const selected: T[] = [];
  const availableIndices = new Set(items.map((_, i) => i));

  for (let i = 0; i < n && (replace || availableIndices.size > 0); i++) {
    const random = Math.random();
    let cumulative = 0;
    let selectedIndex = -1;

    const indices = replace ?
      Array.from({ length: items.length }, (_, i) => i) :
      Array.from(availableIndices);

    for (const idx of indices) {
      cumulative += normalizedWeights[idx];
      if (random <= cumulative) {
        selectedIndex = idx;
        break;
      }
    }

    if (selectedIndex === -1) {
      selectedIndex = indices[indices.length - 1];
    }

    selected.push(items[selectedIndex]);

    if (!replace) {
      availableIndices.delete(selectedIndex);
    }
  }

  return selected;
}

/**
 * Generate activity schedule based on realistic patterns
 * Peak hours: 7-9am, 12-2pm, 6-11pm (Nigerian time zones)
 */
export function getActivityMultiplier(hour: number): number {
  // Morning peak (7-9am)
  if (hour >= 7 && hour <= 9) return 1.5;

  // Afternoon peak (12-2pm)
  if (hour >= 12 && hour <= 14) return 1.8;

  // Evening peak (6-11pm)
  if (hour >= 18 && hour <= 23) return 2.0;

  // Late night (12-3am)
  if (hour >= 0 && hour <= 3) return 0.8;

  // Early morning (4-6am)
  if (hour >= 4 && hour <= 6) return 0.3;

  // Default
  return 1.0;
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
export function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
