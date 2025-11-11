declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_FIREBASE_API_KEY: string;
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: string;
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
    EXPO_PUBLIC_FIREBASE_APP_ID: string;
    EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME: string;
    EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET: string;
  }
}

// User Roles
export type UserRole = 'student' | 'admin' | 'hospital';

// Hospital User Profile
export interface HospitalUser {
  uid: string;
  role: 'hospital';
  hospitalName: string;
  email: string;
  contactNumber: string;
  address: string;
  licenseNumber?: string;
  verified: boolean;
  createdAt: any;
  createdBy: string;
  pushToken?: string;
}

// Blood Request
export interface BloodRequest {
  id?: string;
  requestId?: string;
  hospitalId?: string;
  hospitalName?: string;
  patientName: string;
  bloodGroup: string;
  unitsNeeded: number;
  urgency: 'critical' | 'urgent' | 'normal';
  requiredBy: any;
  contactNumber: string;
  additionalNotes?: string;
  acceptedDonors?: string[];
  status: 'active' | 'fulfilled' | 'closed';
  createdAt: any;
  updatedAt?: any;
}

// Accepted Donor Details
export interface AcceptedDonor {
  userId: string;
  userName: string;
  bloodGroup: string;
  contactNumber: string;
  department?: string;
  acceptedAt: any;
}
