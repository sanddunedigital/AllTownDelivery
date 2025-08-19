import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const businessLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type BusinessLoginForm = z.infer<typeof businessLoginSchema>;

export default function BusinessLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [loginError, setLoginError] = useState<string>("");

  const form = useForm<BusinessLoginForm>({
    resolver: zodResolver(businessLoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: BusinessLoginForm) => {
      const response = await apiRequest('/api/auth/business-login', 'POST', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Login successful",
        description: `Welcome back, ${data.user.name}!`,
      });
      
      // Redirect based on user role
      if (data.user.role === 'admin') {
        setLocation('/admin');
      } else if (data.user.role === 'driver') {
        setLocation('/driver');
      } else if (data.user.role === 'dispatcher') {
        setLocation('/dispatch');
      } else {
        setLocation('/');
      }
    },
    onError: (error: Error) => {
      setLoginError(error.message);
    },
  });

  const handleSubmit = (data: BusinessLoginForm) => {
    setLoginError('');
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
          Business Login
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Sign in to your business dashboard
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your business email and password
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
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? 'Signing in...' : 'Sign In'}
              </Button>
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