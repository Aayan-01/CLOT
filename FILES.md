# Project Files Documentation

Complete breakdown of every file and folder in the Cloth Authenticator project.

## Root Level

### Configuration Files

- **`.gitignore`** - Specifies files/folders to exclude from Git (node_modules, uploads, .env, etc.)
- **`.env.example`** - Template for environment variables. Copy to `.env` and fill in values
  - **UPDATED**: Now includes two separate API keys for dual model architecture:
    - `GOOGLE_CLOUD_GEMINI_API_KEY` - For Gemini 2.5 Pro Vision (image authentication)
    - `GOOGLE_AI_STUDIO_FLASH_API_KEY` - For Gemini 2.5 Flash (chat continuation)
- **`package.json`** - Root package file with scripts for running dev/build across client and server
- **`tsconfig.json`** - TypeScript configuration for root level
- **`docker-compose.yml`** - Docker Compose configuration for containerized deployment
- **`Dockerfile`** - Multi-stage Docker build configuration

### Documentation

- **`README.md`** - Main project documentation with setup and usage instructions
- **`FILES.md`** - This file - detailed breakdown of every file and folder
- **`LIMITATIONS.md`** - Known limitations, disclaimers, and considerations

## `/client` - Frontend Application

### Configuration

- **`package.json`** - Frontend dependencies (React, Vite, Tailwind, TypeScript)
- **`tsconfig.json`** - TypeScript configuration for frontend
- **`vite.config.ts`** - Vite build tool configuration with proxy setup for API calls
- **`index.html`** - HTML entry point for React app
- **`postcss.config.js`** - PostCSS configuration for Tailwind CSS (auto-generated)
- **`tailwind.config.js`** - Tailwind CSS customization (auto-generated)

### Source Files (`/client/src`)

#### Root Files
- **`main.tsx`** - React application entry point, renders App component
- **`App.tsx`** - Main application component, manages routing between Upload and Results pages
- **`index.css`** - Global styles with Tailwind directives
- **`vite-env.d.ts`** - TypeScript declarations for Vite

#### Components (`/client/src/components`)
- **`UploadPage.tsx`** - Image upload interface with drag-and-drop, file validation, and submission
- **`ResultsPage.tsx`** - Displays comprehensive analysis results with enhanced UI
  - **UPDATED**: Major UI overhaul with new sections:
    - Brand Identification & Authentication with verdict badges (AUTHENTIC/LIKELY AUTHENTIC/QUESTIONABLE/COUNTERFEIT)
    - Verdict badges and authenticity visuals are colour coded in the UI:
      - AUTHENTIC → green (positive)
      - LIKELY AUTHENTIC → green (confirmatory)
      - QUESTIONABLE → amber / warning
      - COUNTERFEIT → red (negative)
    - Authenticity markers and red flags display
    - Dual pricing structure (original retail price + current market value)
    - Rarity classification with color-coded badges (Common/Uncommon/Rare/Epic/Legendary/Mythic)
    - Era & Dating with decade information
    - Condition assessment with scoring
    - Detailed Features panel (material, color, pattern, size, care instructions, country of manufacture)
    - Additional Observations (investment potential, resale platforms, cultural significance)
    - Missing tag warning (conditional display when AI detects incomplete photos)
    - Suggested listing information (REMOVED — no longer returned by the backend)
- **`ChatBox.tsx`** - Chat interface for follow-up questions about analyzed items
  - Now uses Gemini Flash API for efficient conversation continuation
- **`LoadingSpinner.tsx`** - Reusable loading animation component

#### Types (`/client/src/types`)
- **`index.ts`** - TypeScript interfaces for AnalysisResult, ChatMessage, and other shared types
  - **UPDATED**: Enhanced with new fields:
    - `verdict` - Authentication verdict string
    - `rarity` - Enum for rarity classification
    - `retail_price` - Original retail pricing structure
    - `current_market_price` - Current market value (low/median/high)
    - `detailedFeatures` - Structured object for material, color, size, etc.
    - `additionalObservations` - Object for investment, resale platforms, cultural significance
    - `needs_more_images` - Boolean flag for missing tag detection
    - `decade` - Optional decade string in era data

## `/server` - Backend Application

### Configuration

- **`package.json`** - Backend dependencies (Express, Multer, Sharp, Axios, etc.)
- **`tsconfig.json`** - TypeScript configuration for backend
- **`jest.config.js`** - Jest testing framework configuration

### Source Files (`/server/src`)

#### Root
- **`index.ts`** - Express server setup, middleware configuration, route mounting

#### Routes (`/server/src/routes`)
- **`upload.ts`** - POST /api/analyze endpoint - handles image upload and analysis
  - **UPDATED**: Enhanced parsing logic for new Master Prompt response structure
    - Extracts rarity classification from AI response
    - Parses detailed features (material, color, pattern, size, care instructions)
    - Extracts additional observations (investment, resale platforms, cultural significance)
    - Detects era/decade information
    - Identifies missing tag scenarios and sets `needs_more_images` flag
    - Parses dual pricing structure (retail + current market)
    - Handles authentication verdict extraction
- **`chat.ts`** - POST /api/chat endpoint - handles follow-up questions with session context
  - **UPDATED**: Now uses Gemini Flash API (Google AI Studio) for cost-efficient chat
    - Updated context building to include verdict and rarity
    - Includes retail price and current market value in context
    - Uses `askGemini()` function which connects to Flash API

#### Services (`/server/src/services`)
- **`gemini.ts`** - Dual-model adapter for Google Gemini APIs
  - **MAJOR UPDATE**: Complete refactor for hybrid AI model architecture
    - **Image Client (Pro Vision)**: Uses Google Cloud API key for image authentication
      - `analyzeImages()` - Sends images to Gemini 2.5 Pro Vision with Master Authentication Prompt
      - `computeAuthenticityWithAI()` - Comprehensive authenticity analysis with verdict system
      - `estimatePriceWithAI()` - Dual pricing estimation (retail + current market)
    - **Chat Client (Flash)**: Uses Google AI Studio API key for conversation
      - `askGemini()` - Sends text prompts to Gemini 2.5 Flash for efficient chat responses
    - **Master Authentication Prompt**: Integrated comprehensive 6-section prompt:
      1. Brand Identification & Authentication (with AUTHENTIC/QUESTIONABLE/COUNTERFEIT verdict)
      2. Pricing Estimation (retail + current market value)
      3. Era & Dating (production decade, collection, vintage characteristics)
      4. Detailed Features (material, color, condition, size, care, country of manufacture)
      5. Rarity Classification (Common → Mythic scale)
      6. Additional Observations (cultural significance, styling, investment, resale platforms)
    - **Robust JSON Parsing**: Enhanced error handling with truncation detection and retry logic
    - **Helper Functions**: `extractLabels()`, `extractOCR()`, `extractLogos()`
- **`authenticator.ts`** - Computes authenticity score based on vision analysis
  - Logo matching against brand database
  - OCR text analysis for authentic tags
  - Visual feature analysis
  - Red flag detection
  - **NOTE**: Primary authentication now handled by `computeAuthenticityWithAI()` in gemini.ts
- **`priceEstimator.ts`** - Deterministic price estimation
  - Brand multiplier application
  - Condition-based pricing
  - Vintage/modern adjustments
  - Authenticity score impact
  - **NOTE**: Primary pricing now handled by `estimatePriceWithAI()` in gemini.ts

#### Middleware (`/server/src/middleware`)
- **`upload.ts`** - Multer configuration for handling multipart/form-data uploads
  - File type validation (JPG, PNG only)
  - Size limits (8MB default)
  - Storage configuration

#### Utilities (`/server/src/utils`)
- **`imageProcessor.ts`** - Sharp-based image processing
  - Thumbnail generation
  - Image optimization
  - Cleanup utilities
- **`sessionStore.ts`** - In-memory session management
  - Session CRUD operations
  - Automatic expiry and cleanup

#### Types (`/server/src/types`)
- **`index.ts`** - TypeScript interfaces for backend data structures
  - **UPDATED**: Enhanced with comprehensive new fields:
    - `AuthenticityResult.verdict` - String for authentication verdict
    - `EraResult.decade` - Optional decade string
    - `PriceEstimate.retail_price` - Original retail pricing structure
    - `PriceEstimate.current_market_price` - Current market value structure
    - `DetailedFeatures` - New interface for material, color, pattern, size, care, country
    - `AdditionalObservations` - New interface for cultural significance, styling, investment, resale platforms
    - `AnalysisResult.rarity` - Enum for rarity classification
    - `AnalysisResult.detailedFeatures` - Optional detailed features object
    - `AnalysisResult.additionalObservations` - Optional observations object
    - `AnalysisResult.needs_more_images` - Boolean flag for missing tags

### Data (`/server/data`)
- **`brands.json`** - Brand database with 6 sample brands
  - Brand name, keywords, logo patterns, price multipliers

### Tests (`/server/tests`)
- **`priceEstimator.test.ts`** - Unit tests for price estimation logic
  - Brand multiplier tests
  - Condition impact tests
  - Vintage vs modern tests
  - Authenticity score impact tests
- **`authenticator.test.ts`** - Unit tests for authenticity scoring
  - Logo detection tests
  - Red flag detection tests
  - Quality indicator tests

## `/uploads` - Upload Storage

- **`.gitkeep`** - Keeps empty directory in Git
- **Image files** - User-uploaded images and generated thumbnails (gitignored)

## Scripts and Commands

### Root Level
```bash
npm run install:all  # Install all dependencies
npm run dev          # Run both frontend and backend in development
npm run build        # Build both frontend and backend for production
npm test             # Run backend tests
npm start            # Start production server
```

### Client
```bash
cd client
npm run dev          # Start Vite dev server (port 5173)
npm run build        # Build for production
npm run preview      # Preview production build
npm test             # Frontend smoke test
```

### Server
```bash
cd server
npm run dev          # Start with ts-node-dev (auto-reload)
npm run build        # Compile TypeScript to JavaScript
npm start            # Run compiled JavaScript
npm test             # Run Jest tests with coverage
```

## Build Outputs (Gitignored)

- **`/client/dist`** - Compiled frontend assets (HTML, JS, CSS)
- **`/server/dist`** - Compiled backend JavaScript
- **`/node_modules`** - Dependencies (root, client, server)
- **`/coverage`** - Test coverage reports

## Environment-Specific Files

### Development
- `.env` - Local environment variables (gitignored)
  - **UPDATED**: Now requires two API keys for dual model architecture
- Source files with TypeScript

### Production
- Compiled JavaScript in `/dist` folders
- Static assets served from `/server/public` (copied from `/client/dist`)
- Environment variables from hosting platform

## File Relationships

1. **Upload Flow**: UploadPage.tsx → upload.ts → upload middleware → gemini.ts (Pro Vision) + authenticator.ts + priceEstimator.ts
   - **UPDATED**: Now uses Gemini 2.5 Pro Vision with Master Prompt for comprehensive analysis
   - Parses response for rarity, detailed features, additional observations
2. **Results Flow**: ResultsPage.tsx displays enhanced data from upload.ts response
   - **UPDATED**: Now displays 8+ new sections with modern panel-based UI
3. **Chat Flow**: ChatBox.tsx → chat.ts → gemini.ts (Flash with AI Studio key)
   - **UPDATED**: Uses Gemini 2.5 Flash for cost-efficient conversation continuation
4. **Session Flow**: upload.ts creates session → sessionStore.ts manages → chat.ts retrieves

## Key Integration Points

- **Frontend-Backend**: Vite proxy at `/api` forwards to Express server
**Image Storage**: Multer uses in-memory buffers (Cloud Run compatible). Files are written to `/tmp` for processing, thumbnails are created locally, and both originals & thumbnails are uploaded to Google Cloud Storage (GCS) in `uploads/originals` and `uploads/thumbnails`.
- **AI Integration**: gemini.ts wraps dual Gemini API calls with error handling
  - **NEW**: Pro Vision (Google Cloud) for image authentication
  - **UPDATED**: Extended with comprehensive new fields for enhanced features

## Recent Major Updates

### Dual Model Architecture
The application now uses a hybrid AI approach:
- **Gemini 2.5 Pro Vision** (Google Cloud API) for high-accuracy image authentication
- **Gemini 2.5 Flash** (Google AI Studio API) for fast, cost-efficient chat responses

### Master Authentication Prompt
A comprehensive 6-section prompt system that provides:
- Detailed brand identification with authentication verdict
- Dual pricing (original retail + current market value)
- Era dating with decade extraction
- Detailed feature analysis (material, color, size, care)
- Rarity classification system (6 tiers)
- Additional observations (investment, styling, comparables)

### Enhanced Response Structure
The analysis result now includes:
- Authentication verdict system (4 levels)
- Rarity classification (6 tiers with color coding)
- Retail price vs current market price
- Detailed features object
- Additional observations object
- Missing tag detection flag

### UI Enhancements
ResultsPage.tsx features:
- Modern panel-based layout with icons
- Color-coded rarity badges
- Verdict badges for authentication status
- Dual pricing display
- Expandable detailed features section
- Investment and styling insights
- Conditional missing tag warning
- Enhanced visual hierarchy