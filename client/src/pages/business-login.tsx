import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const businessLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type BusinessLoginForm = z.infer<typeof businessLoginSchema>;

export default function BusinessLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loginError, setLoginError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [needsSignup, setNeedsSignup] = useState(false);
  const { user } = useAuth();

  const form = useForm<BusinessLoginForm>({
    resolver: zodResolver(businessLoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // If user is already authenticated, redirect to admin
  if (user) {
    setLocation('/admin');
    return null;
  }

  const handleSignIn = async (data: BusinessLoginForm) => {
    setIsLoading(true);
    setLoginError('');

    try {
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setNeedsSignup(true);
          setLoginError('No account found. Please sign up first or check your email/password.');
        } else {
          setLoginError(error.message);
        }
        return;
      }

      if (authData.user) {
        toast({
          title: "Login successful",
          description: "Welcome back to your admin dashboard!",
        });
        setLocation('/admin');
      }

    } catch (error: any) {
      setLoginError(error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (data: BusinessLoginForm) => {
    setIsLoading(true);
    setLoginError('');

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (error) {
        setLoginError(error.message);
        return;
      }

      if (authData.user) {
        toast({
          title: "Account created!",
          description: "Please check your email to verify your account.",
        });
        setNeedsSignup(false);
      }

    } catch (error: any) {
      setLoginError(error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (data: BusinessLoginForm) => {
    if (needsSignup) {
      handleSignUp(data);
    } else {
      handleSignIn(data);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          {needsSignup ? 'Create Admin Account' : 'Business Login'}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          {needsSignup 
            ? 'Create your admin account to access your dashboard'
            : 'Sign in to your delivery business admin dashboard'
          }
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>{needsSignup ? 'Create Account' : 'Sign In'}</CardTitle>
            <CardDescription>
              {needsSignup 
                ? 'Enter your email and create a password'
                : 'Enter your business email and password'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {loginError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start">
                  <AlertCircle className="h-5 w-5 text-red-400 mr-3 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">Login Failed</p>
                    <p className="text-sm text-red-700 mt-1">{loginError}</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    data-testid="input-email"
                    type="email"
                    autoComplete="email"
                    {...form.register('email')}
                    className="mt-1"
                  />
                  {form.formState.errors.email && (
                    <p className="mt-2 text-sm text-red-600">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    data-testid="input-password"
                    type="password"
                    autoComplete="current-password"
                    {...form.register('password')}
                    className="mt-1"
                  />
                  {form.formState.errors.password && (
                    <p className="mt-2 text-sm text-red-600">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>
              </div>

              <Button
                type="submit"
                data-testid="button-login"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading 
                  ? (needsSignup ? 'Creating Account...' : 'Signing in...') 
                  : (needsSignup ? 'Create Account' : 'Sign In')
                }
              </Button>
              
              <div className="flex flex-col gap-2">
                {!needsSignup && (
                  <Button 
                    type="button"
                    variant="outline"
                    className="w-full" 
                    onClick={() => setNeedsSignup(true)}
                  >
                    Need to create an account? Sign Up
                  </Button>
                )}
                
                {needsSignup && (
                  <Button 
                    type="button"
                    variant="outline"
                    className="w-full" 
                    onClick={() => setNeedsSignup(false)}
                  >
                    Already have an account? Sign In
                  </Button>
                )}
              </div>
            </form>

            <div className="mt-6">
              <div className="text-center text-sm">
                <span className="text-gray-600">Customer login? </span>
                <button
                  type="button"
                  onClick={() => setLocation('/auth')}
                  className="font-medium text-blue-600 hover:text-blue-500"
                  data-testid="link-customer-login"
                >
                  Click here
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}