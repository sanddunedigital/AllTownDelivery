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
- **Multi-Tenant Support**: Tenant-aware schema with automatic tenant isolation and support for SaaS expansion
- **Schema Management**: Shared schema definitions between client and server with tenant context
- **Migration System**: Automatic table creation with SQL migrations and tenant setup
- **Smart Storage**: Automatic fallback from database to memory storage when connection fails
- **Current Implementation**: Fully operational Supabase PostgreSQL connection with user profiles and loyalty tracking
- **Status**: Database connection verified, user authentication working, loyalty program active (July 29, 2025)
- **Authentication Flow**: Role-based redirects - drivers go to /driver portal, customers to home page
- **Tenant Architecture**: All data belongs to Sara's Quickie tenant by default, ready for multi-tenant SaaS without breaking changes

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
- `GET /api/tenant` - Get current tenant information and branding
- `POST /api/delivery-requests` - Create new delivery request
- `GET /api/delivery-requests` - Retrieve all requests (admin)
- Comprehensive error handling with Zod validation
- Type-safe request/response handling
- Tenant-aware routing with automatic context resolution

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

### Recent Changes (August 1, 2025)

- **Multi-Tenant Architecture Foundation**: Implemented tenant-ready database structure and middleware for future SaaS expansion
- **Tenant System**: Added tenants table with support for subdomains, custom domains, and company-specific branding
- **Database Migration**: All existing tables now include tenant_id with Sara's Quickie as default tenant (ID: 00000000-0000-0000-0000-000000000001)
- **Tenant Middleware**: Request-level tenant resolution with caching for performance and custom domain support
- **Flexible URL Mapping**: Architecture supports saras.yoursaas.com, sarasquickiedelivery.com, or yoursaas.com/saras patterns
- **RLS Ready**: Row Level Security policies prepared but disabled to maintain current functionality
- **Portal Navigation Enhancement**: Added dropdown navigation to driver, dispatch, and admin portals for seamless role switching
- **Business Image Management**: Added complete image upload functionality using Supabase Storage for business listings
- **Image Upload Component**: Created BusinessImageUpload component with drag-and-drop interface, file validation, and error handling
- **Database Schema Update**: Added imageUrl field to businesses table for storing Supabase Storage URLs
- **Admin Dashboard Integration**: Integrated image upload into both add and edit business forms with live preview
- **Storage Bucket Setup**: Created business-images bucket in Supabase Storage with proper public access configuration
- **Visual Enhancement**: Business listings now display images alongside business information with responsive design
- **Error Handling**: Automatic bucket creation if missing, with comprehensive upload error handling and user feedback
- **Business Settings Integration**: Connected business settings to control actual delivery pricing, loyalty program behavior, and customer experience
- **Live Pricing Display**: Delivery form now shows current fees and thresholds based on business settings configuration
- **Admin Interface Cleanup**: Removed business settings tab from admin dashboard - settings now only accessible via dropdown navigation
- **Navigation Standardization**: Added business settings access to dropdown navigation on all pages for consistent admin access

### Previous Changes (July 31, 2025)

- **Real-Time Customer Updates**: Implemented WebSocket subscriptions for customer deliveries on home page with live status updates
- **Cache Invalidation Fix**: Resolved bug where released deliveries appeared in both available and active sections
- **Enhanced Visual Feedback**: Added "Live Updates" indicator and animated status icons for real-time delivery tracking
- **Smart Delivery Release**: When drivers go off duty, claimed deliveries automatically return to available queue for other drivers
- **Real-Time Driver Toggle**: Fixed critical real-time update bug - driver duty toggle now works instantly with proper data conversion  
- **Mobile-First Driver Portal**: Redesigned for phone use - moved toggle to header, removed redundant sections, streamlined to 2 tabs
- **Data Conversion Fix**: Resolved snake_case/camelCase mismatch between database and frontend in real-time subscriptions
- **Enhanced Cache Management**: React Query profile data now reactive to real-time updates instead of static AuthContext
- **Driver Status Migration**: Changed driver status from string ("on-duty"/"off-duty") to boolean (isOnDuty) for better type safety
- **WebSocket Foundation**: Established real-time subscription architecture with proper error handling and reconnection
- **Form Improvements**: Default pickup date now set to today; removed delivery type field from form and database
- **UI Optimization**: Active deliveries section on home page only appears when customer has active deliveries  
- **Loyalty Bug Fix**: Fixed crucial bug where free deliveries were incrementing loyalty points instead of preserving current progress
- **Credit-Based System**: After 10 paid deliveries, users earn 1 free delivery credit that auto-applies to next order
- **Visual Indicators**: Added colored borders and "FREE DELIVERY" badges for clear identification of free deliveries
- **Smart Point Tracking**: Loyalty points increment with paid deliveries only; reset to 0 when earning free credit or using free delivery
- **Enhanced UI**: Free deliveries show green borders for customers, yellow borders for drivers across all delivery cards
- **Database Schema**: Updated to properly handle boolean driver status with TypeScript validation
- **Admin Dashboard**: Comprehensive business analytics page with weekly/monthly delivery metrics, revenue tracking, order type analysis
- **Role Management**: Admin functionality to assign user roles by email address with complete user management interface
- **Business Management**: Full CRUD operations for partner businesses - add, edit, activate/deactivate with form validation and smooth UX
- **Hierarchical Navigation**: Role-based navigation where admins see all pages, dispatchers see dispatch + driver, drivers see driver only
- **Professional Headers**: Consistent navigation headers across all role-based pages (driver, dispatch, admin) matching design standards

### Key Architectural Decisions

1. **Monorepo Structure**: Keeps client, server, and shared code in one repository for easier development and deployment
2. **Shared Schema**: Single source of truth for data models reduces inconsistencies
3. **Storage Abstraction**: Interface-based storage allows switching from memory to database without code changes
4. **Type Safety**: End-to-end TypeScript with Zod validation ensures runtime type safety
5. **Component Library**: shadcn/ui provides consistent, accessible UI components
6. **Build Optimization**: Separate optimization strategies for client (Vite) and server (esbuild)
7. **Role-Based Flow**: Smart authentication redirects based on user role for optimal experience
8. **Multi-Tenant Ready**: Tenant-aware architecture prepared for SaaS expansion without breaking existing functionality
9. **Flexible URL Strategy**: Support for subdomains, custom domains, and path-based tenant routing
10. **Performance-Focused**: Tenant caching and efficient database queries with prepared RLS policies