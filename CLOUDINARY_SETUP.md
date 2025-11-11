# Cloudinary Setup Instructions for PU NSS CONNECT

## Overview
This app uses Cloudinary for image uploads instead of Firebase Storage (which requires a paid plan). All image uploads including profile pictures, event posters, donation certificates, and gallery images are now handled by Cloudinary.

## Setup Steps

### 1. Get Your Cloudinary Credentials

1. Go to [Cloudinary](https://cloudinary.com) and sign up for a free account
2. After signing in, you'll see your **Dashboard**
3. Note down your **Cloud Name** (you'll need this)

### 2. Create an Upload Preset

1. In your Cloudinary dashboard, go to **Settings** (gear icon)
2. Click on **Upload** tab
3. Scroll down to **Upload presets** section
4. Click **Add upload preset**
5. Configure the preset:
   - **Preset name**: `pu_nss_preset` (or any name you prefer)
   - **Signing mode**: Select **Unsigned** (this allows uploads without backend authentication)
   - **Folder**: Leave empty or set a default folder
   - **Allowed formats**: jpg, png, jpeg
   - **Max file size**: Set to 500KB (524288 bytes)
6. Click **Save**

### 3. Update Environment Variables

1. Open the `.env` file in the root of your project
2. Update the Cloudinary configuration with your credentials:

```env
# Cloudinary Configuration - Image Upload Service
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name_here
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=pu_nss_preset
```

Replace:
- `your_cloud_name_here` with your actual Cloud Name from the dashboard
- `pu_nss_preset` with your upload preset name (if you used a different name)

### 4. Restart Your Development Server

After updating the `.env` file:

```bash
# Stop the current server (Ctrl+C)

# Clear cache and restart
npx expo start -c
```

## Image Upload Locations

The app uploads images to different folders in Cloudinary:

| Feature | Cloudinary Folder | Max Size |
|---------|------------------|----------|
| Profile Pictures | `profile_pictures` | 500KB |
| Event Posters | `event_posters` | 500KB |
| Donation Certificates | `donation_certificates` | 500KB |
| Gallery Images | `gallery_images` | 500KB |

## File Size Limit

All images must be **under 500KB** to ensure:
- Fast uploads on mobile networks
- Free tier limits are not exceeded
- Good app performance

Users will see error messages if they try to upload images larger than 500KB.

## Modified Files

The following files have been updated to use Cloudinary:

1. `utils/cloudinary.ts` - New utility for Cloudinary uploads
2. `app/upload-credential.tsx` - Donation certificate uploads
3. `app/profile.tsx` - Profile picture uploads
4. `app/gallery.tsx` - Gallery image uploads
5. `app/admin-events.tsx` - Event poster uploads
6. `.env` - Cloudinary credentials
7. `types/env.d.ts` - TypeScript types for environment variables
8. `firebase.js` - Removed Firebase Storage (no longer needed)

## Testing Image Uploads

After setup, test each upload feature:

1. **Profile Picture**: Go to Profile → Tap on profile picture → Select image
2. **Event Poster**: Admin Events → Create Event → Select Poster Image
3. **Donation Certificate**: History → Upload Credential → Select certificate image
4. **Gallery**: Gallery → Add Image button

## Troubleshooting

### "Upload failed" error
- Check if your Cloud Name is correct in `.env`
- Verify upload preset exists and is set to "Unsigned"
- Make sure the image is under 500KB

### "Image size exceeds maximum" error
- The selected image is larger than 500KB
- Ask user to compress the image or select a different one

### "Cannot find name 'uploadImageToCloudinary'" error
- Restart your development server with `npx expo start -c`
- Check that `utils/cloudinary.ts` exists

## Free Tier Limits

Cloudinary free tier includes:
- 25 GB storage
- 25 GB monthly bandwidth
- 25,000 transformations per month

This should be sufficient for most small to medium-sized applications.

## Security Notes

- Upload preset is **unsigned**, meaning anyone with the preset name can upload
- This is acceptable for authenticated app users
- For production, consider implementing backend proxy for uploads
- Monitor your Cloudinary usage regularly

## Support

For Cloudinary-specific issues, refer to:
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [React Native Upload Guide](https://cloudinary.com/documentation/react_native_integration)
