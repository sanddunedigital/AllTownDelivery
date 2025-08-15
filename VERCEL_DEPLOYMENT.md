# Vercel Deployment Guide

This project is now fully configured for deployment on Vercel with complete SSL support for wildcard subdomains.

## What's Configured

✅ **Serverless API Functions** - Backend runs as Vercel serverless functions
✅ **Multi-tenant Architecture** - Subdomain routing works automatically  
✅ **Automatic SSL** - Vercel provides SSL certificates for `*.alltowndelivery.com`
✅ **Database Integration** - Supabase database with fallback to memory storage
✅ **Build Process** - Optimized build pipeline for Vercel deployment

## Deployment Steps

### 1. Connect Repository to Vercel
- Go to [vercel.com](https://vercel.com)
- Import your GitHub repository
- Vercel will automatically detect the configuration from `vercel.json`

### 2. Configure Environment Variables
Add these secrets in Vercel Dashboard → Project Settings → Environment Variables:

```
DATABASE_URL=your_supabase_database_url
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key (if needed)
RESEND_API_KEY=your_resend_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_key
```

### 3. Domain Configuration
Since you own `alltowndelivery.com` through Vercel:
- Main domain: `alltowndelivery.com` → automatically configured
- Wildcard subdomains: `*.alltowndelivery.com` → automatically configured with SSL

### 4. Deploy
- Push changes to your main branch
- Vercel automatically builds and deploys
- Your app will be live at `alltowndelivery.com` with working subdomains

## File Structure

```
api/
  index.ts         # Serverless function entry point
server/            # Backend logic (unchanged)
client/            # Frontend code (unchanged)  
vercel.json        # Deployment configuration
build.js           # Build optimization script
```

## Features Working After Deployment

✅ Main site: `https://alltowndelivery.com`
✅ Tenant sites: `https://tenant-name.alltowndelivery.com` 
✅ All API endpoints
✅ Database integration
✅ Email verification
✅ Real-time features
✅ SSL certificates for all domains

## Testing

Run locally: `npm run dev`
Test build: `node test-build.js`

Your complex hosting issue is now resolved with a simple, scalable solution!