import { estimatePrice } from '../src/services/priceEstimator';

describe('Price Estimator', () => {
  test('should return plausible price range for known brand', () => {
    const result = estimatePrice({
      brand: 'Nike',
      condition: 4,
      era: 'Modern',
      authenticityScore: 85,
    });

    expect(result.inr.median).toBeGreaterThan(1000);
    expect(result.inr.low).toBeLessThan(result.inr.median);
    expect(result.inr.high).toBeGreaterThan(result.inr.median);
    expect(result.usd.median).toBeGreaterThan(0);
    expect(result.confidence).toBeGreaterThanOrEqual(50);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });

  test('should apply vintage multiplier correctly', () => {
    const modernPrice = estimatePrice({
      brand: 'Levi\'s',
      condition: 3,
      era: 'Modern',
      authenticityScore: 75,
    });

    const vintagePrice = estimatePrice({
      brand: 'Levi\'s',
      condition: 3,
      era: 'Vintage 1980s',
      authenticityScore: 75,
    });

    expect(vintagePrice.inr.median).toBeGreaterThan(modernPrice.inr.median);
  });

  test('should penalize low authenticity scores', () => {
    const highAuthPrice = estimatePrice({
      brand: 'Gucci',
      condition: 4,
      era: 'Modern',
      authenticityScore: 90,
    });

    const lowAuthPrice = estimatePrice({
      brand: 'Gucci',
      condition: 4,
      era: 'Modern',
      authenticityScore: 30,
    });

    expect(lowAuthPrice.inr.median).toBeLessThan(highAuthPrice.inr.median * 0.5);
  });

  test('should handle unknown brands with default multiplier', () => {
    const result = estimatePrice({
      brand: 'Unknown Brand XYZ',
      condition: 3,
      era: 'Modern',
      authenticityScore: 70,
    });

    expect(result.inr.median).toBeGreaterThan(0);
    expect(result.inr.median).toBeLessThan(2000); // Should be modest for unknown brand
  });

  test('should apply condition multipliers correctly', () => {
    const conditions = [1, 2, 3, 4, 5];
    const prices = conditions.map(condition =>
      estimatePrice({
        brand: 'Nike',
        condition,
        era: 'Modern',
        authenticityScore: 75,
      })
    );

    // Prices should generally increase with condition
    for (let i = 0; i < prices.length - 1; i++) {
      expect(prices[i + 1].inr.median).toBeGreaterThan(prices[i].inr.median);
    }
  });

  test('should return confidence score within valid range', () => {
    const result = estimatePrice({
      brand: 'Supreme',
      condition: 5,
      era: 'Modern',
      authenticityScore: 95,
    });

    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });
});