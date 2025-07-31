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
- **Current Implementation**: Fully operational Supabase PostgreSQL connection with user profiles and loyalty tracking
- **Status**: Database connection verified, user authentication working, loyalty program active (July 29, 2025)
- **Authentication Flow**: Role-based redirects - drivers go to /driver portal, customers to home page

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

### Recent Changes (July 31, 2025)

- **Real-Time Updates**: Implemented Supabase real-time subscriptions for instant UI updates without polling
- **Driver Status Migration**: Changed driver status from string ("on-duty"/"off-duty") to boolean (isOnDuty) for better type safety
- **Enhanced Driver Portal**: Real-time driver duty toggle with immediate UI feedback and cache invalidation
- **WebSocket Foundation**: Established real-time subscription architecture for future push notification integration
- **Debug Logging**: Added comprehensive real-time connection status tracking for troubleshooting
- **Cache Optimization**: Improved query invalidation to trigger immediate UI re-renders on status changes
- **Form Improvements**: Default pickup date now set to today; removed delivery type field from form and database
- **UI Optimization**: Active deliveries section on home page only appears when customer has active deliveries  
- **Loyalty Bug Fix**: Fixed critical bug where free deliveries were incrementing loyalty points instead of preserving current progress
- **Credit-Based System**: After 10 paid deliveries, users earn 1 free delivery credit that auto-applies to next order
- **Visual Indicators**: Added colored borders and "FREE DELIVERY" badges for clear identification of free deliveries
- **Smart Point Tracking**: Loyalty points increment with paid deliveries only; reset to 0 when earning free credit or using free delivery
- **Enhanced UI**: Free deliveries show green borders for customers, yellow borders for drivers across all delivery cards
- **Database Schema**: Updated to properly handle boolean driver status with TypeScript validation
- **Profile Persistence**: Delivery form now retains user profile information after successful submission

### Key Architectural Decisions

1. **Monorepo Structure**: Keeps client, server, and shared code in one repository for easier development and deployment
2. **Shared Schema**: Single source of truth for data models reduces inconsistencies
3. **Storage Abstraction**: Interface-based storage allows switching from memory to database without code changes
4. **Type Safety**: End-to-end TypeScript with Zod validation ensures runtime type safety
5. **Component Library**: shadcn/ui provides consistent, accessible UI components
6. **Build Optimization**: Separate optimization strategies for client (Vite) and server (esbuild)
7. **Role-Based Flow**: Smart authentication redirects based on user role for optimal experience