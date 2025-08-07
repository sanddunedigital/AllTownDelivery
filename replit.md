# Sara's Quickie Delivery Website

## Overview
This project is a modern static website for Sara's Quickie Delivery, a local delivery service. Its purpose is to provide a professional online presence, featuring company information, service details, customer testimonials, and a Supabase-integrated delivery request form. The website aims to streamline delivery requests and enhance customer engagement. The system is designed with a multi-tenant architecture, ready for SaaS expansion, and includes robust features like real-time delivery tracking, loyalty programs, and comprehensive admin analytics.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query (React Query) for server state management
- **Build Tool**: Vite for fast development and optimized builds
- **Styling**: Tailwind CSS with CSS variables for theming
- **UI Components**: shadcn/ui component library built on Radix UI primitives, ensuring consistent and accessible UI.
- **UI/UX Decisions**: Responsive design with a mobile-first approach, toast notifications for user feedback, and professional headers across all role-based pages.

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Style**: RESTful API endpoints
- **Data Storage**: In-memory storage with an abstract interface, allowing seamless transition to database integration.
- **Build Process**: esbuild for production bundling.
- **Key Architectural Decisions**:
    - **Monorepo Structure**: Client, server, and shared code in one repository.
    - **Shared Schema**: Single source of truth for data models using Drizzle ORM and Zod for type safety.
    - **Storage Abstraction**: Interface-based storage for flexibility.
    - **Type Safety**: End-to-end TypeScript with Zod validation.
    - **Build Optimization**: Separate optimization for client (Vite) and server (esbuild).
    - **Role-Based Flow**: Smart authentication redirects based on user roles.
    - **Multi-Tenant Ready**: Tenant-aware architecture with support for subdomains, custom domains, and path-based routing.
    - **Performance-Focused**: Tenant caching and efficient database queries.

### Database Layer
- **ORM**: Drizzle ORM configured for PostgreSQL with Supabase.
- **Multi-Tenant Support**: Tenant-aware schema with automatic tenant isolation, with all data belonging to Sara's Quickie tenant by default.
- **Schema Management**: Shared schema definitions between client and server with tenant context, including users, delivery requests, and business settings.
- **Migration System**: Automatic table creation with SQL migrations and tenant setup.
- **Smart Storage**: Automatic fallback from database to memory storage when connection fails.
- **Authentication Flow**: Role-based redirects (drivers to /driver portal, customers to home page).
- **Loyalty Program**: Credit-based system where users earn free delivery credits after a set number of paid deliveries.

## External Dependencies

- **Database**: Supabase (PostgreSQL for data, Supabase Storage for file uploads like logos and business images).
- **Frontend Core**: React, React DOM, React Hook Form.
- **UI Libraries**: Radix UI primitives, Lucide icons.
- **Validation**: Zod.
- **HTTP Client**: Built-in fetch with TanStack Query wrapper.
- **Development Tools**: Vite, esbuild, TypeScript compiler, tsx (for running TypeScript server).
- **Styling**: Tailwind CSS, PostCSS, Autoprefixer.
- **Session Management**: connect-pg-simple (for PostgreSQL sessions).
- **Date Utilities**: date-fns.
- **Utility Libraries**: clsx, class-variance-authority.