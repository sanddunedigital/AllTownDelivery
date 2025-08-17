import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Clock, ArrowLeft, RefreshCw } from 'lucide-react';
import { Link } from 'wouter';

export default function SignupPending() {
  const [, setLocation] = useLocation();
  const [timeRemaining, setTimeRemaining] = useState('24:00:00');

  // Extract email and business name from URL params if available
  const urlParams = new URLSearchParams(window.location.search);
  const email = urlParams.get('email') || '';
  const businessName = urlParams.get('business') || 'your business';

  useEffect(() => {
    // Start countdown timer (24 hours)
    const startTime = Date.now();
    const endTime = startTime + (24 * 60 * 60 * 1000); // 24 hours from now

    const timer = setInterval(() => {
      const now = Date.now();
      const remaining = endTime - now;
      
      if (remaining <= 0) {
        setTimeRemaining('00:00:00');
        clearInterval(timer);
        return;
      }

      const hours = Math.floor(remaining / (60 * 60 * 1000));
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((remaining % (60 * 1000)) / 1000);
      
      setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleResendEmail = () => {
    // TODO: Implement resend functionality
    alert('Resend functionality coming soon!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Check Your Email
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            We've sent you a verification link to complete your business account setup
          </p>
        </div>

        {/* Main Card */}
        <Card className="shadow-xl border-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardHeader className="text-center space-y-4 pb-6">
            <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <Mail className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl text-gray-900 dark:text-white">
              Verification Email Sent
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Email Info */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Email sent to:
              </p>
              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                {email}
              </p>
              {businessName !== 'your business' && (
                <>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-3">
                    Business name:
                  </p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {businessName}
                  </p>
                </>
              )}
            </div>

            {/* Instructions */}
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Next steps:
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-gray-700 dark:text-gray-300">
                <li>Check your email inbox (and spam folder)</li>
                <li>Click the verification link in the email</li>
                <li>Complete your business account setup</li>
                <li>Start taking delivery orders!</li>
              </ol>
            </div>

            {/* Timer */}
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 space-y-2">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Verification link expires in:
                </p>
              </div>
              <p className="text-2xl font-mono font-bold text-amber-700 dark:text-amber-300">
                {timeRemaining}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={handleResendEmail}
                variant="outline" 
                className="flex-1 flex items-center justify-center space-x-2"
                data-testid="button-resend-email"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Resend Email</span>
              </Button>
              
              <Link href="/join" className="flex-1">
                <Button 
                  variant="ghost" 
                  className="w-full flex items-center justify-center space-x-2"
                  data-testid="button-back-signup"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Signup</span>
                </Button>
              </Link>
            </div>

            {/* Help Text */}
            <div className="text-center text-sm text-gray-500 dark:text-gray-400 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p>
                Didn't receive the email? Check your spam folder or{' '}
                <button 
                  onClick={handleResendEmail}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  request a new one
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}