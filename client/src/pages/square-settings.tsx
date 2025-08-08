import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

const squareSettingsSchema = z.object({
  squareAccessToken: z.string().min(1, 'Square Access Token is required'),
  squareApplicationId: z.string().min(1, 'Square Application ID is required'),
  squareLocationId: z.string().min(1, 'Square Location ID is required'),
  squareEnvironment: z.enum(['sandbox', 'production']).default('sandbox'),
});

type SquareSettingsForm = z.infer<typeof squareSettingsSchema>;

export default function SquareSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<SquareSettingsForm>({
    resolver: zodResolver(squareSettingsSchema),
    defaultValues: {
      squareAccessToken: '',
      squareApplicationId: '',
      squareLocationId: '',
      squareEnvironment: 'sandbox',
    },
  });

  const onSubmit = async (data: SquareSettingsForm) => {
    setIsLoading(true);
    try {
      const response = await apiRequest('/api/admin/square-settings', 'POST', data);
      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Square Settings Updated',
          description: 'Your Square payment configuration has been saved successfully.',
        });
      } else {
        throw new Error(result.error || 'Failed to update Square settings');
      }
    } catch (error: any) {
      console.error('Square settings error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update Square settings',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Square Payment Setup</h1>
        <p className="text-muted-foreground">
          Configure Square payment processing for your delivery business. Each business needs their own Square account.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Square API Configuration</CardTitle>
          <CardDescription>
            Enter your Square API credentials from your Square Developer Dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="squareEnvironment">Environment</Label>
                <Select
                  value={form.watch('squareEnvironment')}
                  onValueChange={(value) => form.setValue('squareEnvironment', value as 'sandbox' | 'production')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select environment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sandbox">Sandbox (Testing)</SelectItem>
                    <SelectItem value="production">Production (Live)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Use Sandbox for testing, Production for live payments
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="squareAccessToken">Square Access Token</Label>
                <Input
                  id="squareAccessToken"
                  type="password"
                  placeholder="Enter your Square access token"
                  {...form.register('squareAccessToken')}
                />
                {form.formState.errors.squareAccessToken && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.squareAccessToken.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="squareApplicationId">Square Application ID</Label>
                <Input
                  id="squareApplicationId"
                  placeholder="Enter your Square application ID"
                  {...form.register('squareApplicationId')}
                />
                {form.formState.errors.squareApplicationId && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.squareApplicationId.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="squareLocationId">Square Location ID</Label>
                <Input
                  id="squareLocationId"
                  placeholder="Enter your Square location ID"
                  {...form.register('squareLocationId')}
                />
                {form.formState.errors.squareLocationId && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.squareLocationId.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Square Settings'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How to Get Your Square API Credentials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">1. Create a Square Developer Account</h4>
            <p className="text-sm text-muted-foreground">
              Visit <a href="https://developer.squareup.com/apps" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                https://developer.squareup.com/apps
              </a> and create a developer account.
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">2. Create a New Application</h4>
            <p className="text-sm text-muted-foreground">
              Click "Create Your First Application" and fill in your business details.
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium">3. Get Your Credentials</h4>
            <p className="text-sm text-muted-foreground">
              In your application dashboard, you'll find:
            </p>
            <ul className="list-disc list-inside text-sm text-muted-foreground ml-4">
              <li><strong>Access Token:</strong> Found in the "Credentials" tab</li>
              <li><strong>Application ID:</strong> Also in the "Credentials" tab</li>
              <li><strong>Location ID:</strong> Found in the "Locations" tab</li>
            </ul>
          </div>

          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Important:</strong> Start with Sandbox credentials for testing. 
              Switch to Production credentials only when you're ready to process real payments.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}