// In src/Login.tsx

import React, { useState } from 'react';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase'; // Make sure this path is correct
import { useNavigate } from 'react-router-dom';

// A simple CSS style for the page
const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',       // Vertically center
    justifyContent: 'center',   // Horizontally center
    height: '100vh',            // Make the container take the full screen height
    fontFamily: 'sans-serif',
    backgroundColor: '#f0f2f5',
  },
  card: {
    padding: '40px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    display: 'flex',
    flexDirection: 'column' as 'column', // Added type assertion for safety
    width: '350px', // A slightly wider card
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '20px',
    textAlign: 'center' as 'center',
  },
  input: {
    height: '40px',
    marginBottom: '15px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    padding: '0 10px',
    fontSize: '16px',
  },
  button: {
    height: '40px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '16px',
    cursor: 'pointer',
    marginTop: '10px', // Added some space above the button
  },
};


export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists() && userDoc.data().role === 'admin') {
        // 👇 3. REPLACE THE ALERT WITH THIS NAVIGATION
        navigate('/dashboard'); 
      } else {
        setError('Access Denied. You are not an authorized admin.');
        await signOut(auth);
      }

    } catch (err) {
      setError('Failed to log in. Please check your credentials.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <form style={styles.card} onSubmit={handleLogin}>
        <h2 style={styles.title}>Admin Login</h2>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          style={styles.input}
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          style={styles.input}
          required
        />
        {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}
        <button type="submit" style={styles.button} disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}