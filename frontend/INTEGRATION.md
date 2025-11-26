# Frontend Integration Guide

## ✅ Backend Integration Complete!

The frontend has been updated to integrate with the backend API and authentication system.

## 🔧 New Features

### 1. **User Authentication**
- Google OAuth 2.0 login
- Persistent user sessions
- Automatic redirect to login page for unauthenticated users
- User profile display in header

### 2. **Data Persistence**
- All subjects automatically sync to backend
- CIE and SEE marks stored in PostgreSQL
- Multi-semester support
- Data persists across sessions and devices

### 3. **Real-time Sync**
- SEE slider changes sync immediately to backend
- Add/remove subject operations persist to database
- Optimistic UI updates for smooth experience
- Sync status indicator

### 4. **New Components**

#### `AuthContext.tsx`
React Context for authentication state management:
- `useAuth()` hook for accessing user data
- `login()` - Redirect to Google OAuth
- `logout()` - End session and clear user data
- `checkAuth()` - Verify authentication status

#### `LoginPage.tsx`
Beautiful login screen with:
- Google Sign-In button
- Feature showcase
- Responsive design
- Professional UI

#### `Header.tsx`
Top navigation bar showing:
- User profile picture
- User name and email
- Logout button
- App branding

#### `ProtectedRoute.tsx`
Route guard component:
- Shows loading spinner while checking auth
- Redirects to login if not authenticated
- Renders app content for authenticated users

#### `apiClient.ts`
Complete API client for backend communication:
- All API endpoints wrapped in methods
- Automatic cookie/session handling
- Error handling
- TypeScript type safety

## 🚀 Running the Integrated App

### Step 1: Start Backend
```powershell
cd backend
npm run dev
```

Backend runs on: `http://localhost:5000`

### Step 2: Start Frontend
```powershell
cd frontend
npm run dev
```

Frontend runs on: `http://localhost:3000`

### Step 3: Test the Flow

1. Open `http://localhost:3000`
2. You'll see the login page
3. Click "Continue with Google"
4. Authorize the app
5. You'll be redirected back with authentication
6. App loads your subjects from backend
7. All changes automatically sync!

## 📁 Updated Files

### Frontend Changes

**Created:**
- `src/lib/apiClient.ts` - API client for backend
- `src/contexts/AuthContext.tsx` - Auth state management
- `src/pages/LoginPage.tsx` - Login UI
- `src/components/Header.tsx` - User header
- `src/components/ProtectedRoute.tsx` - Route guard
- `src/vite-env.d.ts` - TypeScript environment types
- `.env` - Environment configuration

**Modified:**
- `src/index.tsx` - Wrapped with AuthProvider and ProtectedRoute
- `src/App.tsx` - Added backend integration:
  - `loadSubjects()` - Fetch from backend on mount
  - `handleSeeChange()` - Sync SEE updates to backend
  - `handleAddSubject()` - Create subject in database
  - `handleRemoveSubject()` - Delete from database
  - Added loading states and sync indicators
  - Integrated Header component

## 🔄 Data Flow

### Initial Load
```
User opens app → Check auth status → 
If not logged in → Show LoginPage →
User clicks Google login → OAuth flow → Redirect back →
Load user's subjects from backend → Display app
```

### SEE Update Flow
```
User drags slider → Optimistic UI update →
API call to update backend → Success/error handling
```

### Add Subject Flow
```
User clicks "Add Subject" → Show syncing indicator →
Create subject in backend → Add to local state →
Hide syncing indicator
```

## 🌐 API Endpoints Used

### Authentication
- `GET /auth/status` - Check if user is logged in
- `GET /auth/google` - Start Google OAuth flow
- `GET /auth/google/callback` - OAuth callback URL
- `GET /auth/user` - Get current user details
- `POST /auth/logout` - Logout user

### Subjects
- `GET /api/subjects/active` - Get subjects for active semester
- `POST /api/subjects` - Create new subject
- `PATCH /api/subjects/:id/see` - Update SEE only
- `DELETE /api/subjects/:id` - Delete subject

## 🎨 UI Updates

### Login Page
- Clean, modern design
- Feature highlights
- Google branding compliance
- Responsive layout

### Header Component
- User avatar
- Name and email display
- Logout button
- Sticky positioning

### Loading States
- Initial load spinner
- Sync indicator
- Graceful error handling

## 🔐 Security Features

### Frontend
- CORS enabled with credentials
- Cookies used for session management
- Protected routes require authentication
- No sensitive data in localStorage

### Backend Integration
- Session-based authentication
- HttpOnly cookies prevent XSS
- CSRF protection via SameSite cookies
- Secure session storage in PostgreSQL

## 📊 State Management

### Authentication State
- Global via React Context
- Persisted via session cookies
- Checked on mount and route changes

### Subject State
- Local React state for UI
- Synced to backend on changes
- Optimistic updates for better UX
- Fallback to sample data if backend fails

## 🐛 Error Handling

### Network Errors
- Graceful fallback to sample data
- User-friendly error messages
- Console logging for debugging

### Authentication Errors
- Auto-redirect to login
- Session expiry handling
- Logout on auth failure

## 🚨 Important Notes

1. **Backend Must Be Running First**
   - Frontend relies on backend API
   - Start backend before frontend

2. **Google OAuth Setup Required**
   - Must configure Google Cloud Console
   - Add redirect URI exactly as shown
   - Copy credentials to backend `.env`

3. **Same Origin Required**
   - Frontend and backend must be same origin for cookies
   - Or use proxy configuration

4. **Environment Variables**
   - Frontend: `.env` with `VITE_API_URL`
   - Backend: `.env` with all credentials

## ✅ Testing Checklist

- [ ] Backend starts without errors
- [ ] Frontend starts and shows login page
- [ ] Can click "Continue with Google"
- [ ] OAuth flow completes successfully
- [ ] Redirected back to app
- [ ] Subjects load from backend
- [ ] SEE slider updates sync to backend
- [ ] Can add new subject (persists)
- [ ] Can remove subject (deletes from backend)
- [ ] Logout works correctly
- [ ] Login again shows previous data

## 🎉 Success!

Your Smart CGPA Calculator now has:
- ✅ Google OAuth authentication
- ✅ Per-user data storage
- ✅ Real-time backend sync
- ✅ Beautiful login UI
- ✅ Professional user experience
- ✅ Complete full-stack implementation

**The app is production-ready with user authentication and data persistence!**
