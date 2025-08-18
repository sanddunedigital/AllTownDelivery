# Sara's Quickie Delivery Website

## Overview
This project is a multi-tenant SaaS delivery management platform designed for small delivery services across various markets. AllTownDelivery.com serves as the primary marketing site where delivery businesses can sign up, and customers can find local services. Each registered tenant receives a custom subdomain (e.g., saras.alltowndelivery.com) with personalized branding, business settings, and customer base. The platform offers features such as real-time delivery tracking, dispatch management, driver portals, customer loyalty programs, and analytics. It utilizes conditional rendering to serve either the marketing site or tenant-specific sites from a single codebase, aiming to be a comprehensive solution for local delivery businesses.

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
- **Data Storage**: In-memory storage with an abstract interface for flexibility.
- **Build Process**: esbuild for production bundling.
- **Key Architectural Decisions**:
    - **Monorepo Structure**: Client, server, and shared code within a single repository.
    - **Shared Schema**: Single source of truth for data models using Drizzle ORM and Zod for type safety.
    - **Storage Abstraction**: Interface-based storage for flexibility.
    - **Type Safety**: End-to-end TypeScript with Zod validation.
    - **Build Optimization**: Separate optimization for client (Vite) and server (esbuild).
    - **Role-Based Flow**: Smart authentication redirects based on user roles.
    - **Multi-Tenant Ready**: Tenant-aware architecture supporting subdomains, custom domains, and path-based routing.
    - **Performance-Focused**: Tenant caching and efficient database queries.

### Database Layer
- **ORM**: Drizzle ORM configured for PostgreSQL with Supabase.
- **Multi-Tenant Support**: Tenant-aware schema with automatic tenant isolation, defaulting data to Sara's Quickie tenant.
- **Schema Management**: Shared schema definitions between client and server with tenant context, core tables: tenants, user_profiles, delivery_requests, business_settings, customer_loyalty_accounts, business_staff, customer_profiles.
- **Migration System**: Automatic table creation with SQL migrations and tenant setup.
- **Smart Storage**: Automatic fallback from database to memory storage when connection fails.
- **Authentication Flow**: Role-based redirects (drivers to /driver portal, customers to home page).
- **Loyalty Program**: Multi-tenant credit-based system where customers earn separate loyalty points with each delivery service through dedicated customer_loyalty_accounts table.
- **Security**: Row Level Security (RLS) policies on all sensitive tables (tenants, user_profiles, customer_loyalty_accounts, delivery_requests) with hybrid approach allowing cross-tenant service discovery via business_settings.
- **Recent Cleanup**: Successfully removed deprecated tables (google_reviews, pending_signups, users) and all associated code references for streamlined architecture. Fixed recurring users table creation in migrate.ts to prevent automatic recreation on startup.
- **Architecture Upgrade**: Implemented Option 1 architecture separating business staff from customers: business_staff table for tenant employees with invite system, customer_profiles for delivery customers, simplified user_profiles as base table. Ready for Supabase Auth + invite-based business onboarding.
- **Data Migration Complete (2025-08-18)**: Migrated existing user data to new table structure. Admin user moved to business_staff table, deprecated columns (role, is_on_duty, address fields) removed from user_profiles. RLS policies updated to use business_staff table for role checking. Schema is now clean and role-based authorization works properly.

## External Dependencies

- **Database**: Supabase (PostgreSQL for data, Supabase Storage for file uploads).
- **Frontend Core**: React, React DOM, React Hook Form.
- **UI Libraries**: Radix UI primitives, Lucide icons.
- **Validation**: Zod.
- **HTTP Client**: Built-in fetch with TanStack Query wrapper.
- **Development Tools**: Vite, esbuild, TypeScript compiler, tsx.
- **Styling**: Tailwind CSS, PostCSS, Autoprefixer.
- **Session Management**: connect-pg-simple (for PostgreSQL sessions).
- **Date Utilities**: date-fns.
- **Utility Libraries**: clsx, class-variance-authority.