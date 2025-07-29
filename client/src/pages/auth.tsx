import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthForm } from '@/components/ui/auth-form';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, User } from 'lucide-react';

export default function AuthPage() {
  const { user, profile, loading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (user && profile) {
      // Get the return URL from URL params
      const urlParams = new URLSearchParams(window.location.search);
      const returnTo = urlParams.get('returnTo');
      
      if (returnTo) {
        // If there's a specific return URL, use that
        navigate(returnTo);
      } else {
        // Default redirect based on user role
        if (profile.role === 'driver') {
          navigate('/driver');
        } else {
          navigate('/');
        }
      }
    }
  }, [user, profile, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mb-4">
            <User className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Sign In</h1>
          <p className="text-gray-600 mt-2">Join Sara's Quickie Delivery for faster orders and loyalty rewards</p>
        </div>
        
        <AuthForm onSuccess={() => {
          // This will be handled by the useEffect above
        }} />
      </div>
    </div>
  );
}