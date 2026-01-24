# PWA Icons Guide

## Required Icons for PWA

Your PWA needs icons in various sizes for different devices and contexts. Place all icons in the `public/` directory.

### Icon Sizes Needed

Create PNG icons in these sizes:

- `icon-72x72.png` - Small devices, notification badge
- `icon-96x96.png` - Medium devices
- `icon-120x120.png` - iPhone/iPad
- `icon-128x128.png` - Chrome Web Store
- `icon-144x144.png` - Windows tile
- `icon-152x152.png` - iPad
- `icon-192x192.png` - Android devices (REQUIRED)
- `icon-384x384.png` - Large Android devices
- `icon-512x512.png` - Splash screen, large displays (REQUIRED)

### Apple-Specific Icons

- `apple-touch-icon.png` (180x180) - iOS home screen
- `favicon-16x16.png` - Browser tab (small)
- `favicon-32x32.png` - Browser tab (standard)
- `favicon.ico` - Browser fallback

### Splash Screens (iOS)

- `splash-1125x2436.png` - iPhone X, XS, 11 Pro
- `splash-1170x2532.png` - iPhone 12, 13, 14
- `splash-1179x2556.png` - iPhone 14 Pro, 15 Pro
- `splash-1242x2688.png` - iPhone XS Max, 11 Pro Max
- `splash-1284x2778.png` - iPhone 14 Pro Max, 15 Pro Max
- `splash-1290x2796.png` - iPhone 15 Plus, Pro Max

### Social/Sharing

- `og-image.png` (1200x630) - Facebook/Twitter share preview

---

## Quick Icon Generation

### Option 1: Using your existing Android icons

You already have icons in `android/app/src/main/res/` directories. Copy them:

```bash
# Copy from Android resources to public folder
cp android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png public/icon-192x192.png
cp android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png public/icon-512x512.png
```

### Option 2: Generate from single source image

Use [RealFaviconGenerator](https://realfavicongenerator.net/):

1. Upload your logo/icon
2. Download the generated package
3. Extract all files to `public/` directory

### Option 3: Use imagemagick (if installed)

```bash
# Install imagemagick (Windows)
winget install ImageMagick.ImageMagick

# Generate all sizes from a single 1024x1024 source
convert icon-source.png -resize 72x72 public/icon-72x72.png
convert icon-source.png -resize 96x96 public/icon-96x96.png
convert icon-source.png -resize 120x120 public/icon-120x120.png
convert icon-source.png -resize 128x128 public/icon-128x128.png
convert icon-source.png -resize 144x144 public/icon-144x144.png
convert icon-source.png -resize 152x152 public/icon-152x152.png
convert icon-source.png -resize 192x192 public/icon-192x192.png
convert icon-source.png -resize 384x384 public/icon-384x384.png
convert icon-source.png -resize 512x512 public/icon-512x512.png
```

### Option 4: Use Expo assets

If you have `assets/images/icon.png`:

```bash
# Copy and rename
cp assets/images/icon.png public/icon-512x512.png
cp assets/images/icon.png public/icon-192x192.png
```

---

## Minimum Required (for testing)

To get started quickly, you need at least:

- `icon-192x192.png` ✅ REQUIRED
- `icon-512x512.png` ✅ REQUIRED
- `favicon.ico`

The app will work with just these, but won't look perfect on all devices.

---

## Design Guidelines

### Icon Design Tips

1. **Simple & Bold** - Icons should be recognizable at small sizes
2. **Solid Background** - Use your brand color (#EF4444 - red)
3. **Center Focus** - Main element centered with padding
4. **No Transparency** (for some platforms) - Use solid background
5. **Maskable** - Safe zone: keep important content in center 80%

### For Blood Donation Theme

Consider using:

- Blood drop icon
- Heart with drop
- Red cross
- Hand holding drop
- NSS logo

---

## Testing Your Icons

### In Browser (Desktop)

1. Open DevTools (F12)
2. Go to **Application** → **Manifest**
3. Check if icons are loading correctly

### On Mobile

1. Add to home screen
2. Check icon appearance
3. Check splash screen (iOS)

---

## Current Status

📁 Icon files are referenced in:

- `public/manifest.json` (PWA manifest)
- `public/index.html` (Apple touch icons, favicons)
- `app.config.json` (Expo configuration)

⚠️ **Action Required**: Generate/copy icon files to `public/` directory

Once icons are in place, your PWA will have a professional appearance on all platforms!
