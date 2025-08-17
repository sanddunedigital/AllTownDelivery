import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { combinedBusinessSignupSchema } from '@shared/schema';
// No crypto import needed on client side
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { z } from 'zod';
import { 
  Building2,
  ArrowRight,
  Check,
  Star,
  Truck,
  Users,
  Clock,
  Shield,
  Phone,
  Mail,
  MapPin,
  Eye,
  EyeOff
} from 'lucide-react';
import { Link } from 'wouter';

type FormData = z.infer<typeof combinedBusinessSignupSchema>;

export default function BusinessJoin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(combinedBusinessSignupSchema),
    defaultValues: {
      businessName: 'Delivery Service 1',
      businessType: 'Multi-Service Delivery',
      ownerName: 'Nick Browser',
      email: 'nick.houser421@gmail.com',
      phone: '6415551234',
      businessAddress: '1004 Main St',
      city: 'Oskaloosa',
      state: 'Ia',
      zipCode: '52577',
      serviceArea: 'Oskaloosa area',
      currentDeliveryVolume: '1-10 deliveries per day',
      description: 'Super cool delivery service',
      adminPassword: 'Password1',
      confirmPassword: 'Password1',
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest('/api/signup/direct', 'POST', data);
      return response.json();
    },
    onSuccess: (data) => {
      // Redirect directly to success page since account is created immediately
      const subdomain = data.subdomain;
      const username = data.username;
      const businessName = form.getValues('businessName');
      const params = new URLSearchParams({
        subdomain: subdomain,
        username: username,
        businessName: businessName,
        direct: 'true'
      });
      setLocation(`/signup-complete?${params.toString()}`);
    },
    onError: (error: any) => {
      toast({
        title: "Signup Failed",
        description: error.message || "There was an error creating your account. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    signupMutation.mutate(data);
  };

  const plans = [
    {
      name: 'Starter',
      price: '$29',
      period: '/month',
      description: 'Perfect for small delivery services',
      features: [
        'Up to 100 deliveries/month',
        'Basic customer portal',
        'SMS notifications',
        'Basic analytics',
        'Email support'
      ],
      color: 'bg-blue-50 border-blue-200',
      popular: false
    },
    {
      name: 'Professional',
      price: '$79',
      period: '/month',
      description: 'Most popular for growing businesses',
      features: [
        'Up to 500 deliveries/month',
        'Full customer portal with tracking',
        'Driver mobile app',
        'Advanced analytics & reporting',
        'Phone & email support',
        'Custom branding',
        'Loyalty program features'
      ],
      color: 'bg-orange-50 border-orange-200',
      popular: true
    },
    {
      name: 'Enterprise',
      price: '$149',
      period: '/month',
      description: 'For established delivery operations',
      features: [
        'Unlimited deliveries',
        'White-label solution',
        'API access',
        'Custom integrations',
        'Priority support',
        'Custom subdomain',
        'Advanced customer management',
        'Multi-location support'
      ],
      color: 'bg-purple-50 border-purple-200',
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-2">
            <div className="bg-gradient-to-r from-blue-600 to-orange-500 text-white rounded-lg p-2">
              <Truck className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold text-gray-900">AllTownDelivery</span>
          </Link>
          <Link href="/auth" className="text-blue-600 hover:text-blue-700 font-medium">
            Already have an account? Sign in
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Start Your Delivery Business
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Join AllTownDelivery and get your own branded delivery platform with everything you need to manage and grow your delivery service.
          </p>
        </div>

        {/* Pricing Plans */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {plans.map((plan, index) => (
            <Card key={index} className={`${plan.color} relative ${plan.popular ? 'ring-2 ring-orange-500' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-orange-500 text-white px-3 py-1">Most Popular</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="flex items-baseline">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-gray-600 ml-1">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center">
                      <Check className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sign Up Form */}
        <Card className="max-w-4xl mx-auto bg-white shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Create Your Delivery Business Account</CardTitle>
            <CardDescription className="text-center">
              Set up your business information and admin access in one step. We'll create your custom subdomain and get you started with a 30-day free trial.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                {/* Business Information Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Business Information</h3>
                  
                  <FormField
                    control={form.control}
                    name="businessName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Name</FormLabel>
                        <FormControl>
                          <Input  {...field} data-testid="input-business-name" />
                        </FormControl>
                        <FormDescription>
                          This is how your business will appear to customers on your delivery site.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-business-type">
                              <SelectValue placeholder="Select your business type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Multi-Service Delivery">Multi-Service Delivery</SelectItem>
                            <SelectItem value="Restaurant Delivery Only">Restaurant Delivery Only</SelectItem>
                            <SelectItem value="Grocery Delivery">Grocery Delivery</SelectItem>
                            <SelectItem value="Pharmacy Delivery">Pharmacy Delivery</SelectItem>
                            <SelectItem value="Package Delivery">Package Delivery</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="ownerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Owner Name</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-owner-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} data-testid="input-email" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input  {...field} data-testid="input-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Address</FormLabel>
                        <FormControl>
                          <Input {...field} data-testid="input-business-address" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid md:grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-city" />
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
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-state" />
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
                          <FormLabel>ZIP Code</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-zip-code" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="serviceArea"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Service Area</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Greater Chicago Area, Downtown Austin, Manhattan" {...field} data-testid="input-service-area" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="currentDeliveryVolume"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Delivery Volume</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-delivery-volume">
                                <SelectValue placeholder="Select volume" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Just starting out">Just starting out</SelectItem>
                              <SelectItem value="1-10 deliveries per day">1-10 deliveries per day</SelectItem>
                              <SelectItem value="11-25 deliveries per day">11-25 deliveries per day</SelectItem>
                              <SelectItem value="26-50 deliveries per day">26-50 deliveries per day</SelectItem>
                              <SelectItem value="50+ deliveries per day">50+ deliveries per day</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Business Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="e.g. Fast, reliable delivery service specializing in restaurant and grocery deliveries. Same-day delivery available throughout the metro area."
                            {...field}
                            data-testid="textarea-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Admin Setup Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 border-b pb-2">Admin Access Setup</h3>
                  <p className="text-sm text-gray-600">
                    Create your admin login credentials for managing your delivery service.
                  </p>

                  <FormField
                    control={form.control}
                    name="adminUsername"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Admin Username</FormLabel>
                        <FormControl>
                          <Input
                            type="text"
                            data-testid="input-admin-username"
                            placeholder="Choose your admin username"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          This will be your login username for the admin dashboard
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="adminPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Admin Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showPassword ? "text" : "password"}
                                {...field}
                                data-testid="input-admin-password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                                data-testid="button-toggle-password"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input 
                                type={showConfirmPassword ? "text" : "password"}
                                {...field}
                                data-testid="input-confirm-password"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                data-testid="button-toggle-confirm-password"
                              >
                                {showConfirmPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full bg-gradient-to-r from-blue-600 to-orange-500 hover:from-blue-700 hover:to-orange-600"
                  disabled={signupMutation.isPending}
                  data-testid="button-create-account"
                >
                  {signupMutation.isPending ? (
                    <>Creating Your Account...</>
                  ) : (
                    <>
                      Create Your Delivery Business <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Features Section */}
        <div className="grid md:grid-cols-4 gap-6 mt-12">
          <div className="text-center">
            <div className="bg-blue-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
              <Star className="h-6 w-6 text-blue-600" />
            </div>
            <h3 className="font-semibold mb-2">Custom Branding</h3>
            <p className="text-sm text-gray-600">Your own subdomain and branding</p>
          </div>
          <div className="text-center">
            <div className="bg-orange-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
              <Users className="h-6 w-6 text-orange-600" />
            </div>
            <h3 className="font-semibold mb-2">Customer Portal</h3>
            <p className="text-sm text-gray-600">Easy ordering and tracking for customers</p>
          </div>
          <div className="text-center">
            <div className="bg-green-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
              <Clock className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="font-semibold mb-2">Real-time Tracking</h3>
            <p className="text-sm text-gray-600">Live delivery updates and notifications</p>
          </div>
          <div className="text-center">
            <div className="bg-purple-100 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="font-semibold mb-2">Secure Payments</h3>
            <p className="text-sm text-gray-600">Integrated payment processing</p>
          </div>
        </div>

        {/* Contact Section */}
        <div className="text-center mt-12 p-6 bg-white rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Need Help Getting Started?</h3>
          <div className="flex justify-center space-x-6 text-sm">
            <div className="flex items-center">
              <Phone className="h-4 w-4 text-blue-600 mr-2" />
              <span>(641) 673-0123</span>
            </div>
            <div className="flex items-center">
              <Mail className="h-4 w-4 text-blue-600 mr-2" />
              <span>support@alltowndelivery.com</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}