# Event Management System Documentation

## Overview
This system provides a comprehensive event management solution for university blood donation campaigns, featuring student registration, QR code-based attendance tracking, and admin reporting capabilities.

## Features Implemented

### 1. Student Features
- **Event Discovery**: View upcoming events in an attractive carousel on the dashboard
- **Event Registration**: Join/Leave events with real-time participant count
- **QR Code Attendance**: Scan QR codes at events to mark attendance
- **Event Status Tracking**: See joined vs attended events

### 2. Admin Features
- **Event Management**: Create, edit, delete events with full details
- **QR Code Generation**: Generate unique QR codes for each event
- **Attendance Tracking**: Real-time attendance monitoring during events
- **Student Analytics**: View joined students, attendance rates, and detailed reports
- **Export Capabilities**: Easy data export for OD (Official Duty) processing

## File Structure

### Core Files Modified/Created:
1. **dashboard.tsx**: Enhanced with event joining functionality
2. **admin-events.tsx**: Added QR code generation and attendance management
3. **qr-scanner.tsx**: New QR scanner component for students
4. **MenuBar.tsx**: Added QR scanner menu item

## Database Schema

### Events Collection
```typescript
interface Event {
  id: string;
  title: string;
  description: string;
  location: string;
  eventDate: Date;
  joinedStudents: string[];     // Array of user IDs who joined
  attendedStudents: string[];   // Array of user IDs who attended
  qrCode: string;              // QR code data
  maxParticipants: number;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  createdAt: Date;
  createdBy: string;           // Admin ID
}
```

## QR Code System

### QR Code Data Format
```json
{
  "eventId": "event-123",
  "eventTitle": "Blood Donation Camp",
  "timestamp": "2024-03-15T10:00:00Z",
  "adminId": "admin-456"
}
```

### Security Features
- **Timestamp Validation**: QR codes expire after 24 hours
- **User Verification**: Only registered students can mark attendance
- **Duplicate Prevention**: Prevents multiple attendance marks
- **Event Validation**: Ensures event exists and is active

## Installation Requirements

### Required Packages
To enable full QR code functionality, install these packages:

```bash
# Navigate to mobile-app directory
cd mobile-app

# Install QR code packages
npx expo install expo-barcode-scanner react-native-qrcode-svg

# If using npm (after enabling execution policy)
npm install expo-barcode-scanner react-native-qrcode-svg
```

### PowerShell Execution Policy (Windows)
If you encounter execution policy errors:

```powershell
# Run as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## Post-Installation Setup

### 1. Update QR Code Components
After installing packages, update the following files:

#### admin-events.tsx
Replace the QR code placeholder with actual component:
```typescript
// Remove the comment and placeholder
import QRCode from 'react-native-qrcode-svg';

// Replace placeholder with:
<QRCode
  value={generateQRData(selectedEventForQR)}
  size={200}
  color="black"
  backgroundColor="white"
/>
```

#### qr-scanner.tsx
Enable the barcode scanner:
```typescript
// Uncomment the import
import { BarCodeScanner } from 'expo-barcode-scanner';

// Replace placeholder scanner with:
<BarCodeScanner
  onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
  style={StyleSheet.absoluteFillObject}
/>
```

### 2. Update Permissions

#### app.json
Add camera permissions:
```json
{
  "expo": {
    "plugins": [
      [
        "expo-barcode-scanner",
        {
          "cameraPermission": "Allow $(PRODUCT_NAME) to access camera for QR code scanning."
        }
      ]
    ]
  }
}
```

## Usage Workflow

### Student Workflow
1. **Discover Events**: Browse events on dashboard carousel
2. **Join Event**: Tap "Join Event" button on event cards
3. **Attend Event**: Use QR Scanner from menu to scan admin's QR code
4. **View Status**: Check attendance status in event details

### Admin Workflow
1. **Create Event**: Use admin events page to create new events
2. **Generate QR Code**: Tap "QR Code" button for active events
3. **Show QR at Event**: Display QR code for students to scan
4. **Monitor Attendance**: View real-time attendance statistics
5. **Export Data**: Use attendance reports for OD processing

## Key Features

### Event Carousel Enhancements
- **Auto-scroll**: Events rotate every 4 seconds
- **Visual indicators**: Dot indicators show current position
- **Horizontal layout**: Image left, details right for better information density
- **Join buttons**: Direct action buttons on each event card
- **Participant count**: Shows number of joined students

### QR Code System Benefits
- **Instant Attendance**: No manual roll call needed
- **Accurate Tracking**: Digital timestamps prevent fraud
- **Real-time Updates**: Attendance updates immediately
- **Easy Export**: Ready data for administrative use
- **User-friendly**: Simple scan process for students

### Admin Dashboard Features
- **Comprehensive Analytics**: Joined vs attended statistics
- **Student Details**: Full information of registered participants
- **Attendance Rate**: Percentage calculations
- **Export Ready**: Data formatted for OD applications
- **Security**: QR codes with expiration and validation

## Technical Implementation

### State Management
- Real-time updates using Firebase Firestore
- Optimistic UI updates for better user experience
- Loading states and error handling
- Local state management for UI interactions

### Performance Optimizations
- Debounced scroll handling to prevent flickering
- Efficient data fetching with pagination
- Image optimization for event posters
- Minimal re-renders with proper key usage

### Security Considerations
- User authentication validation
- Admin role verification
- QR code timestamp validation
- Event permission checks
- Data validation and sanitization

## Future Enhancements

### Potential Additions
1. **Push Notifications**: Remind students of upcoming events
2. **Certificate Generation**: Automatic certificates for attendees
3. **Photo Gallery**: Event photo sharing
4. **Feedback System**: Post-event feedback collection
5. **Analytics Dashboard**: Advanced reporting for admins
6. **Integration**: Connect with university systems

### Scalability Considerations
- Implement data pagination for large events
- Add offline support for poor connectivity
- Optimize for multiple simultaneous users
- Add data export in multiple formats (CSV, PDF)

## Support and Maintenance

### Common Issues
1. **QR Code Not Scanning**: Check camera permissions and lighting
2. **Attendance Not Marking**: Verify user joined event first
3. **Event Not Loading**: Check internet connection and Firebase rules
4. **Permission Errors**: Update app.json and rebuild

### Monitoring
- Track attendance success rates
- Monitor QR code scan attempts
- Log failed operations for debugging
- Monitor Firebase usage and costs

## Conclusion

This event management system provides a complete solution for university blood donation campaigns, streamlining the process from event discovery to attendance tracking. The QR code-based attendance system eliminates manual processes while providing accurate, real-time data for administrative purposes.

The system is designed to be user-friendly for students while providing powerful management tools for administrators, ensuring efficient event management and accurate record-keeping for OD processing.