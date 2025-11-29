import sharp from 'sharp';
import path from 'path';
import fs from 'fs';

const THUMBNAIL_SIZE = 400;

/**
 * Process uploaded images and create thumbnails
 * Returns array of thumbnail paths
 */
export async function processImages(imagePaths: string[]): Promise<string[]> {
  const thumbnailPaths: string[] = [];

  for (const imagePath of imagePaths) {
    try {
      const fileName = path.basename(imagePath);
      const thumbnailName = `thumb_${fileName}`;
      const thumbnailPath = path.join(path.dirname(imagePath), thumbnailName);

      // Create thumbnail
      await sharp(imagePath)
        .resize(THUMBNAIL_SIZE, THUMBNAIL_SIZE, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .jpeg({ quality: 85 })
        .toFile(thumbnailPath);

      thumbnailPaths.push(thumbnailPath);
    } catch (error) {
      console.error(`Error processing image ${imagePath}:`, error);
      // Use original image if thumbnail creation fails
      thumbnailPaths.push(imagePath);
    }
  }

  return thumbnailPaths;
}

/**
 * Clean up old uploaded files (optional utility)
 */
export async function cleanupOldFiles(
  directory: string,
  maxAgeHours: number = 24
): Promise<void> {
  const now = Date.now();
  const maxAge = maxAgeHours * 60 * 60 * 1000;

  try {
    const files = fs.readdirSync(directory);
    
    for (const file of files) {
      if (file === '.gitkeep') continue;
      
      const filePath = path.join(directory, file);
      const stats = fs.statSync(filePath);
      
      if (now - stats.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
        console.log(`Cleaned up old file: ${file}`);
      }
    }
  } catch (error) {
    console.error('Error cleaning up files:', error);
  }
}