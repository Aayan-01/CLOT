import { Storage } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs';

const bucketName = process.env.GCS_BUCKET_NAME || '';

if (!bucketName) {
  console.warn('GCS_BUCKET_NAME is not set — uploads to GCS will fail until configured');
}

// Initialize storage client — on Cloud Run this will use the attached service account
const storage = new Storage();
const bucket = bucketName ? storage.bucket(bucketName) : null;

export async function uploadFileToGCS(localPath: string, destPath?: string): Promise<{ publicUrl: string; objectName: string }>{
  if (!bucket) throw new Error('GCS bucket not configured');

  const filename = destPath || path.basename(localPath);

  await bucket.upload(localPath, {
    destination: filename,
    metadata: {
      contentType: getContentTypeFromFilename(filename),
    },
  });

  // Make the object publicly readable if env requests it (for quick public access).
  const makePublic = (process.env.GCS_MAKE_PUBLIC || 'true').toLowerCase() === 'true';
  if (makePublic) {
    await bucket.file(filename).makePublic().catch((e) => {
      console.warn('Failed to make object public:', e?.message || e);
    });
  }

  const publicUrl = `https://storage.googleapis.com/${bucketName}/${filename}`;
  return { publicUrl, objectName: filename };
}

function getContentTypeFromFilename(fname: string) {
  const ext = path.extname(fname).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return 'application/octet-stream';
}

export async function uploadBufferToGCS(buffer: Buffer, destPath: string): Promise<{ publicUrl: string; objectName: string }> {
  if (!bucket) throw new Error('GCS bucket not configured');

  const file = bucket.file(destPath);
  await file.save(buffer, { contentType: getContentTypeFromFilename(destPath) });

  const makePublic = (process.env.GCS_MAKE_PUBLIC || 'true').toLowerCase() === 'true';
  if (makePublic) {
    await file.makePublic().catch((e) => console.warn('makePublic failed', e?.message || e));
  }

  const publicUrl = `https://storage.googleapis.com/${bucketName}/${destPath}`;
  return { publicUrl, objectName: destPath };
}

export default { uploadFileToGCS, uploadBufferToGCS };
