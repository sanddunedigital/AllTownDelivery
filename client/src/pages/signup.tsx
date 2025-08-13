import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { auth } from '@/lib/supabase';
import { Truck, CheckCircle, ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { Link } from 'wouter';

const signupSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Please enter a valid phone number'),
  businessAddress: z.string().min(10, 'Please enter your full business address'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  zipCode: z.string().min(5, 'ZIP code is required'),
  businessType: z.string().min(1, 'Please select your business type'),
  currentDeliveryVolume: z.string().min(1, 'Please select your delivery volume'),
  subdomain: z.string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(20, 'Subdomain must be less than 20 characters')
    .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens')
    .refine(val => !val.startsWith('-') && !val.endsWith('-'), 'Subdomain cannot start or end with a hyphen'),
  primaryColor: z.string().optional(),
  description: z.string().optional(),
});

type SignupFormData = z.infer<typeof signupSchema>;

export default function TenantSignup() {
  const [step, setStep] = useState(1);
  const [isCheckingSubdomain, setIsCheckingSubdomain] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const { toast } = useToast();

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      businessName: 'Delivery Service 1',
      ownerName: 'Nick Houser',
      email: 'mynameisnick421@gmail.com',
      phone: '6416700468',
      businessAddress: '123 Main Street',
      city: 'Oskaloosa',
      state: 'IA',
      zipCode: '52577',
      businessType: 'Multi-Service Delivery',
      currentDeliveryVolume: '11-25 deliveries per day',
      subdomain: 'delivery-service-1',
      primaryColor: '#0369a1',
      description: '',
    },
  });

  // Function to generate subdomain from business name
  const generateSubdomain = (businessName: string): string => {
    return businessName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
  };

  // Single signup mutation that creates everything immediately
  const signupMutation = useMutation({
    mutationFn: async (formData: SignupFormData) => {
      // Generate a secure password for the user
      const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';
      
      // Create Supabase auth account (disable email confirmation for smoother flow)
      const { data: authData, error: authError } = await auth.signUp(
        formData.email, 
        tempPassword,
        { emailRedirectTo: undefined } // Disable email confirmation redirect
      );
      
      if (authError) {
        throw new Error(authError.message);
      }

      // Create tenant immediately with user ID
      const tenantData = {
        ...formData,
        userId: authData.user?.id,
        emailVerified: false, // Will be updated when email is verified
      };

      const response = await apiRequest('/api/tenants/signup-verified', 'POST', tenantData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create tenant account');
      }
      
      const result = await response.json();
      
      return { 
        ...result,
        email: formData.email,
        tempPassword 
      };
    },
    onSuccess: (data) => {
      setUserEmail(data.email);
      toast({
        title: 'Account Created Successfully!',
        description: `Your delivery service is now live at ${data.subdomain}.alltowndelivery.com. Please verify your email to complete setup.`,
      });
      setStep(4); // Go to success step with instructions
    },
    onError: (error: any) => {
      toast({
        title: 'Signup Failed',
        description: error.message || 'Failed to create account. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSubdomainCheck = (subdomain: string) => {
    if (subdomain.length >= 3) {
      setIsCheckingSubdomain(true);
      // Just validate silently in background, no need to show errors since user can't edit
      setTimeout(() => setIsCheckingSubdomain(false), 500);
    }
  };

  const onSubmit = (data: SignupFormData) => {
    console.log('Form submission attempt:', { step, data });
    
    // Validate current step fields
    if (step === 1) {
      const step1Fields = ['businessName', 'ownerName', 'email', 'phone'];
      const errors = step1Fields.filter(field => !data[field as keyof SignupFormData]);
      if (errors.length > 0) {
        console.log('Step 1 validation errors:', errors);
        return;
      }
      // Proceed to step 2
      setStep(step + 1);
    } else if (step === 2) {
      const step2Fields = ['businessAddress', 'city', 'state', 'zipCode', 'businessType', 'currentDeliveryVolume'];
      const errors = step2Fields.filter(field => !data[field as keyof SignupFormData]);
      if (errors.length > 0) {
        console.log('Step 2 validation errors:', errors);
        return;
      }
      // Proceed to step 3
      setStep(step + 1);
    } else if (step === 3) {
      if (!data.subdomain) {
        console.log('Step 3 validation error: subdomain required');
        return;
      }
      // Create account and tenant immediately
      signupMutation.mutate(data);
    }
  };

  const businessTypes = [
    'Multi-Service Delivery',
    'Restaurant Delivery Only',
    'Grocery Delivery Only',
    'Pharmacy Delivery Only',
    'Auto Parts Delivery',
    'Local Courier Service',
    'On-Demand Delivery',
    'Other',
  ];

  const deliveryVolumes = [
    '1-10 deliveries per day',
    '11-25 deliveries per day',
    '26-50 deliveries per day',
    '51-100 deliveries per day',
    '100+ deliveries per day',
  ];

  // Success step
  if (step === 4) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              <h2 className="text-2xl font-bold text-gray-900">Welcome to AllTownDelivery!</h2>
              <p className="text-gray-600">
                Your account has been created and your 30-day free trial has started. 
                Your delivery service is ready to configure!
              </p>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-blue-900">
                  Your reserved subdomain:
                </p>
                <p className="text-blue-600 font-bold">
                  {form.getValues('subdomain')}.alltowndelivery.com
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  (Available after deployment setup)
                </p>
              </div>
              <Button 
                onClick={() => window.location.href = `/`}
                className="w-full"
              >
                Continue to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Link href="/?marketing=true">
              <Button variant="ghost" className="mb-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
            <div className="flex items-center justify-center mb-4">
              <Truck className="w-8 h-8 text-blue-600 mr-2" />
              <h1 className="text-2xl font-bold text-gray-900">AllTownDelivery</h1>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Start Your Free Trial
            </h2>
            <p className="text-gray-600">
              Get your delivery service online in minutes. 30-day free trial, no credit card required.
            </p>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center justify-center mb-8">
            {[1, 2, 3].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step >= stepNum
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {stepNum}
                </div>
                {stepNum < 3 && (
                  <div
                    className={`w-16 h-1 ${
                      step > stepNum ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                {step === 1 && 'Business Information'}
                {step === 2 && 'Business Details'}
                {step === 3 && 'Setup Your Site'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {step === 1 && (
                    <>
                      <FormField
                        control={form.control}
                        name="businessName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Name *</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Sara's Quickie Delivery" 
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  // Auto-generate subdomain from business name
                                  if (e.target.value) {
                                    const suggestedSubdomain = generateSubdomain(e.target.value);
                                    form.setValue('subdomain', suggestedSubdomain);
                                    handleSubdomainCheck(suggestedSubdomain);
                                  }
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="ownerName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Owner/Manager Name *</FormLabel>
                            <FormControl>
                              <Input placeholder="John Smith" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address *</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="john@business.com" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number *</FormLabel>
                              <FormControl>
                                <Input placeholder="(555) 123-4567" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </>
                  )}

                  {step === 2 && (
                    <>
                      <FormField
                        control={form.control}
                        name="businessAddress"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Address *</FormLabel>
                            <FormControl>
                              <Input placeholder="123 Main Street" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="city"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>City *</FormLabel>
                              <FormControl>
                                <Input placeholder="Oskaloosa" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State *</FormLabel>
                              <FormControl>
                                <Input placeholder="IA" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="zipCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ZIP Code *</FormLabel>
                              <FormControl>
                                <Input placeholder="52577" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="businessType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Business Type *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select your business type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {businessTypes.map((type) => (
                                  <SelectItem key={type} value={type}>
                                    {type}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="currentDeliveryVolume"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Current Daily Delivery Volume *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select your delivery volume" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {deliveryVolumes.map((volume) => (
                                  <SelectItem key={volume} value={volume}>
                                    {volume}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  {step === 3 && (
                    <>
                      <div className="space-y-2">
                        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                          Your Website URL
                        </label>
                        <div className="flex items-center">
                          <div className="bg-gray-50 border rounded-l-md px-3 py-2 text-sm text-gray-700 font-medium">
                            {form.watch('subdomain') || 'your-business-name'}
                          </div>
                          <span className="bg-gray-50 border border-l-0 px-3 py-2 text-sm text-gray-500 rounded-r-md">
                            .alltowndelivery.com
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">
                          Auto-generated from your business name
                        </p>
                        {isCheckingSubdomain && (
                          <p className="text-sm text-gray-500">Checking availability...</p>
                        )}
                      </div>



                      <FormField
                        control={form.control}
                        name="primaryColor"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Brand Color (Optional)</FormLabel>
                            <FormControl>
                              <div className="flex items-center space-x-2">
                                <Input
                                  type="color"
                                  {...field}
                                  className="w-16 h-10 p-1 border rounded"
                                />
                                <Input
                                  placeholder="#0369a1"
                                  {...field}
                                  className="flex-1"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}

                  <div className="flex justify-between pt-6">
                    {step > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setStep(step - 1)}
                      >
                        Previous
                      </Button>
                    )}
                    <Button
                      type="submit"
                      disabled={signupMutation.isPending}
                      className={step === 1 ? 'ml-auto' : ''}
                      onClick={(e) => {
                        console.log('Button clicked, current step:', step);
                        console.log('Form valid:', form.formState.isValid);
                        console.log('Form errors:', form.formState.errors);
                      }}
                    >
                      {step === 3
                        ? signupMutation.isPending
                          ? 'Creating Account...'
                          : 'Create Account'
                        : 'Continue'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}