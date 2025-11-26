import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';

// Temporarily bypass authentication for local testing
// To enable authentication, uncomment the lines below and comment out the simple render
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Full authentication version (requires backend setup):
// import { AuthProvider } from './contexts/AuthContext';
// import ProtectedRoute from './components/ProtectedRoute';
// ReactDOM.createRoot(document.getElementById('root')!).render(
//   <React.StrictMode>
//     <AuthProvider>
//       <ProtectedRoute>
//         <App />
//       </ProtectedRoute>
//     </AuthProvider>
//   </React.StrictMode>
// );
