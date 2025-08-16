import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle, Settings, Shield, ArrowRight, Lock } from 'lucide-react';
import { useLocation } from 'wouter';

const adminSetupSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type AdminSetupFormData = z.infer<typeof adminSetupSchema>;

export default function AdminSetup() {
  const [step, setStep] = useState<'verify' | 'password' | 'complete'>('verify');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [businessInfo, setBusinessInfo] = useState<any>(null);

  const form = useForm<AdminSetupFormData>({
    resolver: zodResolver(adminSetupSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }
  });

  // Check if user is already an admin
  const { data: adminStatus } = useQuery({
    queryKey: ['/api/admin/status'],
    enabled: !!user
  });

  // Get business settings to show business info
  const { data: businessSettings } = useQuery({
    queryKey: ['/api/business-settings'],
    enabled: !!user
  });

  useEffect(() => {
    if (adminStatus?.isAdmin) {
      // User is already set up as admin, redirect to dashboard
      setStep('complete');
    }
  }, [adminStatus]);

  const setupPasswordMutation = useMutation({
    mutationFn: async (data: AdminSetupFormData) => {
      const response = await apiRequest('/api/admin/setup-password', 'POST', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to setup admin password');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      setBusinessInfo(data.businessInfo);
      setStep('complete');
      toast({
        title: 'Admin Access Configured!',
        description: 'You now have full admin access to your delivery management system.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Setup Failed',
        description: error.message || 'Failed to configure admin access.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: AdminSetupFormData) => {
    setupPasswordMutation.mutate(data);
  };

  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Shield className="w-8 h-8 text-blue-600" />
              <CardTitle className="text-2xl">Admin Account Setup</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-gray-600 mb-4">
                Welcome! You've successfully created your delivery service. Now let's set up your admin access to manage your business.
              </p>
              
              <div className="bg-blue-50 p-4 rounded-lg text-left">
                <h4 className="font-semibold text-blue-900 mb-2">Admin Access Includes:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Business settings and configuration</li>
                  <li>• Driver management and assignments</li>
                  <li>• Delivery tracking and dispatch center</li>
                  <li>• Customer management and support</li>
                  <li>• Analytics and financial reporting</li>
                </ul>
              </div>
            </div>

            <Button 
              onClick={() => setStep('password')}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Setup Admin Password
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'password') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <Lock className="w-8 h-8 text-blue-600" />
              <CardTitle className="text-2xl">Set Admin Password</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Supabase Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Enter the password from your email verification"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-sm text-gray-600">
                        This is the password you used when verifying your email
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Admin Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Create a secure password for admin access"
                          {...field}
                        />
                      </FormControl>
                      <p className="text-sm text-gray-600">
                        Must be 8+ characters with uppercase, lowercase, and number
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input 
                          type="password" 
                          placeholder="Confirm your new admin password"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    <strong>Important:</strong> This password will be used to access your delivery management dashboard, business settings, and admin features.
                  </p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={setupPasswordMutation.isPending}
                >
                  {setupPasswordMutation.isPending ? 'Setting Up...' : 'Complete Setup'}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Complete step
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">Admin Setup Complete!</h2>
            <p className="text-gray-600">
              Your admin account is now fully configured. You can manage your delivery service using your admin credentials.
            </p>
            
            {businessInfo && (
              <div className="bg-green-50 p-4 rounded-lg text-left">
                <h4 className="font-semibold text-green-900 mb-2">Your Business:</h4>
                <p className="text-green-800">
                  <strong>{businessInfo.businessName}</strong>
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Admin Email: {businessInfo.businessEmail}
                </p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Next Steps:</strong>
              </p>
              <ul className="text-sm text-blue-800 mt-2 space-y-1 text-left">
                <li>• Configure your business settings and service areas</li>
                <li>• Add delivery locations and pricing</li>
                <li>• Set up your dispatch center</li>
                <li>• Start accepting customer orders</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={() => setLocation('/business-settings')}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <Settings className="w-4 h-4 mr-2" />
                Configure Business Settings
              </Button>
              <Button 
                onClick={() => setLocation('/admin')}
                variant="outline" 
                className="w-full"
              >
                Go to Admin Dashboard
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}