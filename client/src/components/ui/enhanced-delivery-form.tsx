import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { insertDeliveryRequestGuestSchema, insertDeliveryRequestAuthenticatedSchema } from '@shared/schema';
import { Loader2, Gift, User, LogIn, Star, MapPin, Phone, Globe } from 'lucide-react';
import { z } from 'zod';

export function EnhancedDeliveryForm() {
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [loyaltyInfo, setLoyaltyInfo] = useState<any>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  
  // Fetch businesses
  const { data: businesses, isLoading: businessesLoading } = useQuery({
    queryKey: ['/api/businesses'],
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch business settings for pricing display
  const { data: businessSettings } = useQuery<any>({
    queryKey: ['/api/business-settings'],
    refetchInterval: 300000, // Refresh every 5 minutes
  });
  
  const schema = user ? insertDeliveryRequestAuthenticatedSchema : insertDeliveryRequestGuestSchema;
  
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      customerName: '',
      phone: '',
      email: '',
      businessId: '',
      pickupAddress: '',
      deliveryAddress: '',
      preferredDate: new Date().toISOString().split('T')[0], // Default to today's date
      preferredTime: '',
      paymentMethod: '',
      specialInstructions: '',
      saveProfile: false,
      useStoredPayment: false,
    },
  });

  // Load user profile data into form when available
  useEffect(() => {
    if (profile) {
      form.setValue('customerName', profile.fullName || '');
      form.setValue('phone', profile.phone || '');
      form.setValue('email', profile.email);
      form.setValue('pickupAddress', profile.defaultPickupAddress || '');
      form.setValue('deliveryAddress', profile.defaultDeliveryAddress || '');
      form.setValue('paymentMethod', profile.preferredPaymentMethod || '');
    }
  }, [profile, form]);

  // Handle business selection
  const handleBusinessSelect = (businessId: string) => {
    const business = (businesses as any[])?.find(b => b.id === businessId);
    setSelectedBusiness(business);
    if (business) {
      // Auto-fill pickup address when business is selected
      form.setValue('pickupAddress', business.address);
      form.setValue('businessId', businessId);
    }
  };

  // Fetch loyalty info for authenticated users (only if loyalty program is enabled)
  useEffect(() => {
    if (user && businessSettings?.features?.loyaltyProgram === true) {
      fetchLoyaltyInfo();
    } else if (businessSettings?.features?.loyaltyProgram === false) {
      // Clear loyalty info when loyalty program is disabled
      setLoyaltyInfo(null);
    }
  }, [user, businessSettings?.features?.loyaltyProgram]);

  const fetchLoyaltyInfo = async () => {
    if (!user || businessSettings?.features?.loyaltyProgram !== true) return;
    
    try {
      const response = await fetch(`/api/users/${user.id}/loyalty`);
      if (response.ok) {
        const loyalty = await response.json();
        setLoyaltyInfo(loyalty);
      }
    } catch (error) {
      console.error('Error fetching loyalty info:', error);
    }
  };

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    
    try {
      const requestData = {
        ...data,
        userId: user?.id || undefined,
      };

      const result = await apiRequest('/api/delivery-requests', 'POST', requestData);

      toast({
        title: "Success!",
        description: "Your delivery request has been submitted successfully. We'll contact you soon!",
      });

      // Reset only delivery-specific fields, preserve user profile data
      if (user && profile) {
        // Keep profile data, reset only delivery fields
        form.setValue('businessId', '');
        form.setValue('pickupAddress', profile.defaultPickupAddress || '');
        form.setValue('deliveryAddress', profile.defaultDeliveryAddress || '');
        form.setValue('preferredDate', new Date().toISOString().split('T')[0]); // Reset to today's date
        form.setValue('preferredTime', '');
        form.setValue('specialInstructions', '');
        form.setValue('saveProfile', false);
        form.setValue('useStoredPayment', false);
        setSelectedBusiness(null); // Clear business selection
      } else {
        // Guest user - full reset
        form.reset();
      }
      
      // Refresh loyalty info if user is authenticated and loyalty program is enabled
      if (user && businessSettings?.features?.loyaltyProgram === true) {
        fetchLoyaltyInfo();
      }

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit delivery request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }



  return (
    <div className="space-y-6">
      {/* Auth Status Banner */}
      {!user && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="bg-orange-500 p-2 rounded-full">
                  <Star className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-orange-900">Join Sara's Loyalty Program</h3>
                  <p className="text-sm text-orange-700">Sign up to earn rewards and get every 10th delivery free!</p>
                </div>
              </div>
              <Link href="/auth?returnTo=/">
                <Button size="sm">
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign Up / Sign In
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loyalty Status for Authenticated Users */}
      {user && loyaltyInfo && (
        <Card className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Gift className="h-5 w-5" />
                <div>
                  <h3 className="font-semibold">
                    Welcome back, {profile?.fullName || user.email}!
                  </h3>
                  <p className="text-sm text-orange-100">
                    {loyaltyInfo.freeDeliveryCredits > 0
                      ? `Congratulations! Your next delivery is free! 🎉`                   : `${loyaltyInfo.deliveriesUntilNextFree} more deliveries until your next free delivery`
                    }
                  </p>
                </div>
              </div>
              <Badge className="bg-white text-orange-600">
                {loyaltyInfo.totalDeliveries} deliveries
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delivery Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Request a Delivery
          </CardTitle>
          <CardDescription>
            Fill out the details below and we'll get your items delivered quickly!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Customer Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Customer Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="customerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your full name" {...field} />
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
                
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="your.email@example.com" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Delivery Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Delivery Details</h3>
                
                {/* Business Selection */}
                <FormField
                  control={form.control}
                  name="businessId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pickup Location *</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value);
                        handleBusinessSelect(value);
                      }} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a participating business" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {businessesLoading ? (
                            <SelectItem value="loading" disabled>
                              <div className="flex items-center">
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Loading businesses...
                              </div>
                            </SelectItem>
                          ) : (businesses as any[])?.map((business) => (
                            <SelectItem key={business.id} value={business.id}>
                              <div className="flex flex-col">
                                <div className="font-medium">{business.name}</div>
                                <div className="text-sm text-gray-500">{business.category}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Selected Business Info */}
                {selectedBusiness && (
                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="pt-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-medium">{selectedBusiness.address}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-blue-600" />
                          <span className="text-sm">{selectedBusiness.phone}</span>
                        </div>
                        {selectedBusiness.website && (
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-blue-600" />
                            <a href={selectedBusiness.website} target="_blank" rel="noopener noreferrer" 
                               className="text-sm text-blue-600 hover:underline">
                              {selectedBusiness.website}
                            </a>
                          </div>
                        )}
                        <div className="bg-white p-3 rounded border-l-4 border-l-orange-500">
                          <p className="text-sm font-medium text-gray-700">Ordering Instructions:</p>
                          <p className="text-sm text-gray-600 mt-1">{selectedBusiness.orderingInstructions}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Hidden pickup address field - auto-filled from business selection */}
                <FormField
                  control={form.control}
                  name="pickupAddress"
                  render={({ field }) => (
                    <FormItem className="hidden">
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="deliveryAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Delivery Address *</FormLabel>
                      <FormControl>
                        <Input placeholder="Where should we deliver your items?" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="preferredDate"
                    render={({ field }) => {
                      const scheduledDeliveriesEnabled = businessSettings?.features?.scheduledDeliveries === true;
                      const todayDate = new Date().toISOString().split('T')[0];
                      
                      // If scheduled deliveries are disabled, lock to today's date
                      if (!scheduledDeliveriesEnabled && field.value !== todayDate) {
                        field.onChange(todayDate);
                      }
                      
                      return (
                        <FormItem>
                          <FormLabel>Pick up Date *</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              min={todayDate}
                              disabled={!scheduledDeliveriesEnabled}
                              value={scheduledDeliveriesEnabled ? field.value : todayDate}
                              onChange={scheduledDeliveriesEnabled ? field.onChange : undefined}
                            />
                          </FormControl>
                          {!scheduledDeliveriesEnabled && (
                            <p className="text-sm text-muted-foreground">
                              Scheduled deliveries are not available. Orders can only be placed for today.
                            </p>
                          )}
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                  
                  <FormField
                    control={form.control}
                    name="preferredTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pick up Time *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select pickup time" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="morning">Morning (8AM - 12PM)</SelectItem>
                            <SelectItem value="afternoon">Afternoon (12PM - 5PM)</SelectItem>
                            <SelectItem value="evening">Evening (5PM - 8PM)</SelectItem>
                            <SelectItem value="anytime">Anytime</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Service Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Service Options</h3>
                
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="card">Credit/Debit Card</SelectItem>
                          <SelectItem value="venmo">Venmo</SelectItem>
                          <SelectItem value="paypal">PayPal</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Pricing Information */}
              {businessSettings?.deliveryPricing && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Delivery Pricing</h3>
                  <Card className="border-green-200 bg-green-50">
                    <CardContent className="pt-4">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center">
                          <span>Base delivery fee:</span>
                          <span className="font-semibold">${businessSettings.deliveryPricing.basePrice?.toFixed(2)}</span>
                        </div>
                        {businessSettings.deliveryPricing.pricePerMile > 0 && (
                          <div className="flex justify-between items-center text-gray-600">
                            <span>+ ${businessSettings.deliveryPricing.pricePerMile?.toFixed(2)} per mile</span>
                          </div>
                        )}

                        {loyaltyInfo?.freeDeliveryCredits > 0 && (
                          <div className="flex justify-between items-center text-blue-700 font-medium border-t pt-2">
                            <Gift className="w-4 h-4 mr-1 inline" />
                            <span>You have {loyaltyInfo.freeDeliveryCredits} free delivery credit{loyaltyInfo.freeDeliveryCredits > 1 ? 's' : ''}!</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Additional Information</h3>
                
                <FormField
                  control={form.control}
                  name="specialInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Instructions</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any special instructions for pickup or delivery..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* User Options */}
              {user && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Save Preferences</h3>
                  
                  <FormField
                    control={form.control}
                    name="saveProfile"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            Save delivery information to my profile
                          </FormLabel>
                          <p className="text-sm text-muted-foreground">
                            Save addresses and payment method for faster future orders
                          </p>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Delivery Request
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}