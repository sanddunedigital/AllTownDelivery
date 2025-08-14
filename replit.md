# Sara's Quickie Delivery Website

## Overview
This project is a multi-tenant SaaS delivery management platform that serves small delivery services across multiple markets. AllTownDelivery.com serves as the main marketing site where delivery services can sign up for accounts and customers can search for local services by area. Each tenant receives a custom subdomain (e.g., saras.alltowndelivery.com) with their own branding, business settings, and customer base. The platform includes advanced features like real-time delivery tracking, dispatch management, driver portals, customer loyalty programs, and comprehensive analytics. The system uses conditional rendering to serve either the marketing site (main domain) or tenant-specific delivery sites (subdomains) from a single codebase.

## Recent Changes
- **Database Connection Issues Resolved (January 2025)**: Fixed critical database schema mismatch and connection problems that were causing the system to fall back to memory storage. Recreated pendingSignups table with proper JSONB structure matching schema definition. Two-stage signup system now working perfectly with database persistence. All API endpoints successfully store and retrieve data from PostgreSQL database without fallback.
- **Two-Stage Signup Implementation (January 2025)**: Successfully implemented email-verification-first signup process to prevent subdomain conflicts from invalid emails. Added pendingSignups table, new API endpoints (`/api/tenants/signup-initiate` and `/api/tenants/signup-complete`), and proper email verification flow. System now stores pending signups temporarily, sends verification email, and creates tenant only after email confirmation. Development environment shows verification tokens for testing.
- **Production Authentication Configuration (January 2025)**: Successfully configured Supabase authentication for production domain alltowndelivery.com. Fixed recurring API parameter order errors in business signup flow. Updated Supabase Site URL and redirect URLs to handle authentication callbacks properly on production domain. ReSend email integration now working with proper domain configuration.
- **Strategic Marketing Pivot (January 2025)**: Redesigned platform marketing strategy based on user feedback. Main landing page now focuses on customers finding local delivery services rather than business signup. Created separate `/join` page for businesses with pricing tiers, feature details, and business-focused marketing. This better serves two distinct audiences: customers seeking delivery services and businesses wanting to join the platform.
- **Customer-Focused Main Site (January 2025)**: Transformed main AllTownDelivery.com landing page to prioritize service discovery over business acquisition. Features prominent area search, sample local services (like Sara's Quickie Delivery), and clear "For Businesses" button directing to dedicated business signup flow. Removed pricing tiers from main page to avoid confusion.
- **Production API Issues Resolved (January 2025)**: Fixed critical database connection and React hooks errors that were causing production failures. Development environment working perfectly with all APIs returning proper responses. Production deployment requires manual redeployment to apply fixes.
- **Critical Security Fixes (January 2025)**: Resolved dangerous client-side exposure of DATABASE_URL and improper service key handling. Implemented proper separation of client-safe and server-only environment variables.
- **Git Integration Success (January 2025)**: Resolved Git lock file issues that were preventing repository operations. Successfully established Git connectivity and pushed project to GitHub for Vercel deployment preparation.
- **Simplified Supabase Signup Flow (January 2025)**: Resolved email verification conflicts by implementing immediate tenant creation during signup. Eliminated complex email verification redirects that were causing conflicts between user and tenant verification. Users now get functional accounts immediately without waiting for email verification.
- **Multi-Tenant SaaS Architecture Implemented (January 2025)**: Successfully implemented conditional rendering approach to transform the platform into a multi-tenant SaaS. AllTownDelivery.com now serves as the main marketing site with tenant signup, area search, and platform features. Subdomains (e.g., saras.alltowndelivery.com) serve individual tenant delivery sites with custom branding.
- **Business Type-Specific Defaults (January 2025)**: Enhanced tenant signup with business type selection that automatically configures default settings. Multi-Service Delivery businesses (like Sara's) get optimized settings for handling grocery, pharmacy, restaurant, and auto parts delivery with appropriate pricing, hours, and loyalty program configurations.
- **Automatic Subdomain Generation (January 2025)**: Implemented smart subdomain auto-generation from business name with collision detection. Subdomains are automatically created (lowercase, special characters removed, spaces to hyphens) and cannot be edited by users for consistency.
- **Development Limitation**: Subdomain routing currently works in development environment only. Production deployment would require DNS configuration and proper subdomain routing setup.
- **Form Control Improvements**: Fixed controlled/uncontrolled input warnings in signup form by providing comprehensive default values. Added pre-filled test data for faster development testing.
- **Payment Integration Status**: Removed problematic Square payment integration due to persistent Web Payments SDK issues (DOM timing, container readiness problems). Online payment functionality is temporarily disabled with a user-friendly message indicating "Online payment coming soon!" All payment methods now default to cash/card on delivery.
- **Future Enhancement**: Stripe payment integration planned as a cleaner, more reliable alternative to Square.

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