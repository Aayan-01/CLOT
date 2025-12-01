import path from 'path';

/**
 * Build a thumbnail URL for a given server-side file path using the request
 * origin. This uses path.basename to be cross-platform (works on Windows).
 */
export function createThumbnailUrl(req: any, filePath: string): string {
  // If path already looks like a URL, return it unchanged
  if (/^https?:\/\//i.test(filePath)) return filePath;

  const filename = path.basename(filePath);

  // If configured to use GCS in production, return the storage.googleapis.com public URL
  const bucket = process.env.GCS_BUCKET_NAME;
  if (bucket) {
    return `https://storage.googleapis.com/${bucket}/${filename}`;
  }

  const origin = `${req.protocol}://${req.get('host')}`;
  return `${origin}/uploads/${filename}`;
}

export default createThumbnailUrl;
