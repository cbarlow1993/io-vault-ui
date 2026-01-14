import { Navigate } from '@tanstack/react-router';

/**
 * Login verify page - deprecated in Clerk-only mode.
 * This was used for better-auth email OTP verification.
 * Now redirects to login page since Clerk handles verification.
 */
export default function PageLoginVerify() {
  // In Clerk mode, verification is handled by Clerk's SignIn component
  return <Navigate to="/login" replace />;
}
