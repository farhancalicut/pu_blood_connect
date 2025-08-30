// In src/main.tsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';

// Import your page components
import Login from './Login.tsx';
import DashboardLayout from './DashboardLayout.tsx';
import ProtectedRoute from './ProtectedRoute.tsx';
import Overview from './pages/Overview.tsx';
import Users from './pages/Users.tsx';
import Donations from './pages/Donations.tsx';
import Feedbacks from './pages/Feedbacks.tsx'; 
import Events from './pages/Events.tsx';
import EventForm from './pages/EventForm.tsx';

// Define the routes for your application
const router = createBrowserRouter([
  {
    path: '/',
    element: <Login />,
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    // 👇 These are the pages that will appear INSIDE the layout 👇
    children: [
      {
        index: true, // This makes Overview the default page for /dashboard
        element: <Overview />,
      },
      {
        path: 'users',
        element: <Users />,
      },
      {
        path: 'donations',
        element: <Donations />,
      },
      { path: 'feedbacks', element: <Feedbacks /> }, 
      { path: 'events', element: <Events /> },
      { path: 'events/new', element: <EventForm /> },  
      { path: 'events/edit/:eventId', element: <EventForm /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);