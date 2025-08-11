# Deployment Guide for Vercel

## Files to Remove Before Export

### Replit-Specific Files (Remove These):
- `.replit` - Replit configuration
- `replit.nix` - Nix package configuration  
- Any `.replit*` files

### Files to Keep:
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript configuration (now properly formatted)
- `vite.config.ts` - Vite build configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `.gitignore` - Updated for production use

## Vercel Configuration

### 1. Create `vercel.json`:
```json
{
  "builds": [
    {
      "src": "server/index.ts",
      "use": "@vercel/node"
    },
    {
      "src": "client/**/*",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/client/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### 2. Update Package.json Scripts:
Ensure these scripts exist:
```json
{
  "scripts": {
    "build": "vite build",
    "start": "node dist/server/index.js",
    "dev": "tsx server/index.ts"
  }
}
```

## Environment Variables for Vercel

Add these to your Vercel project settings:

### Required Secrets:
- `DATABASE_URL` - Your Supabase connection string
- `VITE_SUPABASE_URL` - Supabase project URL  
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

### Optional Secrets (if using):
- `GOOGLE_MAPS_API_KEY` - For location services
- `STRIPE_SECRET_KEY` - For payment processing
- `VITE_STRIPE_PUBLIC_KEY` - Stripe public key
- `SENDGRID_API_KEY` - For email services

## Security Fixes Applied ✅

1. **Removed DATABASE_URL from client side** - Critical security fix
2. **Fixed service key fallbacks** - Server operations now require proper service role key
3. **Added security validation** - Server throws errors for missing critical secrets

## Pre-Export Checklist

1. ✅ Fixed tsconfig.json formatting
2. ✅ Updated .gitignore for production  
3. ✅ Create vercel.json configuration
4. ✅ Applied critical security fixes
5. ✅ Verified all environment variables are documented

## Export Process

1. **Clean Project**: Remove .replit files
2. **Download**: Export all files from Replit
3. **Local Setup**: 
   - `npm install`
   - Set up environment variables
   - Test locally: `npm run dev`
4. **Deploy**: Push to GitHub and connect to Vercel

## Notes

- The project uses Supabase for database (already configured)
- Multi-tenant architecture works with subdomains on Vercel
- Memory storage fallback ensures app works even if database is temporarily unavailable