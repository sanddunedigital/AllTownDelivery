import { useEffect } from 'react';
import { useLocation } from 'wouter';

// This component handles password reset redirects from old domains
export default function DomainRedirectPage() {
  const [, navigate] = useLocation();

  useEffect(() => {
    // Extract the hash from the URL which contains the reset token
    const hash = window.location.hash;
    
    if (hash && hash.includes('access_token') && hash.includes('type=recovery')) {
      // Redirect to the reset password page with the same hash
      navigate(`/reset-password${hash}`);
    } else {
      // If no valid reset token, redirect to home
      navigate('/');
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
}