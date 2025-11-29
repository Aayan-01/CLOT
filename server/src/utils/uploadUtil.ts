import path from 'path';

/**
 * Build a thumbnail URL for a given server-side file path using the request
 * origin. This uses path.basename to be cross-platform (works on Windows).
 */
export function createThumbnailUrl(req: any, filePath: string): string {
  const filename = path.basename(filePath);
  const origin = `${req.protocol}://${req.get('host')}`;
  return `${origin}/uploads/${filename}`;
}

export default createThumbnailUrl;
