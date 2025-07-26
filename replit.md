# Sara's Quickie Delivery Website

## Overview

This is a modern static website for Sara's Quickie Delivery, a local delivery service in Oskaloosa. The website features company information, service details, customer testimonials, and a Supabase-integrated delivery request form. Built with a modern TypeScript stack, it provides a professional online presence for the delivery business.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with CSS variables for theming
- **UI Components**: shadcn/ui component library built on Radix UI primitives

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Style**: RESTful API endpoints
- **Data Storage**: In-memory storage with interface for future database integration
- **Build Process**: esbuild for production bundling

### Database Layer
- **ORM**: Drizzle ORM configured for PostgreSQL with Supabase
- **Schema Management**: Shared schema definitions between client and server
- **Migration System**: Automatic table creation with SQL migrations
- **Smart Storage**: Automatic fallback from database to memory storage when connection fails
- **Current Implementation**: Fully operational Supabase PostgreSQL connection with successful data persistence
- **Status**: Database connection verified and form submissions working correctly (July 26, 2025)

## Key Components

### Shared Schema (`shared/schema.ts`)
- Defines database tables for users and delivery requests
- Uses Drizzle ORM with PostgreSQL dialect
- Includes Zod validation schemas for type-safe API communication
- Provides TypeScript types for all data models

### Storage Layer (`server/storage.ts`)
- Abstract storage interface (`IStorage`) for flexibility
- In-memory implementation (`MemStorage`) for development
- Ready for database implementation without code changes
- Handles delivery request creation and retrieval

### API Routes (`server/routes.ts`)
- `POST /api/delivery-requests` - Create new delivery request
- `GET /api/delivery-requests` - Retrieve all requests (admin)
- Comprehensive error handling with Zod validation
- Type-safe request/response handling

### Frontend Components
- Form-based delivery request submission with validation
- Responsive design with mobile-first approach
- Toast notifications for user feedback
- Comprehensive UI component library

## Data Flow

1. **Request Submission**: User fills form → Client validation → API call → Server validation → Storage
2. **Data Retrieval**: Admin request → API endpoint → Storage query → JSON response
3. **Error Handling**: Zod validation errors → Structured error responses → User-friendly messages

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React, React DOM, React Hook Form
- **UI Framework**: Radix UI primitives, Lucide icons
- **Validation**: Zod for schema validation
- **HTTP Client**: Built-in fetch with TanStack Query wrapper

### Development Tools
- **Database**: Neon serverless PostgreSQL adapter (configured but not active)
- **Build Tools**: Vite, esbuild, TypeScript compiler
- **Styling**: Tailwind CSS, PostCSS, Autoprefixer

### Production Dependencies
- **Session Management**: connect-pg-simple for PostgreSQL sessions
- **Date Handling**: date-fns for date utilities
- **Utility Libraries**: clsx, class-variance-authority for styling

## Deployment Strategy

### Development
- Vite dev server for frontend with HMR
- tsx for running TypeScript server directly
- Memory storage for rapid prototyping
- Integrated error overlay for debugging

### Production Build
- Vite builds optimized client bundle to `dist/public`
- esbuild bundles server code to `dist/index.js`
- Static file serving for production
- Environment-based configuration

### Database Migration Path
- Drizzle configuration ready for PostgreSQL
- Schema definitions prepared for migration
- Storage interface allows seamless transition from memory to database
- Environment variable configuration for database URL

### Key Architectural Decisions

1. **Monorepo Structure**: Keeps client, server, and shared code in one repository for easier development and deployment
2. **Shared Schema**: Single source of truth for data models reduces inconsistencies
3. **Storage Abstraction**: Interface-based storage allows switching from memory to database without code changes
4. **Type Safety**: End-to-end TypeScript with Zod validation ensures runtime type safety
5. **Component Library**: shadcn/ui provides consistent, accessible UI components
6. **Build Optimization**: Separate optimization strategies for client (Vite) and server (esbuild)