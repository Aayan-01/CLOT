# Quick Fix Checklist for Cloud Run Deployment

## Issue 1: Firestore NOT_FOUND (Error 5)

- [ ] Verify service account has these roles:
  - [ ] Cloud Datastore User
  - [ ] Cloud Datastore Editor
  - [ ] Firebase Admin SDK Administrator

- [ ] Verify Firestore database exists:
  - [ ] Go to Cloud Console → Firestore
  - [ ] Select the correct project
  - [ ] Database should be in "Native" mode

- [ ] Check environment in Cloud Run:
  - [ ] Deploy logs show "Firebase admin initializeApp" success

## Issue 2: GCS Bucket "retro-rate" Not Found

### Quick Fix (2 minutes)
```bash
# Create the missing bucket
gsutil mb gs://retro-rate

# Verify bucket exists
gsutil ls gs://retro-rate

# Set service account permissions
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member=serviceAccount:retro-rate@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/storage.objectCreator

gcloud projects add-iam-policy-binding PROJECT_ID \
  --member=serviceAccount:retro-rate@PROJECT_ID.iam.gserviceaccount.com \
  --role=roles/storage.objectViewer
```

### Verify Configuration
- [ ] Bucket name matches `GCS_BUCKET_NAME` in Cloud Run environment
- [ ] Service account has `Storage Object Creator` role
- [ ] Service account has `Storage Object Viewer` role

### Test Upload
```bash
# From within Cloud Run container (via SSH or local test)
echo "test" | gsutil cp - gs://retro-rate/test.txt
gsutil ls gs://retro-rate/
```

## Deployment Commands

```bash
# 1. Build
gcloud builds submit --tag gcr.io/PROJECT_ID/retro-rate:latest

# 2. Deploy with environment variables
gcloud run deploy retro-rate \
  --image gcr.io/PROJECT_ID/retro-rate:latest \
  --set-env-vars=GCS_BUCKET_NAME=retro-rate \
  --set-env-vars=GCS_MAKE_PUBLIC=true \
  --service-account=retro-rate@PROJECT_ID.iam.gserviceaccount.com \
  --region=us-central1

# 3. Verify deployment
gcloud run services describe retro-rate --region=us-central1
```

## Verification

After deployment, test the analysis endpoint:
```bash
# Should show detailed error messages if anything is wrong
curl -X POST https://retro-rate-HASH.a.run.app/api/analyze \
  -F "file=@test-image.jpg"
```

## Rollback

If issues occur:
```bash
# Check logs
gcloud run logs read retro-rate --limit 50

# Revert to previous revision
gcloud run services update-traffic retro-rate \
  --to-revisions PREVIOUS_REVISION_ID=100
```

