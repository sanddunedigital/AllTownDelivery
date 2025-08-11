import { createClient } from '@supabase/supabase-js';
import { randomUUID } from "crypto";

// Extract Supabase URL from DATABASE_URL if needed
const extractedUrl = (() => {
  try {
    const dbUrl = process.env.DATABASE_URL || '';
    if (dbUrl.includes('supabase.com')) {
      const url = new URL(dbUrl);
      const projectRef = url.hostname.split('.')[0].replace('aws-0-us-east-2.pooler.', '');
      return `https://${projectRef}.supabase.co`;
    }
    return null;
  } catch {
    return null;
  }
})();

// Use environment variables with fallback to extracted URL
const supabaseUrl = process.env.VITE_SUPABASE_URL || extractedUrl;
// SECURITY FIX: Service operations must use service role key, never anon key
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration for storage. Need VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  throw new Error('Missing required Supabase service configuration');
}

// Create Supabase client for server-side operations
const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || 'placeholder-key'
);

export class SupabaseStorageService {
  private bucketName = 'business-assets';

  constructor() {}

  // Initialize storage bucket if it doesn't exist
  async initializeBucket(): Promise<void> {
    try {
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error('Error listing buckets:', listError);
        return;
      }

      const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);
      
      if (!bucketExists) {
        const { error: createError } = await supabase.storage.createBucket(this.bucketName, {
          public: true,
          allowedMimeTypes: ['image/*'],
          fileSizeLimit: 10485760 // 10MB
        });
        
        if (createError) {
          console.error('Error creating bucket:', createError);
        } else {
          console.log(`✓ Created Supabase storage bucket: ${this.bucketName}`);
        }
      }
    } catch (error) {
      console.error('Error initializing Supabase storage bucket:', error);
    }
  }

  // Get upload URL for logo
  async getLogoUploadURL(): Promise<string> {
    const fileName = `logos/${randomUUID()}.png`;
    
    // Create a signed upload URL that expires in 15 minutes
    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .createSignedUploadUrl(fileName, {
        upsert: true
      });

    if (error) {
      throw new Error(`Failed to get upload URL: ${error.message}`);
    }

    return data.signedUrl;
  }

  // Get public URL for uploaded file
  getPublicURL(filePath: string): string {
    const { data } = supabase.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);
    
    return data.publicUrl;
  }

  // Upload file directly (alternative method)
  async uploadLogo(file: Buffer, fileName: string, contentType: string): Promise<string> {
    const filePath = `logos/${randomUUID()}-${fileName}`;
    
    const { data, error } = await supabase.storage
      .from(this.bucketName)
      .upload(filePath, file, {
        contentType,
        upsert: true,
        duplex: 'half'
      });

    if (error) {
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    // Return the public URL
    return this.getPublicURL(data.path);
  }

  // Delete old logo when updating
  async deleteLogo(logoUrl: string): Promise<void> {
    try {
      // Extract file path from URL
      const url = new URL(logoUrl);
      const pathParts = url.pathname.split('/');
      const bucketIndex = pathParts.findIndex(part => part === this.bucketName);
      
      if (bucketIndex > -1 && bucketIndex < pathParts.length - 1) {
        const filePath = pathParts.slice(bucketIndex + 1).join('/');
        
        const { error } = await supabase.storage
          .from(this.bucketName)
          .remove([filePath]);
          
        if (error) {
          console.error('Error deleting old logo:', error);
        }
      }
    } catch (error) {
      console.error('Error parsing logo URL for deletion:', error);
    }
  }

  // Extract file path from Supabase URL
  extractFilePathFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const bucketIndex = pathParts.findIndex(part => part === this.bucketName);
      
      if (bucketIndex > -1 && bucketIndex < pathParts.length - 1) {
        return pathParts.slice(bucketIndex + 1).join('/');
      }
      
      return null;
    } catch {
      return null;
    }
  }
}

export const supabaseStorage = new SupabaseStorageService();