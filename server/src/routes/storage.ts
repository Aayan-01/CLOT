import express from 'express';
import { Storage } from '@google-cloud/storage';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const router = express.Router();

const bucketName = process.env.GCS_BUCKET_NAME || '';
const storage = bucketName ? new Storage() : null;
const bucket = storage && bucketName ? storage.bucket(bucketName) : null;

// Proxy route to stream files from GCS using server credentials.
// Example: GET /api/storage?object=uploads%2Fthumbnails%2Fthumb.jpg
router.get('/storage', async (req, res) => {
  try {
    const objectName = String(req.query.object || '');
    if (!bucket || !objectName) return res.status(404).send('Not found');

    const file = bucket.file(objectName);
    const [exists] = await file.exists();
    if (!exists) return res.status(404).send('Not found');

    const [meta] = await file.getMetadata();
    if (meta && meta.contentType) res.setHeader('Content-Type', meta.contentType);

    const stream = file.createReadStream();
    stream.on('error', (err: any) => {
      console.warn('GCS stream error:', err?.message || err);
      res.status(500).send('Failed to read object');
    });
    stream.pipe(res);
  } catch (err: any) {
    console.error('Storage proxy error:', err?.message || err);
    res.status(500).send('Storage proxy failure');
  }
});

export default router;
