import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, AlertCircle, Loader2, Truck, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { supabase } from '@/lib/supabase';
import { Link } from 'wouter';

export default function SignupComplete() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [verificationState, setVerificationState] = useState<'processing' | 'success' | 'error'>('processing');
  const [tenantData, setTenantData] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Complete signup mutation - processes business data from Supabase user metadata
  const completeSignupMutation = useMutation({
    mutationFn: async ({ userId, businessData }: { userId: string, businessData: any }) => {
      const response = await apiRequest('/api/tenants/create-from-auth', 'POST', { 
        userId, 
        businessData 
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to complete signup');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      setTenantData(data);
      setVerificationState('success');
      toast({
        title: 'Account Created Successfully!',
        description: `Your delivery service is now live at ${data.subdomain}.alltowndelivery.com`,
      });
    },
    onError: (error: any) => {
      console.error('Signup completion error:', error);
      setErrorMessage(error.message || 'Failed to complete account setup');
      setVerificationState('error');
    },
  });

  useEffect(() => {
    const handleSignupCompletion = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const directSignup = urlParams.get('direct');
        const subdomain = urlParams.get('subdomain');
        const username = urlParams.get('username');
        const customToken = urlParams.get('token');
        
        console.log('Signup complete page loaded. URL params:', window.location.search);
        
        // If this is a direct signup (no email verification needed), show success immediately
        if (directSignup === 'true' && subdomain && username) {
          console.log('Using direct signup flow - no email verification needed');
          const businessName = urlParams.get('businessName') || 'Your Business';
          setTenantData({
            subdomain: subdomain,
            username: username,
            businessName: businessName,
            tenantId: 'direct-signup'
          });
          setVerificationState('success');
          toast({
            title: 'Account Created Successfully!',
            description: `Your delivery service is now live at ${subdomain}.alltowndelivery.com`,
          });
          return;
        }
        
        // Legacy flow: If we have our custom verification token, use the original flow
        if (customToken) {
          console.log('Using custom token verification flow');
          const response = await apiRequest('/api/verify-email', 'POST', { 
            token: customToken 
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            setErrorMessage(errorData.message || 'Email verification failed');
            setVerificationState('error');
            return;
          }
          
          const data = await response.json();
          setTenantData(data);
          setVerificationState('success');
          toast({
            title: 'Account Created Successfully!',
            description: `Your delivery service is now live at ${data.subdomain}.alltowndelivery.com`,
          });
          return;
        }
        
        // Legacy flow: Try the Supabase-based flow
        console.log('Using Supabase auth verification flow');
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          setErrorMessage('Please verify your email to complete your account setup.');
          setVerificationState('error');
          return;
        }

        // Check if user has business signup data in their metadata
        const businessData = user.user_metadata?.businessData;
        if (!businessData || user.user_metadata?.signupType !== 'business') {
          setErrorMessage('Invalid signup data. Please try signing up again.');
          setVerificationState('error');
          return;
        }

        // Complete the business account creation - pass business data directly
        completeSignupMutation.mutate({ 
          userId: user.id,
          businessData: businessData
        });

      } catch (error) {
        console.error('Error handling signup completion:', error);
        setErrorMessage('An unexpected error occurred.');
        setVerificationState('error');
      }
    };

    handleSignupCompletion();
  }, []);

  if (verificationState === 'processing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <Loader2 className="w-16 h-16 text-blue-500 mx-auto animate-spin" />
              <h2 className="text-2xl font-bold text-gray-900">Setting Up Your Account</h2>
              <p className="text-gray-600">
                We're completing your delivery service setup. This will just take a moment...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (verificationState === 'success' && tenantData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold text-gray-900">Welcome to AllTownDelivery!</h2>
              <p className="text-gray-600">
                Your account has been created and your 30-day free trial has started. 
                Your delivery service is ready to configure!
              </p>
              
              <div className="bg-green-50 p-6 rounded-lg space-y-4">
                <div className="flex items-start space-x-3">
                  <Truck className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-green-900">
                      Your delivery service is now live:
                    </p>
                    <p className="text-green-700 font-semibold break-all">
                      {tenantData.subdomain}.alltowndelivery.com
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-green-900">
                      Business Name:
                    </p>
                    <p className="text-green-700 font-semibold">
                      {tenantData.businessName}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>What's Next:</strong>
                </p>
                <ul className="text-sm text-blue-800 mt-2 space-y-1 text-left">
                  <li>• Configure your business settings and service areas</li>
                  <li>• Add your first delivery locations and pricing</li>
                  <li>• Start accepting delivery requests from customers</li>
                  <li>• Track deliveries in real-time with your dispatch center</li>
                </ul>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="text-sm text-blue-800 font-medium">
                  <strong>Admin Access:</strong>
                </p>
                <p className="text-sm text-blue-800 mt-1">
                  You can log into your delivery management dashboard using your username: <strong>{tenantData.username}</strong>
                </p>
                <p className="text-sm text-blue-600 mt-2">
                  Use the password you created during signup to access admin features and configure your delivery service.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  onClick={() => window.location.href = `https://${tenantData.subdomain}.alltowndelivery.com/admin-setup`}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  Setup Admin Access
                </Button>
                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Visit AllTownDelivery
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">Setup Incomplete</h2>
            <p className="text-gray-600">
              There was a problem completing your account setup.
            </p>
            
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
              <p className="text-sm text-red-800 font-medium">Error:</p>
              <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>What you can do:</strong>
              </p>
              <ul className="text-sm text-yellow-800 mt-2 space-y-1 text-left">
                <li>• Try signing up again with a different email</li>
                <li>• Check that you used the correct verification link</li>
                <li>• Contact support if the problem persists</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/signup" className="flex-1">
                <Button className="w-full">
                  Try Again
                </Button>
              </Link>
              <Link href="/business-join" className="flex-1">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Business Page
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}