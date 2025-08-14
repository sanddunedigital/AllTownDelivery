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
import { supabase } from '@/lib/supabase';
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

  // Unified signup with Supabase auth + business data
  const initiateSignupMutation = useMutation({
    mutationFn: async (formData: SignupFormData) => {
      // Sign up with Supabase, including business data in user metadata
      const { data: authData, error } = await supabase.auth.signUp({
        email: formData.email,
        password: 'temp-password-' + Math.random().toString(36), // Temporary password
        options: {
          data: {
            businessData: formData, // Store all business info in user metadata
            signupType: 'business'
          },
          emailRedirectTo: `${window.location.origin}/signup-complete`
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      return { email: formData.email, authData };
    },
    onSuccess: (data) => {
      setUserEmail(data.email);
      toast({
        title: 'Verification Email Sent!',
        description: 'Please check your email and click the verification link to complete your business setup.',
      });
      setStep(4); // Go to email verification step
    },
    onError: (error: any) => {
      toast({
        title: 'Signup Failed',
        description: error.message || 'Failed to initiate signup. Please try again.',
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
      // Initiate signup process (email verification first)
      initiateSignupMutation.mutate(data);
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
        <Card className="w-full max-w-lg">
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              <Mail className="w-16 h-16 text-blue-500 mx-auto" />
              <h2 className="text-2xl font-bold text-gray-900">Check Your Email</h2>
              <p className="text-gray-600">
                We've sent a verification email to verify your account and complete the signup process.
              </p>
              
              <div className="bg-blue-50 p-6 rounded-lg text-left space-y-4">
                <div className="flex items-start space-x-3">
                  <ShieldCheck className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Email sent to:
                    </p>
                    <p className="text-blue-700 font-semibold break-all">
                      {userEmail}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Truck className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Your delivery service will be available at:
                    </p>
                    <p className="text-blue-700 font-semibold break-all">
                      {form.getValues('subdomain')}.alltowndelivery.com
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Next Steps:</strong>
                </p>
                <ol className="text-sm text-yellow-800 mt-2 space-y-1 text-left">
                  <li>1. Check your email inbox (and spam folder)</li>
                  <li>2. Click the verification link in the email</li>
                  <li>3. Complete your account setup</li>
                  <li>4. Start managing deliveries right away!</li>
                </ol>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/business-join" className="flex-1">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Business Page
                  </Button>
                </Link>
                <Link href="/" className="flex-1">
                  <Button className="w-full">
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
                      disabled={initiateSignupMutation.isPending}
                      className={step === 1 ? 'ml-auto' : ''}
                      onClick={(e) => {
                        console.log('Button clicked, current step:', step);
                        console.log('Form valid:', form.formState.isValid);
                        console.log('Form errors:', form.formState.errors);
                      }}
                    >
                      {step === 3
                        ? initiateSignupMutation.isPending
                          ? 'Sending Verification Email...'
                          : 'Continue'
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