/**
 * Cloudinary Image Upload Utility
 * Handles image uploads to Cloudinary with size validation
 */

import { Platform } from 'react-native';

interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
}

interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Upload image to Cloudinary
 * @param imageUri - Local URI of the image to upload
 * @param folder - Optional folder name in Cloudinary (e.g., 'profile_pictures', 'event_posters')
 * @returns Upload result with URL or error message
 */
export const uploadImageToCloudinary = async (
  imageUri: string,
  folder: string = 'pu_nss_connect'
): Promise<UploadResult> => {
  try {
    // Get Cloudinary configuration
    const cloudName = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dwfquaj6z';
    const uploadPreset = process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'pu_nss_preset';

    if (!cloudName) {
      return {
        success: false,
        error: 'Cloudinary cloud name is not configured. Please add EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME to your .env file.',
      };
    }

    // Fetch the image from local URI
    const response = await fetch(imageUri);
    const blob = await response.blob();

    // Check file size (500KB = 500 * 1024 bytes)
    const maxSize = 500 * 1024; // 500KB in bytes
    if (blob.size > maxSize) {
      const sizeInKB = Math.round(blob.size / 1024);
      return {
        success: false,
        error: `Image size (${sizeInKB}KB) exceeds the maximum allowed size of 500KB. Please choose a smaller image.`,
      };
    }

    // Create FormData for Cloudinary upload
    const formData = new FormData();
    
    // Add the image file - different format for web vs native
    if (Platform.OS === 'web') {
      // For web, append blob directly with a filename
      formData.append('file', blob, `upload_${Date.now()}.jpg`);
    } else {
      // For native platforms, use the object format
      formData.append('file', {
        uri: imageUri,
        type: blob.type || 'image/jpeg',
        name: `upload_${Date.now()}.jpg`,
      } as any);
    }

    // Add upload preset (must be created in Cloudinary dashboard as unsigned)
    formData.append('upload_preset', uploadPreset);
    
    // Add folder
    formData.append('folder', folder);

    // Upload to Cloudinary
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
    
    console.log('Uploading to Cloudinary:', cloudinaryUrl, 'Preset:', uploadPreset, 'Folder:', folder);
    
    const uploadResponse = await fetch(cloudinaryUrl, {
      method: 'POST',
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({}));
      console.error('Cloudinary upload failed:', errorData);
      
      // Provide helpful error messages
      if (errorData.error?.message?.includes('Invalid upload preset')) {
        return {
          success: false,
          error: `Upload preset "${uploadPreset}" not found. Please create an unsigned upload preset in your Cloudinary dashboard.`,
        };
      }
      
      return {
        success: false,
        error: errorData.error?.message || `Upload failed with status ${uploadResponse.status}`,
      };
    }

    const data: CloudinaryUploadResponse = await uploadResponse.json();

    return {
      success: true,
      url: data.secure_url,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during upload',
    };
  }
};

/**
 * Delete image from Cloudinary
 * @param publicId - Public ID of the image to delete
 * @returns Success status
 */
export const deleteImageFromCloudinary = async (publicId: string): Promise<boolean> => {
  try {
    // Note: Deletion requires authentication, so you might need to implement this via your backend
    // For now, we'll just return true as deletion is optional
    return true;
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    return false;
  }
};

/**
 * Get file size from URI
 * @param uri - Image URI
 * @returns Size in KB
 */
export const getImageSize = async (uri: string): Promise<number> => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    return Math.round(blob.size / 1024); // Return size in KB
  } catch (error) {
    console.error('Error getting image size:', error);
    return 0;
  }
};
