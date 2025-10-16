# PU NSS CONNECT - App Rename Cleanup Script
# Run this after completing the rename process

# Remove old Android package directories
Remove-Item -Recurse -Force "d:\PU NSS CONNECT\android\app\src\main\java\com\farhankoolimad\PU_Blood_Connect" -ErrorAction SilentlyContinue

# Clear build cache
Remove-Item -Recurse -Force "d:\PU NSS CONNECT\android\app\build" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "d:\PU NSS CONNECT\android\build" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "d:\PU NSS CONNECT\.expo" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "d:\PU NSS CONNECT\dist" -ErrorAction SilentlyContinue

# Clear node modules and reinstall
Remove-Item -Recurse -Force "d:\PU NSS CONNECT\node_modules" -ErrorAction SilentlyContinue
Remove-Item -Force "d:\PU NSS CONNECT\package-lock.json" -ErrorAction SilentlyContinue

Write-Host "✅ Cleanup completed!"
Write-Host "🔄 Next steps:"
Write-Host "1. Run: npm install"
Write-Host "2. Run: npx expo prebuild --clean"
Write-Host "3. Test the app with: npx expo start"