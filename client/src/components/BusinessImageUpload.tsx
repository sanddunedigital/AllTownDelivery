import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Upload, X, Image } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../hooks/use-toast';

interface BusinessImageUploadProps {
  currentImageUrl?: string;
  onImageChange: (imageUrl: string | null) => void;
  businessId?: string;
  businessName?: string;
}

export function BusinessImageUpload({ 
  currentImageUrl, 
  onImageChange, 
  businessId, 
  businessName 
}: BusinessImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImageUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please select an image smaller than 5MB.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${businessId || 'temp'}-${Date.now()}.${fileExt}`;
      const filePath = `business-images/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('business-images')
        .upload(filePath, file);

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('business-images')
        .getPublicUrl(filePath);

      setPreview(publicUrl);
      onImageChange(publicUrl);

      toast({
        title: "Image Uploaded",
        description: "Business image has been uploaded successfully.",
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (currentImageUrl && currentImageUrl.includes('supabase')) {
      try {
        // Extract file path from URL
        const urlParts = currentImageUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `business-images/${fileName}`;

        // Remove from Supabase Storage
        await supabase.storage
          .from('business-images')
          .remove([filePath]);
      } catch (error) {
        console.error('Error removing image from storage:', error);
        // Continue anyway to remove from UI
      }
    }

    setPreview(null);
    onImageChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    toast({
      title: "Image Removed",
      description: "Business image has been removed.",
    });
  };

  return (
    <div className="space-y-3">
      <Label>Business Image</Label>
      
      {preview ? (
        <div className="relative">
          <img
            src={preview}
            alt={businessName || 'Business'}
            className="w-full h-48 object-cover rounded-lg border"
          />
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={handleRemoveImage}
            disabled={uploading}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Image className="mx-auto h-12 w-12 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 mb-3">
            Upload a business image (JPG, PNG, max 5MB)
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Choose Image'}
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