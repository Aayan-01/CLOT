import { computeAuthenticity } from '../src/services/authenticator';
import { GeminiVisionResult } from '../src/types';

describe('Authenticator', () => {
  test('should give high score for strong brand indicators', async () => {
    const mockVision: GeminiVisionResult = {
      labels: ['high-quality', 'cotton', 't-shirt'],
      ocrText: 'Nike Made in Vietnam 100% Cotton',
      logoDetection: ['nike', 'swoosh'],
      captions: ['Professional stitching, reinforced seams, authentic Nike swoosh'],
    };

    const result = await computeAuthenticity(mockVision);

    expect(result.score).toBeGreaterThan(70);
    expect(result.explanation.length).toBeGreaterThan(0);
    expect(result.detectedBrand).toBe('Nike');
  });

  test('should detect suspicious indicators', async () => {
    const mockVision: GeminiVisionResult = {
      labels: ['poor-quality', 'cheap'],
      ocrText: 'Replica Made in China AAA Quality',
      logoDetection: [],
      captions: ['Uneven stitching, misaligned logo, suspicious quality'],
    };

    const result = await computeAuthenticity(mockVision);

    expect(result.score).toBeLessThan(50);
    expect(result.explanation.some(e => e.includes('✗') || e.includes('⚠'))).toBe(true);
  });

  test('should handle missing logo detection', async () => {
    const mockVision: GeminiVisionResult = {
      labels: ['fabric', 'clothing'],
      ocrText: '',
      logoDetection: [],
      captions: ['Generic clothing item with no visible branding'],
    };

    const result = await computeAuthenticity(mockVision);

    expect(result.score).toBeLessThanOrEqual(60);
    expect(result.explanation.some(e => e.includes('No recognizable'))).toBe(true);
  });

  test('should recognize quality indicators', async () => {
    const mockVision: GeminiVisionResult = {
      labels: ['premium', 'leather'],
      ocrText: 'Made in Italy Genuine Leather',
      logoDetection: ['gucci'],
      captions: ['High-quality craftsmanship, fine stitching, premium materials'],
    };

    const result = await computeAuthenticity(mockVision);

    expect(result.score).toBeGreaterThan(75);
    expect(result.explanation.some(e => e.includes('✓'))).toBe(true);
  });

  test('should return confidence score', async () => {
    const mockVision: GeminiVisionResult = {
      labels: ['denim'],
      ocrText: 'Levi\'s 501 Original',
      logoDetection: ['levis'],
      captions: ['Classic Levi\'s jeans with red tab'],
    };

    const result = await computeAuthenticity(mockVision);

    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);
  });
});