# Cloth Authenticator & Price Estimator

AI-powered cloth authentication and price estimation system using Gemini Vision AI. Upload 1-3 images and get instant analysis of authenticity, condition, era, and estimated resale prices in INR and USD.

## Features

- 🔍 **AI-Powered Authentication**: Uses Google Gemini Vision to analyze clothing items
- 💰 **Price Estimation**: Provides low/median/high estimates for both Indian (INR) and US (USD) markets
- 🏷️ **Brand Detection**: Identifies brands with confidence scores
- 📊 **Condition Assessment**: Rates item condition on a 1-5 scale
- 🕰️ **Era Classification**: Determines if item is vintage or modern
- 💬 **Chat Interface**: Ask follow-up questions about your items
- 🎨 **Modern UI**: Responsive design inspired by Grailed/StockX/Vinted

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- Axios for API calls

### Backend
- Node.js + Express + TypeScript
- Multer for file uploads
- Sharp for image processing
- Google Gemini API for AI analysis
- Express Session for session management

## Prerequisites

- Node.js 18+ and npm
- Google Gemini API key ([Get one here](https://makersuite.google.com/app/apikey))
- Docker & Docker Compose (optional, for containerized deployment)

## Local Development Setup

### 1. Clone and Install
```bash
# Clone repository
git clone <repository-url>
cd cloth-authenticator

# Install all dependencies
npm run install:all
```

### 2. Configure Environment
```bash
# Copy example environment file
cp .env.example .env

# Edit .env and add your Gemini API key
nano .env
```

Required environment variables (for local development, use .env or Secret Manager in production):
```bash
GOOGLE_CLOUD_GEMINI_API_KEY=your_gemini_pro_vision_api_key_here
GOOGLE_AI_STUDIO_FLASH_API_KEY=your_gemini_flash_api_key_here
SESSION_SECRET=your_random_secret_string
```

Optional client social links (useful for showing socials in the app):
```bash
# For the client (Vite) set these either in `client/.env` or in your CI
VITE_SOCIAL_TWITTER=https://x.com/youraccount
VITE_SOCIAL_INSTAGRAM=https://instagram.com/youraccount
VITE_SOCIAL_LINKEDIN=https://linkedin.com/in/yourprofile
```

If you also want the static policy pages (served from client/public) to show the same banner, edit or replace `client/public/socials.json` with your production links. Static HTML pages include `client/public/bottom-banner.js` which reads `socials.json` and injects a site-wide bottom banner.

### 3. Run Development Server
```bash
# Start both frontend and backend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend: http://localhost:8080

### 4. Run Tests
```bash
# Run backend tests
npm test
```

## Docker Deployment

### Using Docker Compose (Recommended)
```bash
# Build and start containers
docker-compose up --build

# Run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

The application will be available at http://localhost:4000

### Using Dockerfile Only
```bash
# Build image
docker build -t cloth-authenticator .

# Run container
docker run -p 8080:8080 \
  -e GOOGLE_CLOUD_GEMINI_API_KEY=your_key \
  -e GOOGLE_AI_STUDIO_FLASH_API_KEY=your_flash_key \
  -e SESSION_SECRET=your_secret \
  -v $(pwd)/uploads:/app/uploads \
  cloth-authenticator
```

## API Usage

### Upload and Analyze Images
```bash
curl -X POST http://localhost:8080/api/analyze \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg" \
  -F "images=@/path/to/image3.jpg"
```

Response:
```json
{
  "sessionId": "uuid-here",
  "analysis": {
    "authenticity": {
      "score": 85,
      "explanation": ["✓ Strong logo match detected: Nike"],
      "confidence": 90
    },
    "brand": {
      "name": "Nike",
      "confidence": 95
    },
    "condition": {
      "score": 4,
      "description": "Very Good",
      "tags": ["minimal wear", "clean"]
    },
    "era": {
      "classification": "Modern",
      "rationale": "Contemporary styling and materials"
    },
    "priceEstimate": {
      "inr": { "low": 1500, "median": 2000, "high": 2500 },
      "usd": { "low": 18, "median": 24, "high": 30 },
      "confidence": 85
    },
    // Suggested listing removed — field no longer returned
    "thumbnails": ["/uploads/thumb_xxx.jpg"],
    "warnings": ["This is an automated estimate..."]
  }
}
```

### Continue Chat
```bash
curl -X POST http://localhost:4000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "uuid-from-previous-response",
    "message": "What are signs this might be fake?"
  }'
```

Response:
```json
{
  "response": "Based on the analysis, here are key authenticity indicators..."
}
```

## Project Structure

See [FILES.md](FILES.md) for detailed file structure and purposes.
```
cloth-authenticator/
├── client/           # React frontend
│   ├── src/
│   │   ├── components/
│   │   ├── types/
│   │   └── ...
├── server/           # Express backend
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   └── utils/
│   ├── data/
│   └── tests/
├── uploads/          # Uploaded images (gitignored)
└── ...
```

## Production Deployment Checklist

Before deploying to production:

1. **Environment Variables**
   - [ ] Set strong `SESSION_SECRET` (32+ random characters)
   - [ ] Configure `ALLOWED_ORIGINS` with your domain
   - [ ] Set `NODE_ENV=production`
  - [ ] Verify `GOOGLE_CLOUD_GEMINI_API_KEY` and `GOOGLE_AI_STUDIO_FLASH_API_KEY` are set (or configure via Secret Manager)

2. **Security**
   - [ ] Enable HTTPS
   - [ ] Configure rate limiting
   - [ ] Set up CORS properly
   - [ ] Use secure session cookies
   - [ ] Implement file upload virus scanning

3. **Performance**
   - [ ] Set up CDN for static assets
  - [ ] (Optional) Configure Redis / Memorystore only if you prefer Redis-backed sessions for lower latency
   - [ ] Implement image optimization
   - [ ] Set up monitoring and logging
   - [ ] Configure automatic cleanup of old uploads

4. **Scaling**
  - [ ] Use Firestore for session storage (the app now saves sessions to Firestore by default)
   - [ ] Set up load balancer
   - [ ] Configure horizontal scaling
   - [ ] Implement caching strategy

5. **Backup**
   - [ ] Set up automated backups
   - [ ] Configure error tracking (Sentry, etc.)
   - [ ] Set up uptime monitoring

See [LIMITATIONS.md](LIMITATIONS.md) for known limitations and considerations.

### Deploying to Cloud Run (service name: retro-rate)

This repository includes a GitHub Actions workflow that builds and deploys a container to Google Cloud Run as the service `retro-rate`. For production use we rely on Secret Manager (no local .env) — make sure you have these secrets in Secret Manager in project `project-ea152037-584b-4621-acf`:

- `GOOGLE_CLOUD_GEMINI_API_KEY`
- `GOOGLE_AI_STUDIO_FLASH_API_KEY`
- `SESSION_SECRET`
- `GCS_BUCKET_NAME` (optional — recommended)
 - `GCS_BUCKET_NAME` (optional — recommended). Note: the GitHub workflow expects a Secret Manager secret named `GCS_BUCKET_NAME` in the project; configure that in Secret Manager.

Add the required GitHub secrets (GCP_SA_KEY, GCP_PROJECT_ID, GCP_REGION, GCS_BUCKET_NAME, GCS_MAKE_PUBLIC) then push to `main` to trigger the workflow.

## Legal & policies

Before going live you should review these project policies:

- [Privacy Policy](./PRIVACY.md) — explains what (and why) we collect, contact for privacy requests.
- [Terms of Service](./TERMS.md) — basic usage rules and liability information.
- [Security Policy](./SECURITY.md) — how to report security vulnerabilities.

## Troubleshooting

### "Gemini API key not configured"
- Ensure `GOOGLE_CLOUD_GEMINI_API_KEY` and `GOOGLE_AI_STUDIO_FLASH_API_KEY` are set in `.env` or configured via Secret Manager
- Restart the server after updating environment variables

### Images not uploading
- Check file size is under 8MB
- Verify file format is JPG, JPEG, or PNG
- Ensure `uploads/` directory exists and is writable

### Port already in use
- Change `PORT` in `.env` file
- Kill process using the port: `lsof -ti:8080 | xargs kill -9`

### Tests failing
- Ensure all dependencies are installed: `cd server && npm install`
- Check Node.js version is 18 or higher

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Run tests: `npm test`
6. Submit a pull request

## License

MIT License - See LICENSE file for details

## Disclaimer

⚠️ **Important**: This system provides automated estimates and is NOT a legal authenticity certificate. For high-value items, always consult a professional authenticator before making purchase decisions.

## Support

For issues, questions, or feature requests, please open an issue on GitHub.

For privacy or security inquiries, or if you need data removed, contact: abc@gmail.com