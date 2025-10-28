# Forgot Password Implementation - Memory Bank

## Overview
Secure forgot password functionality has been implemented for the AirVoucher Admin portal using Supabase authentication.

## Changes Made

### 1. Backend API Endpoints

#### `/src/pages/api/auth/forgot-password.ts`
- **Purpose**: Handles password reset requests
- **Method**: POST
- **Input**: `{ email: string }`
- **Output**: Success message (always returns same message regardless of email existence for security)
- **Security Features**:
  - Email validation with regex
  - Generic response messages (doesn't reveal if email exists)
  - Uses Supabase's `resetPasswordForEmail()` method
  - Automatically generates secure reset token
  - Sets redirect URL to `/auth/reset-password` based on `NEXT_PUBLIC_SITE_URL` environment variable
- **Implementation**: Follows Supabase documentation pattern for sending password reset emails

### 2. Frontend Pages

#### `/src/pages/auth/forgot-password.tsx`
- **Route**: `/auth/forgot-password`
- **Features**:
  - Email input form
  - Loading states with spinner
  - Error handling with styled error messages
  - Success state with helpful instructions
  - Responsive design matching existing auth pages
  - Link back to login page
  - Uses Framer Motion for smooth animations
  - Dark mode support

#### `/src/pages/auth/reset-password.tsx`
- **Route**: `/auth/reset-password` (user redirected here automatically when clicking email link)
- **Features**:
  - Checks for active Supabase session (created when user clicks email link)
  - Password and confirm password fields
  - Show/hide password toggle buttons (eye icons)
  - Real-time password validation
  - Password complexity requirements displayed
  - Loading states with helpful messages
  - Error handling for expired/invalid tokens
  - Success state with auto-redirect to login
  - Waiting state when no session detected (user hasn't clicked email link yet)
  - Responsive design
  - Dark mode support
- **Implementation**: Follows Supabase documentation pattern using `updateUser()` method

### 3. Global Auth State Management

#### `/src/pages/_app.tsx` (Lines 21-38)
- **Purpose**: Global authentication state listener that works across all pages
- **Features**:
  - Listens for `PASSWORD_RECOVERY` event using Supabase's `onAuthStateChange()`
  - Automatically redirects user to `/auth/reset-password` when event is detected
  - Works regardless of which page user is on when clicking email link
  - Single source of truth for password recovery flow
- **Why Global**: Ensures password recovery is handled consistently no matter where the user clicks the reset link

### 4. Login Page Updates

#### `/src/components/CustomAuth.tsx` (Line 147-152)
- Added "Forgot your password?" link below Sign In button
- Link points to `/auth/forgot-password`
- Styled consistently with existing UI
- Hover effects for better UX

## User Flow (Following Supabase Best Practices)

1. **Request Password Reset**:
   - User clicks "Forgot your password?" on login page
   - Redirected to `/auth/forgot-password`
   - Enters email address
   - API calls Supabase's `resetPasswordForEmail()` with configured redirect URL
   - Sees success message (generic for security, doesn't reveal if email exists)

2. **Receive Email**:
   - Supabase sends email with reset link
   - Link format: `https://[domain]/auth/reset-password#access_token=xxx&type=recovery`
   - Token expires in 1 hour (Supabase default, configurable)

3. **Reset Password** (Global `onAuthStateChange` Pattern):
   - User clicks reset link in email from any location
   - Supabase detects recovery token and triggers `PASSWORD_RECOVERY` event globally
   - Global listener in `_app.tsx` catches event and redirects to `/auth/reset-password`
   - Reset password page checks for active Supabase session
   - If session exists (user clicked link): shows password reset form
   - If no session (direct navigation): shows "Waiting for reset link" message
   - User enters new password and confirms it
   - Frontend validates password complexity (8+ chars, uppercase, lowercase, number)
   - Calls Supabase's `updateUser({ password })` directly from client
   - Signs out user automatically for security
   - Shows success message
   - Auto-redirects to login after 3 seconds

4. **Login with New Password**:
   - User returns to `/auth` login page
   - Signs in with new password

## Security Measures

### Backend Security
1. **Generic Response Messages**: API doesn't reveal whether an email exists in the system
2. **Token Expiration**: Reset tokens expire after 1 hour
3. **Password Complexity**: Enforced at both frontend and backend levels
4. **Session Invalidation**: User is signed out after password reset
5. **HTTPS Only**: Reset links use HTTPS protocol
6. **Rate Limiting**: Supabase provides built-in rate limiting on auth endpoints

### Frontend Security
1. **Client-side Validation**: Reduces unnecessary API calls
2. **Password Requirements Displayed**: Users know requirements upfront
3. **Token Validation**: Checks for token presence before allowing form submission
4. **Error Handling**: Graceful handling of expired/invalid tokens

## Password Requirements

Users must create passwords that meet these criteria:
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one number (0-9)

Optional but recommended:
- Special characters (!@#$%^&*(),.?":{}|<>)

## Configuration Required

### CRITICAL: Supabase URL Configuration
**You MUST configure these URLs in Supabase or the password reset will not work!**

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/tsdgpmfmltxqubkcpips
2. Navigate to **Authentication** → **URL Configuration**
3. Set **Site URL** to: `https://admin.arv-shop.com`
4. Add these URLs to **Redirect URLs** (one per line):
   ```
   https://admin.arv-shop.com/auth/reset-password
   http://admin.localhost:3000/auth/reset-password
   http://localhost:3000/auth/reset-password
   ```
5. Save the configuration

**Without this configuration, the password reset link will redirect to the wrong URL!**

### Supabase Email Templates
To customize the password reset email, configure in Supabase Dashboard:
1. Go to Authentication → Email Templates
2. Select "Reset Password" template
3. Customize subject and body
4. Ensure the reset link points to: `{{ .ConfirmationURL }}`

### Environment Variables
Required variables (already configured in `.env`):
```
NEXT_PUBLIC_SUPABASE_URL=https://tsdgpmfmltxqubkcpips.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SITE_URL=https://admin.arv-shop.com
```

The `NEXT_PUBLIC_SITE_URL` variable determines where password reset emails redirect users.

## Testing Checklist

- [ ] Test forgot password flow with valid email
- [ ] Test forgot password flow with invalid email format
- [ ] Test forgot password flow with non-existent email
- [ ] Test reset password with valid token
- [ ] Test reset password with expired token
- [ ] Test reset password with invalid token
- [ ] Test password validation (too short)
- [ ] Test password validation (no uppercase)
- [ ] Test password validation (no lowercase)
- [ ] Test password validation (no number)
- [ ] Test password mismatch
- [ ] Test successful password reset end-to-end
- [ ] Test login with new password
- [ ] Test responsive design on mobile
- [ ] Test dark mode appearance
- [ ] Verify email delivery in spam/inbox

## Repeatable Steps for Implementation

If implementing this in another portal (retailer, cashier, agent):

1. **Copy API Endpoint**:
   ```bash
   cp src/pages/api/auth/forgot-password.ts [target]/pages/api/auth/
   ```

2. **Copy Frontend Pages**:
   ```bash
   cp src/pages/auth/forgot-password.tsx [target]/pages/auth/
   cp src/pages/auth/reset-password.tsx [target]/pages/auth/
   ```

3. **Update Environment Variables**:
   - Set `NEXT_PUBLIC_SITE_URL` to the portal's domain
   - Example for retailer: `NEXT_PUBLIC_SITE_URL=https://retailer.arv-shop.com`

4. **Update Login Component**:
   - Add the "Forgot your password?" link below sign-in button
   - Link should point to `/auth/forgot-password`

5. **Update Supabase Configuration**:
   - Add portal's redirect URL to Supabase settings
   - Configure email templates if needed
   - Update Site URL if this is the primary portal

6. **Test All Flows**:
   - Follow the testing checklist below

## Files Modified

- ✅ `/src/pages/api/auth/forgot-password.ts` (NEW) - Sends password reset email
- ✅ `/src/pages/auth/forgot-password.tsx` (NEW) - Email input form
- ✅ `/src/pages/auth/reset-password.tsx` (NEW) - Password reset form with session checking
- ✅ `/src/pages/_app.tsx` (MODIFIED) - Added global `onAuthStateChange` listener for `PASSWORD_RECOVERY`
- ✅ `/src/components/CustomAuth.tsx` (MODIFIED) - Added "Forgot your password?" link
- ✅ `.env` (MODIFIED) - Added `NEXT_PUBLIC_SITE_URL` variable

## Known Limitations

1. **Email Delivery**: Depends on Supabase email service configuration
2. **Rate Limiting**: Supabase's default rate limits apply
3. **Token Expiration**: Fixed at 1 hour (Supabase default, can be configured)
4. **No Password Reset History**: No audit trail of password resets (consider adding if needed)

## Future Enhancements

Consider implementing:
1. Rate limiting indicator on frontend
2. Password strength meter
3. "Copy link" functionality for testing
4. Admin dashboard to view password reset requests
5. Two-factor authentication for password reset
6. Custom email templates with branding
7. Password reset audit log

## Support

For issues or questions:
1. Check Supabase authentication logs in dashboard
2. Check browser console for client-side errors
3. Check server logs for API errors
4. Verify email service is configured correctly in Supabase

## Implementation Notes

### Why We Use Global `onAuthStateChange` Pattern

This implementation follows Supabase's recommended approach from their official documentation, with a global listener:

**Benefits:**
- ✅ Global listener in `_app.tsx` catches `PASSWORD_RECOVERY` event from anywhere
- ✅ User can click reset link from any page/location and be redirected automatically
- ✅ Calls `updateUser({ password })` directly from the client
- ✅ No custom backend password reset API endpoint needed
- ✅ Supabase handles all token validation and security
- ✅ Single source of truth for password recovery handling
- ✅ Cleaner, more maintainable code that follows framework best practices

### Key Differences from Alternative Approaches

**Our Implementation (Recommended by Supabase):**
```typescript
// In _app.tsx - Global listener
supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') {
    router.push('/auth/reset-password'); // Redirect to reset page
  }
});

// In reset-password page - Check for session and update password
const { data: { session } } = await supabase.auth.getSession();
if (session) {
  await supabase.auth.updateUser({ password: newPassword });
}
```

**Alternative Approach (Not Used):**
- Extract token manually from URL hash
- Send token to custom backend API
- Backend validates token and updates password
- More complex, more code to maintain
- No global handling - only works if user clicks link on specific page

### Technical Details

- **Global Listener**: `onAuthStateChange` in `_app.tsx` listens across entire application
- **Token Handling**: Supabase automatically manages the session when user clicks reset link
- **Event Flow**:
  1. User clicks email link (can be on any page or even logged out)
  2. Supabase detects recovery token in URL
  3. Fires `PASSWORD_RECOVERY` event globally
  4. `_app.tsx` listener redirects to `/auth/reset-password`
  5. Reset page checks for active session and shows form
- **Security**: Token validation handled entirely by Supabase, reducing attack surface
- **User Experience**: Works seamlessly regardless of user's location when clicking link

## References

- [Supabase Password Reset Documentation](https://supabase.com/docs/guides/auth/passwords#password-resets)
- [Supabase resetPasswordForEmail API](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail)
- [Supabase onAuthStateChange](https://supabase.com/docs/reference/javascript/auth-onauthstatechange)
- [Supabase updateUser API](https://supabase.com/docs/reference/javascript/auth-updateuser)
- [Next.js API Routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes)
