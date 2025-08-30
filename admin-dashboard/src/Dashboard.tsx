// In src/Dashboard.tsx

import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';

const styles = {
  container: {
    padding: '40px',
    fontFamily: 'sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
  },
  button: {
    height: '40px',
    padding: '0 20px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
  },
};

export default function Dashboard() {

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // This will reload the page, and our router will redirect to login
      window.location.href = '/'; 
    } catch (error) {
      console.error("Error signing out: ", error);
      alert("Failed to sign out.");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Admin Dashboard</h1>
        <button onClick={handleLogout} style={styles.button}>
          Logout
        </button>
      </div>
      <p>Welcome to the admin panel. Your charts and data will go here.</p>
    </div>
  );
}