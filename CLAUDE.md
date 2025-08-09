# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a monorepo containing a Wish Chrome Extension with AI-powered wishlist features that integrates with Coinbase Developer Platform (CDP) for blockchain functionality. The project consists of two main applications:

- **Plasmo Chrome Extension** (`apps/plasmo/`) - Browser extension for wishlist management with CDP integration
- **FastAPI Backend** (`apps/fastapi/`) - Python API service for AI processing and data management

## Development Commands

### Root Level Commands (using Turbo)
```bash
yarn dev          # Start development servers for all apps
yarn build        # Build all applications
yarn lint         # Run linting across all apps
yarn test         # Run tests across all apps
yarn format      # Format code with Prettier
```

### Chrome Extension (apps/plasmo/)
```bash
cd apps/plasmo
yarn dev         # Start Plasmo development server
yarn build       # Build extension for production
yarn package     # Package extension for distribution
```

### FastAPI Backend (apps/fastapi/)
```bash
cd apps/fastapi
yarn dev         # Start FastAPI with Celery worker and hot reload
yarn start       # Start production FastAPI with Celery
yarn test        # Run pytest
yarn lint        # Run ruff linter
yarn format      # Format with ruff
```

## Architecture Overview

### Chrome Extension Architecture
- **Extension Entry Points**: 
  - `src/popup/index.tsx` - Main popup interface
  - `src/background/index.ts` - Background script for Chrome API interactions
  - `src/app/` - Next.js pages for options/settings
- **Key Components**:
  - `src/components/main.tsx` - Main popup component handling auth state
  - `src/components/login-form.tsx` - Authentication interface
  - `src/components/wishlist.tsx` - Wishlist management interface
- **Context & State**: 
  - `src/contexts/cdp-context.tsx` - CDP (Coinbase Developer Platform) provider setup
  - Uses Plasmo storage for local data persistence
  - Supabase integration for user authentication
- **Background Processing**: 
  - `src/background/messages/` - Contains message handlers for HTML extraction, session management, and page data processing

### FastAPI Backend Architecture
- **Main Application**: `app/main.py` - FastAPI app with CORS, rate limiting, and health checks
- **Celery Integration**: `app/celery.py` - Background task processing for item classification and enrichment
- **Core Services**:
  - `app/services/ai.py` - AI/LLM integration for item processing and classification
  - `app/services/auth.py` - Authentication service integration
  - `app/services/database.py` - Database operations with Supabase
  - `app/services/enrichment.py` - Item data enrichment functionality
- **API Endpoints**: `app/routers/wishlist.py` - Wishlist management endpoints with rate limiting
- **Task Processing**: Async Celery tasks for HTML processing, AI classification, and data enrichment

### Key Integrations
- **Coinbase CDP**: Used for blockchain/crypto functionality via `@coinbase/cdp-react` and related packages
- **Supabase**: Backend-as-a-service for database and authentication
- **AI/LLM**: Integration with language models for item classification and processing
- **Celery + Redis**: Background task processing for heavy operations

## Technology Stack

### Frontend (Chrome Extension)
- **Framework**: Plasmo (Chrome extension framework based on Next.js)
- **UI**: React 18 with TypeScript
- **Styling**: Tailwind CSS with Radix UI components
- **State Management**: Plasmo storage + React hooks
- **Build Tool**: Plasmo CLI with TypeScript and ESLint

### Backend (FastAPI)
- **Framework**: FastAPI with uvicorn
- **Task Queue**: Celery with Redis backend
- **Dependencies**: Managed with uv (Python package manager)
- **Key Libraries**: LangChain, OpenAI, Playwright, BeautifulSoup4, Supabase client
- **Development**: Hot reload with uvicorn, pytest for testing, ruff for linting/formatting

## Important Development Notes

### Environment Variables
Key environment variables (defined in turbo.json globalEnv):
- `PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk authentication
- `CLERK_SECRET_KEY` - Clerk backend key
- `PLASMO_PUBLIC_DEV_PORT` - Development port for Plasmo
- `PLASMO_PUBLIC_CDP_PROJECT_ID` - CDP project configuration

### Chrome Extension Permissions
The extension requires:
- `identity` - For user authentication
- `scripting` - For content script injection
- `tabs` - For tab management
- `https://*/*` - Host permissions for all HTTPS sites

### Background Task Processing
The FastAPI backend uses Celery for processing:
- Item classification using AI models
- HTML cleaning and data extraction
- Item enrichment with additional data
- All tasks have retry logic with exponential backoff

### Testing
- FastAPI: Use `pytest` in the fastapi directory
- Chrome Extension: Testing setup follows Plasmo conventions
- Both apps support individual testing via turbo tasks

### Type Checking
- Chrome Extension: TypeScript with strict settings, Next.js plugin integration
- FastAPI: Python type hints with Pydantic models for API schemas