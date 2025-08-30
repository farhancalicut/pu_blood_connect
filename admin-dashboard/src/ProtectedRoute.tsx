// In src/ProtectedRoute.tsx

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Navigate } from 'react-router-dom';
import { auth, db } from './firebase';

// This component takes another component as a "child"
export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // Use null to represent loading state

  useEffect(() => {
    // onAuthStateChanged is the best way to check for a user in real-time
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is logged in, now check if they are an admin
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setIsAdmin(true); // User is an admin
        } else {
          setIsAdmin(false); // User is not an admin
        }
      } else {
        // No user is logged in
        setIsAdmin(false);
      }
    });

    // Clean up the listener when the component unmounts
    return () => unsubscribe();
  }, []);

  // While we are checking, show a loading message (or a spinner)
  if (isAdmin === null) {
    return <div>Loading...</div>;
  }

  // If the user is an admin, show the child component (the Dashboard)
  // If not, redirect them to the login page
  return isAdmin ? <>{children}</> : <Navigate to="/" />;
}