# Quick Start - Cloudinary Setup

## 🚀 3-Minute Setup

### Step 1: Get Cloudinary Account
1. Go to https://cloudinary.com/users/register_free
2. Sign up (free account)
3. Copy your **Cloud Name** from the dashboard

### Step 2: Create Upload Preset
1. Click **Settings** (⚙️ icon)
2. Go to **Upload** tab
3. Scroll to **Upload presets**
4. Click **Add upload preset**
5. Set:
   - Name: `pu_nss_preset`
   - Signing mode: **Unsigned** ⚠️ Important!
   - Max file size: 524288 (500KB)
6. Click **Save**

### Step 3: Update .env File
Open `.env` and replace:

```env
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name_here
EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET=pu_nss_preset
```

Replace `your_cloud_name_here` with the Cloud Name from Step 1.

### Step 4: Restart App
```bash
# Stop current server (Ctrl+C)
npx expo start -c
```

## ✅ That's it!

### Test It:
1. Open app
2. Go to Profile
3. Tap profile picture
4. Select an image
5. Should upload successfully!

## ❌ Troubleshooting

**Upload fails?**
- Check Cloud Name in `.env` is correct
- Check upload preset is "Unsigned"
- Restart development server

**Image too large?**
- Image must be under 500KB
- Use smaller image or compress it

## 📝 Where Images Are Used

- ✅ Profile pictures
- ✅ Event posters (admin)
- ✅ Donation certificates
- ✅ Gallery uploads

All now use Cloudinary with 500KB limit.
