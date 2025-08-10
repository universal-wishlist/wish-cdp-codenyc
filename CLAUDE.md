# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

This is a Turbo monorepo containing a Web3 wishlist application with three main apps:

### Apps Structure
- **`apps/fastapi/`**: Python FastAPI backend for API services
- **`apps/plasmo/`**: Browser extension built with Plasmo framework  
- **`apps/nextjs/`**: Next.js web application (minimal setup)

### Key Technologies
- **Blockchain Integration**: Coinbase Developer Platform (CDP) for wallet functionality and payments
- **Authentication**: Supabase for user management
- **Browser Extension**: Plasmo framework for Chrome extension development
- **Backend**: FastAPI with Celery for async task processing
- **Database**: Supabase (PostgreSQL)
- **Rate Limiting**: SlowAPI with Redis
- **Payment Processing**: x402 middleware for micropayments

## Development Commands

### Root Level (Turbo)
```bash
yarn dev          # Start all apps in development mode
yarn build        # Build all apps  
yarn lint         # Lint all apps
yarn test         # Run tests across all apps
yarn start        # Start all production builds
```

### FastAPI Backend (`apps/fastapi/`)
```bash
cd apps/fastapi
uv run pytest                    # Run tests
uv run ruff check .              # Lint code
uv run ruff format .             # Format code
uv run uvicorn app.main:app --reload --port 8000 --host 0.0.0.0 --loop asyncio  # Dev server
uv run celery -A app.celery worker --loglevel=info  # Start Celery worker
```

### Plasmo Extension (`apps/plasmo/`)
```bash
cd apps/plasmo
npm run dev       # Development with hot reload
npm run build     # Production build
npm run package   # Package for distribution
```

### Next.js App (`apps/nextjs/`)
```bash
cd apps/nextjs
npm run dev       # Development server
npm run build     # Production build
npm run start     # Start production server
npm run lint      # ESLint
```

## Architecture Details

### FastAPI Backend
- **Entry Point**: `apps/fastapi/app/main.py`
- **Configuration**: `apps/fastapi/app/core/config.py` (Pydantic settings)
- **Routing**: RESTful API with `/api/v1/core` root path
- **Authentication**: Extension ID-based auth via `app.services.auth`
- **Payment Middleware**: x402 micropayments integration ($0.001 per query)
- **Rate Limiting**: 10 requests/minute on protected endpoints
- **Background Processing**: Celery with Redis for async wishlist item processing

### Plasmo Browser Extension
- **Popup**: `apps/plasmo/src/popup/index.tsx` - Main extension UI
- **Background Script**: `apps/plasmo/src/background/index.ts` - Opens options on icon click
- **Context**: `apps/plasmo/src/contexts/wallet-context.tsx` - CDP wallet integration
- **Components**: UI components in `src/components/` with shadcn/ui
- **Messaging**: Plasmo messaging system for content script communication

### Environment Variables
Required environment variables (see `apps/fastapi/app/core/config.py`):
- **CDP Integration**: `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`  
- **Supabase**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- **AI Services**: `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_ENDPOINT`, `MODEL`
- **External APIs**: `APIFY_API_TOKEN`, `GOOGLE_API_KEY`, `GOOGLE_CUSTOM_SEARCH_ENGINE_ID`
- **Security**: `ALLOWED_EXTENSION_ID`, `WISH_WALLET`
- **Infrastructure**: `REDIS_URL`, `PORT`

### Key Patterns
- **Monorepo Structure**: Turbo for coordinated builds and development
- **Type Safety**: TypeScript throughout frontend, Pydantic for backend validation
- **Async Processing**: Celery tasks for heavy operations (HTML processing, data enrichment)
- **Wallet Integration**: CDP hooks for blockchain wallet functionality
- **Component Architecture**: React with context providers for state management
- **API Design**: RESTful endpoints with proper HTTP status codes and error handling

### Testing Strategy
- **FastAPI**: pytest for backend testing
- **Python Linting**: ruff for code quality and formatting
- **TypeScript**: ESLint for frontend code quality
- **Build Validation**: Turbo orchestrates cross-app build dependencies