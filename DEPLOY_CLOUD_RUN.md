# Deploying to Google Cloud Run — quick guide (what to replace)

This doc shows the minimal changes and the exact values/"codes" you will need to provide from Google Cloud when deploying the project to Cloud Run.

IMPORTANT: fill in the placeholders below with your actual values in the Cloud Run service configuration (or inject via Secret Manager).

Required GCP resources / values you must provide:

- GCP_PROJECT_ID — your Google Cloud project id
- GCS_BUCKET_NAME — the name of the Google Cloud Storage bucket where uploads will be stored. Example: `my-cloth-app-uploads`
- SECRET NAMES in Secret Manager:
  - `projects/<GCP_PROJECT>/secrets/GOOGLE_CLOUD_GEMINI_API_KEY/versions/latest` — Gemini Pro Vision key
  - `projects/<GCP_PROJECT>/secrets/GOOGLE_AI_STUDIO_FLASH_API_KEY/versions/latest` — Gemini Flash/chat key
  - `projects/<GCP_PROJECT>/secrets/SESSION_SECRET/versions/latest` — strong session secret
- Optionally: FIRESTORE project and region (Firestore typically lives in the same project). The server uses application-default credentials so you usually don't need to put a key file in the container.

Files and placeholders in the repo which you must replace or configure in Cloud Run / CI/CD:

- client/index.html
  - Replace `G-XXXXXXXXXX` with your real Google Analytics measurement id

- .env / Cloud Run service environment (or Secret Manager)
  - `GOOGLE_CLOUD_GEMINI_API_KEY` → set as Secret Manager secret or environment variable
  - `GOOGLE_AI_STUDIO_FLASH_API_KEY` → set as Secret Manager secret or environment variable
  - `GCS_BUCKET_NAME` → your GCS bucket name
  - `GCS_MAKE_PUBLIC` → (true/false) whether objects should be made publicly readable (recommended: set false and use signed URLs, but for quick demo 'true' works)
  - `SESSION_SECRET` → set as secret

  # Networking / frontend-backend settings
  - `ALLOWED_ORIGINS` → comma-separated list of allowed CORS origins (e.g. `https://retrorate.in,https://www.retrorate.in`). When the frontend (client) is hosted separately, set this to the frontend origin so browsers can successfully call your backend.
  - `VITE_API_ORIGIN` → the backend URL used by the compiled frontend to reach your API, for example `https://api.retrorate.in`. When building/publishing the client for production set this so the frontend makes API calls to the correct Cloud Run endpoint rather than localhost.

  Client-only hosting (static site on Google Cloud Storage)

  If you're only hosting the frontend on Google Cloud (static hosting) and your backend is elsewhere (e.g., Cloud Run), we include a CI workflow that builds the client with the correct backend URL and syncs to a GCS bucket.

  Required repo secrets for the client deploy workflow:
  - `GCP_SA_KEY` — JSON service account key (Storage Admin or Storage Object Admin)
  - `GCP_PROJECT_ID` — your project id
  - `GCS_BUCKET_NAME` — the bucket name to deploy the built client files into
  - `BACKEND_API_URL` — the URL the frontend should call (same value will be injected into the build as `VITE_API_ORIGIN`)

  Check `.github/workflows/deploy-client-gcs.yml` for the example implementation. The action sets VITE_API_ORIGIN from `BACKEND_API_URL` and uploads the `client/dist` directory to your bucket.

How the repo is wired after the changes:

- Uploads are accepted by the server via multer memory storage (Cloud Run ephemeral storage). Files are written to `/tmp` for processing and then uploaded to your configured GCS bucket in `uploads/originals` and `uploads/thumbnails`.
- Thumbnails and original image public URLs (if `GCS_MAKE_PUBLIC=true`) will be used directly in responses. The server will also write AI analysis logs to Firestore (`ai_logs` collection) if Firestore is enabled in the project.

Quick Cloud Run commands (replace placeholders):

1) Build & push image (using Cloud Build)
```bash
gcloud builds submit --tag gcr.io/<GCP_PROJECT_ID>/retro-rate:latest
```

2) Deploy to Cloud Run (set env vars & attach secrets)
```bash
gcloud run deploy retro-rate \
  --image gcr.io/<GCP_PROJECT_ID>/retro-rate:latest \
  --platform managed --region=<REGION> \
  --allow-unauthenticated \
  --set-env-vars=GCS_MAKE_PUBLIC=true \
  --update-secrets=GCS_BUCKET_NAME=projects/<GCP_PROJECT>/secrets/GCS_BUCKET_NAME:latest,GOOGLE_CLOUD_GEMINI_API_KEY=projects/<GCP_PROJECT>/secrets/GOOGLE_CLOUD_GEMINI_API_KEY:latest,GOOGLE_AI_STUDIO_FLASH_API_KEY=projects/<GCP_PROJECT>/secrets/GOOGLE_AI_STUDIO_FLASH_API_KEY:latest,SESSION_SECRET=projects/<GCP_PROJECT>/secrets/SESSION_SECRET:latest
```

Notes / replacement checklist before launching:

- Create the GCS bucket and set the preferred ACL (public vs private). If private, change upload code later to return signed URLs rather than public URLs.
- Create Secret Manager secrets for the Gemini keys and session secret and grant the Cloud Run service account `roles/secretmanager.secretAccessor`.
- Enable Firestore (Native mode) in the same project if you want the AI logs stored.
- Configure the Cloud Run service account with “Cloud Storage Object Admin” (or narrower) to allow file uploads.

If you want, I've added a sample GitHub Actions workflow in `.github/workflows/deploy-cloud-run.yml` that will build and deploy to Cloud Run for project - project-ea152037-584b-4621-acf (the service assumes your Secret Manager secrets are named exactly `GOOGLE_CLOUD_GEMINI_API_KEY`, `GOOGLE_AI_STUDIO_FLASH_API_KEY`, and `SESSION_SECRET`).

Important: Add these GitHub repository secrets before you push to `main` so the workflow can authenticate and deploy:

- `GCP_SA_KEY` → JSON contents of a service account key with permissions: Cloud Run Admin, Storage Object Admin, Secret Manager Secret Accessor, Cloud Build Editor, Firestore User
- `GCP_PROJECT_ID` → project-ea152037-584b-4621-acf
- `GCP_REGION` → e.g. `us-central1`
- `GCS_MAKE_PUBLIC` → `true` or `false` (we recommend `false` in production)

Note: The workflow maps `GCS_BUCKET_NAME` into the Cloud Run service from Secret Manager (not a GitHub secret). Make sure a Secret Manager secret named `GCS_BUCKET_NAME` exists in the project containing the name of the bucket (or adjust the workflow to pass via GitHub secret if preferred).

The workflow file maps Secret Manager secrets into Cloud Run service environment using `--update-secrets` and also sets `GCS_BUCKET_NAME` as an environment variable for the container.
