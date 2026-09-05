/**
 * Maps Firebase Error Codes to user-friendly messages.
 */
export const getFirebaseErrorMessage = (error) => {
  if (!error || !error.code) return error?.message || 'An unexpected error occurred.';

  switch (error.code) {
    // Auth Errors
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please try again.';
    case 'auth/email-already-in-use':
      return 'This email is already registered. Try logging in instead.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/popup-closed-by-user':
      return 'Login cancelled. Please try again.';
      
    // Database Errors
    case 'permission-denied':
      return 'You do not have permission to perform this action.';
    case 'unavailable':
      return 'Database is temporarily unavailable. Please try again later.';
      
    default:
      return error.message || 'Something went wrong. Please try again.';
  }
};
