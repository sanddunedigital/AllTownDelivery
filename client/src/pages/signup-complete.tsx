import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/supabase';
import { apiRequest } from '@/lib/queryClient';

export default function SignupComplete() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Get email from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, []);

  // Check verification status on mount
  useEffect(() => {
    const checkVerification = async () => {
      try {
        const { session } = await auth.getSession();
        if (session?.user?.email_confirmed_at) {
          setIsVerified(true);
        }
      } catch (error) {
        console.error('Error checking verification:', error);
      } finally {
        setIsChecking(false);
      }
    };

    // Check immediately and then set up listener
    checkVerification();

    // Listen for auth state changes
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user?.email_confirmed_at) {
        setIsVerified(true);
        setIsChecking(false);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Complete tenant creation mutation
  const completeTenantMutation = useMutation({
    mutationFn: async () => {
      const { session } = await auth.getSession();
      if (!session?.user) {
        throw new Error('User not authenticated');
      }

      // Get signup data from localStorage
      const signupData = localStorage.getItem('pendingSignupData');
      if (!signupData) {
        throw new Error('Signup data not found. Please start the signup process again.');
      }

      const parsedData = JSON.parse(signupData);
      
      // Create tenant with verified user
      const response = await apiRequest('POST', '/api/tenants/signup-verified', {
        ...parsedData,
        userId: session.user.id,
        email: session.user.email,
        emailVerified: true
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create tenant');
      }

      return await response.json();
    },
    onSuccess: (response) => {
      // Clear signup data
      localStorage.removeItem('pendingSignupData');
      
      toast({
        title: 'Account Created Successfully!',
        description: `Your delivery service "${response.businessName}" is now active.`,
      });

      // Redirect to tenant subdomain
      setTimeout(() => {
        window.location.href = `https://${response.subdomain}.alltowndelivery.com`;
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: 'Account Creation Failed',
        description: error.message || 'Failed to complete account setup. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleCompleteTenant = () => {
    completeTenantMutation.mutate();
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <Loader2 className="w-16 h-16 text-blue-500 mx-auto animate-spin mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Checking Verification Status</h2>
          <p className="text-gray-600">Please wait while we verify your email...</p>
        </div>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Not Verified</h2>
          <p className="text-gray-600 mb-4">
            Your email address has not been verified yet. Please check your email and click the verification link.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Email: <strong>{email}</strong>
          </p>
          <Button
            onClick={() => setLocation('/signup')}
            variant="outline"
            className="w-full"
          >
            Back to Signup
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
        <p className="text-gray-600 mb-6">
          Your email has been successfully verified. Click below to complete your account setup.
        </p>
        
        {completeTenantMutation.isSuccess ? (
          <div className="text-center">
            <p className="text-green-600 font-medium mb-4">
              Account created successfully! Redirecting to your delivery service...
            </p>
            <Loader2 className="w-6 h-6 text-blue-500 mx-auto animate-spin" />
          </div>
        ) : (
          <Button
            onClick={handleCompleteTenant}
            disabled={completeTenantMutation.isPending}
            className="w-full"
          >
            {completeTenantMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Account...
              </>
            ) : (
              'Complete Account Setup'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}