/**
 * Automated Icon Migration Script
 * Converts @expo/vector-icons to lucide-react-native across all files
 */

const fs = require('fs');
const path = require('path');

// Comprehensive icon mapping from Ionicons to Lucide
const iconMapping = {
  // Common mappings
  'home': 'Home',
  'home-outline': 'Home',
  'person': 'User',
  'person-outline': 'User',
  'calendar': 'Calendar',
  'calendar-outline': 'Calendar',
  'heart': 'Heart',
  'heart-outline': 'Heart',
  'notifications': 'Bell',
  'notifications-outline': 'Bell',
  'settings': 'Settings',
  'settings-outline': 'Settings',
  'search': 'Search',
  'search-outline': 'Search',
  'add': 'Plus',
  'add-circle': 'Plus',
  'add-circle-outline': 'Plus',
  'remove': 'Minus',
  'remove-circle': 'Minus',
  'close': 'X',
  'close-circle': 'XCircle',
  'menu': 'Menu',
  'chevron-back': 'ChevronLeft',
  'chevron-forward': 'ChevronRight',
  'chevron-down': 'ChevronDown',
  'chevron-up': 'ChevronUp',
  'arrow-back': 'ArrowLeft',
  'arrow-forward': 'ArrowRight',
  'mail': 'Mail',
  'mail-outline': 'Mail',
  'call': 'Phone',
  'call-outline': 'Phone',
  'location': 'MapPin',
  'location-outline': 'MapPin',
  'camera': 'Camera',
  'camera-outline': 'Camera',
  'image': 'ImageIcon',
  'image-outline': 'ImageIcon',
  'images': 'ImageIcon',
  'images-outline': 'ImageIcon',
  'trash': 'Trash2',
  'trash-outline': 'Trash2',
  'create': 'Edit',
  'create-outline': 'Edit',
  'pencil': 'Edit',
  'save': 'Save',
  'save-outline': 'Save',
  'share': 'Share2',
  'share-outline': 'Share2',
  'eye': 'Eye',
  'eye-outline': 'Eye',
  'eye-off': 'EyeOff',
  'eye-off-outline': 'EyeOff',
  'checkmark': 'Check',
  'checkmark-circle': 'CheckCircle',
  'checkmark-circle-outline': 'CheckCircle',
  'close-circle-outline': 'XCircle',
  'alert-circle': 'AlertCircle',
  'alert-circle-outline': 'AlertCircle',
  'information-circle': 'Info',
  'information-circle-outline': 'Info',
  'help-circle': 'HelpCircle',
  'help-circle-outline': 'HelpCircle',
  'star': 'Star',
  'star-outline': 'Star',
  'time': 'Clock',
  'time-outline': 'Clock',
  'qr-code': 'QrCode',
  'qr-code-outline': 'QrCode',
  'people': 'Users',
  'people-outline': 'Users',
  'business': 'Building2',
  'business-outline': 'Building2',
  'newspaper': 'Newspaper',
  'newspaper-outline': 'Newspaper',
  'document-text': 'FileText',
  'document-text-outline': 'FileText',
  'document': 'FileText',
  'document-outline': 'FileText',
  'list': 'List',
  'list-outline': 'List',
  'grid': 'Grid3X3',
  'grid-outline': 'Grid3X3',
  'filter': 'Filter',
  'filter-outline': 'Filter',
  'refresh': 'RefreshCw',
  'refresh-outline': 'RefreshCw',
  'chatbox': 'MessageSquare',
  'chatbox-outline': 'MessageSquare',
  'chatbox-ellipses': 'MessageSquare',
  'chatbox-ellipses-outline': 'MessageSquare',
  'thumbs-up': 'ThumbsUp',
  'thumbs-down': 'ThumbsDown',
  'copy': 'Copy',
  'copy-outline': 'Copy',
  'clipboard': 'Clipboard',
  'clipboard-outline': 'Clipboard',
  'download': 'Download',
  'download-outline': 'Download',
  'upload': 'Upload',
  'upload-outline': 'Upload',
  'cloud-upload': 'Upload',
  'cloud-upload-outline': 'Upload',
  'send': 'Send',
  'send-outline': 'Send',
  'lock-closed': 'Lock',
  'lock-closed-outline': 'Lock',
  'lock-open': 'Unlock',
  'lock-open-outline': 'Unlock',
  'shield-checkmark': 'Shield',
  'shield-checkmark-outline': 'Shield',
  'trophy': 'Trophy',
  'trophy-outline': 'Trophy',
  'gift': 'Gift',
  'gift-outline': 'Gift',
  'award': 'Award',
  'award-outline': 'Award',
  'play': 'Play',
  'play-outline': 'Play',
  'pause': 'Pause',
  'pause-outline': 'Pause',
  'stop': 'Square',
  'stop-outline': 'Square',
  'volume-high': 'Volume2',
  'volume-medium': 'Volume1',
  'volume-low': 'Volume',
  'volume-mute': 'VolumeX',
  'wifi': 'Wifi',
  'wifi-outline': 'Wifi',
  'bluetooth': 'Bluetooth',
  'bluetooth-outline': 'Bluetooth',
  'battery-full': 'Battery',
  'battery-half': 'BatteryMedium',
  'battery-dead': 'BatteryLow',
  'flashlight': 'Flashlight',
  'flashlight-outline': 'Flashlight',
  'car': 'Car',
  'car-outline': 'Car',
  'airplane': 'Plane',
  'airplane-outline': 'Plane',
  'cart': 'ShoppingCart',
  'cart-outline': 'ShoppingCart',
  'bag': 'ShoppingBag',
  'bag-outline': 'ShoppingBag',
  'wallet': 'Wallet',
  'wallet-outline': 'Wallet',
  'card': 'CreditCard',
  'card-outline': 'CreditCard',
  'cash': 'DollarSign',
  'cash-outline': 'DollarSign',
};

// Files to migrate
const filesToMigrate = [
  'app/donate.tsx',
  'app/profile.tsx',
  'app/qr-scanner.tsx',
  'app/notifications.tsx',
  'app/upload-credential.tsx',
  'app/hospital-add-request.tsx',
  'app/admin-events.tsx',
  'app/feedback.tsx',
  'app/hospital-request-details.tsx',
  'app/hospital-my-requests.tsx',
  'app/events.tsx',
  'app/admin.tsx',
  'app/admin-users.tsx',
  'app/admin-nss.tsx',
  'app/admin-hospitals.tsx',
  'app/admin-blood-banks.tsx',
  'app/admin-feedback.tsx',
  'app/admin-donations.tsx',
  'app/blood-banks.tsx',
  'app/contact-us.tsx',
  'app/faq.tsx',
  'app/gallery.tsx',
  'app/my-requests.tsx',
  'app/my-events.tsx',
  'app/recent-donors.tsx',
  'app/top-donors.tsx',
  'app/hospital-dashboard.tsx',
  'app/admin-dashboard.tsx',
];

function migrateFile(filePath) {
  const fullPath = path.join(__dirname, '..', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠ Skipping ${filePath} - file not found`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let modified = false;
  const usedIcons = new Set();

  // Step 1: Find all Ionicons usage and collect used icons
  const iconUsageRegex = /<Ionicons\s+name=["']([^"']+)["']/g;
  let match;
  while ((match = iconUsageRegex.exec(content)) !== null) {
    const iconName = match[1];
    if (iconMapping[iconName]) {
      usedIcons.add(iconMapping[iconName]);
    }
  }

  if (usedIcons.size === 0) {
    console.log(`⚠ No icons found in ${filePath}`);
    return;
  }

  // Step 2: Replace import statement
  const oldImport = /import\s+{\s*Ionicons\s*}\s+from\s+['"]@expo\/vector-icons['"]\s*;?\n/;
  if (oldImport.test(content)) {
    const newImport = `import { ${Array.from(usedIcons).sort().join(', ')} } from 'lucide-react-native';\n`;
    content = content.replace(oldImport, newImport);
    modified = true;
  }

  // Step 3: Replace Ionicons components with Lucide components
  for (const [oldName, newName] of Object.entries(iconMapping)) {
    // Match: <Ionicons name="icon-name" size={24} color="#000" />
    const pattern = new RegExp(
      `<Ionicons\\s+name=["']${oldName}["']\\s+size={([^}]+)}\\s+color={([^}]+)}\\s*\\/?>`,
      'g'
    );
    const replacement = `<${newName} size={$1} color={$2} />`;
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      modified = true;
    }

    // Also handle multi-line format
    const multiLinePattern = new RegExp(
      `<Ionicons\\s*\\n\\s*name=["']${oldName}["']\\s*\\n\\s*size={([^}]+)}\\s*\\n\\s*color={([^}]+)}\\s*\\n\\s*\\/?>`,
      'g'
    );
    if (multiLinePattern.test(content)) {
      content = content.replace(multiLinePattern, `<${newName} size={$1} color={$2} />`);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✓ Migrated ${filePath} (${usedIcons.size} icons: ${Array.from(usedIcons).join(', ')})`);
  } else {
    console.log(`⚠ No changes made to ${filePath}`);
  }
}

console.log('🚀 Starting icon migration...\n');

let migratedCount = 0;
for (const file of filesToMigrate) {
  try {
    migrateFile(file);
    migratedCount++;
  } catch (error) {
    console.error(`✗ Error migrating ${file}:`, error.message);
  }
}

console.log(`\n✅ Migration complete! Processed ${migratedCount}/${filesToMigrate.length} files`);
console.log('\nNext steps:');
console.log('1. Run: npm run web:build');
console.log('2. Check for any remaining errors');
console.log('3. Test the app');
