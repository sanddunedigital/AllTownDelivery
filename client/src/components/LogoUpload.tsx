import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Image } from 'lucide-react';

interface LogoUploadProps {
  currentLogoUrl?: string;
  onLogoChange: (logoUrl: string | null) => void;
  businessName?: string;
}

export function LogoUpload({ 
  currentLogoUrl, 
  onLogoChange, 
  businessName 
}: LogoUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentLogoUrl || null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setPreview(currentLogoUrl || null);
  }, [currentLogoUrl]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please select an image file.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB for logos)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 2MB.",
        variant: "destructive",
      });
      return;
    }

    // Show immediate preview while uploading
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    setUploading(true);

    try {
      // Get Supabase upload URL from backend
      const uploadResponse = await fetch('/api/admin/logo/upload-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to get upload URL');
      }

      const { uploadURL } = await uploadResponse.json();

      // Upload file to Supabase Storage using the signed URL
      const formData = new FormData();
      formData.append('file', file);

      const uploadResult = await fetch(uploadURL, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResult.ok) {
        throw new Error('Failed to upload file to Supabase Storage');
      }

      // Extract the public URL from the upload URL (remove query parameters)
      const publicUrl = uploadURL.split('?')[0];

      // Update backend with the public logo URL
      const updateResponse = await fetch('/api/admin/business-settings/logo', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logoURL: publicUrl,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update logo');
      }

      const { logoPath } = await updateResponse.json();
      
      // Use the returned public URL for display
      setPreview(logoPath);
      onLogoChange(logoPath);

      toast({
        title: "Logo Uploaded",
        description: "Your business logo has been uploaded successfully!",
      });
      
      setUploading(false);
    } catch (error: any) {
      console.error('Logo upload error:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    setPreview(null);
    onLogoChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    toast({
      title: "Logo Removed",
      description: "Business logo has been removed.",
    });
  };

  return (
    <div className="space-y-3">
      <Label>Business Logo</Label>
      
      {preview ? (
        <div className="relative">
          <div className="w-full max-w-sm h-32 bg-gray-50 border rounded-lg flex items-center justify-center p-4">
            <img
              src={preview}
              alt={businessName || 'Business Logo'}
              className="max-w-full max-h-full object-contain"
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={handleRemoveLogo}
            disabled={uploading}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center max-w-sm">
          <Image className="mx-auto h-12 w-12 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 mb-3">
            Upload your business logo (JPG, PNG, max 2MB)
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Choose Logo'}
          </Button>
        </div>
      )}

      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}