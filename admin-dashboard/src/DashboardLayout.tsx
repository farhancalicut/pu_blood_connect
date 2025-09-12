// In src/DashboardLayout.tsx

import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';

const styles = {
  layout: {
    display: 'flex',
    height: '100vh',
    fontFamily: 'sans-serif',
  },
  sidebar: {
    width: '240px',
    backgroundColor: '#1e293b', // A dark sidebar color
    color: 'white',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column' as 'column',
  },
  sidebarTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '30px',
  },
  navLink: {
    color: '#cbd5e1',
    textDecoration: 'none',
    fontSize: '18px',
    padding: '10px 0',
    marginBottom: '10px',
  },
  logoutButton: {
    marginTop: 'auto', // Pushes the button to the bottom
    height: '40px',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
  },
  mainContent: {
    flex: 1,
    padding: '40px',
    backgroundColor: '#f2f2f2ff', // A light background for the content
    overflowY: 'auto' as 'auto',
    color: '#1e293b',
  },
};

export default function DashboardLayout() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/'); // Navigate to login after logout
  };

  return (
    <div style={styles.layout}>
      <div style={styles.sidebar}>
        <h1 style={styles.sidebarTitle}>Admin Panel</h1>
        <Link to="/dashboard" style={styles.navLink}>Overview</Link>
        <Link to="/dashboard/users" style={styles.navLink}>Users</Link>
        <Link to="/dashboard/donations" style={styles.navLink}>Donations</Link>
        <Link to="/dashboard/feedbacks" style={styles.navLink}>Feedbacks</Link>
        <Link to="/dashboard/events" style={styles.navLink}>Events</Link> 
        <Link to="/dashboard/nss" style={styles.navLink}>NSS Management</Link>
        <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
      </div>

      <div style={styles.mainContent}>
        {/* This Outlet is where the child pages will be rendered */}
        <Outlet />
      </div>
    </div>
  );
}