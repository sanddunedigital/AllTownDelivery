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
import { insertDeliveryRequestGuestSchema, insertDeliveryRequestAuthenticatedSchema, PREDEFINED_PAYMENT_METHODS } from '@shared/schema';
import { Loader2, Gift, User, LogIn, Star, MapPin, Phone, Globe } from 'lucide-react';
import { z } from 'zod';
import { AddressInput } from '@/components/AddressInput';
import { SimplePriceDisplay } from '@/components/SimplePriceDisplay';
import SquarePayment from '@/components/square-payment';

type FormStep = 'form' | 'review';

interface ReviewStepProps {
  formData: any;
  selectedBusiness: any;
  priceCalculation: any;
  loyaltyInfo: any;
  businessSettings: any;
  selectedPaymentMethod: string;
  setSelectedPaymentMethod: (method: string) => void;
  onBack: () => void;
  onSubmit: (isPaid?: boolean, paymentResult?: any) => void;
  submitting: boolean;
  user: any;
}

function ReviewStep({
  formData,
  selectedBusiness,
  priceCalculation,
  loyaltyInfo,
  businessSettings,
  selectedPaymentMethod,
  setSelectedPaymentMethod,
  onBack,
  onSubmit,
  submitting,
  user
}: ReviewStepProps) {
  const [showSquarePayment, setShowSquarePayment] = useState(false);
  
  // Get available payment methods from business settings
  const getAvailablePaymentMethods = () => {
    const acceptedMethods = businessSettings?.acceptedPaymentMethods || ['cash_on_delivery', 'card_on_delivery', 'online_payment'];
    
    return acceptedMethods.map((method: string) => {
      const predefined = PREDEFINED_PAYMENT_METHODS.find(p => p.value === method);
      return {
        value: method,
        label: predefined?.label || method.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
      };
    });
  };

  const handlePayNow = () => {
    if (selectedPaymentMethod === 'online_payment') {
      setShowSquarePayment(true);
    } else {
      onSubmit(false);
    }
  };

  const handleSquarePaymentSuccess = (result: any) => {
    setShowSquarePayment(false);
    onSubmit(true, result);
  };

  const handleSquarePaymentError = (error: string) => {
    setShowSquarePayment(false);
    console.error('Payment error:', error);
  };

  const total = priceCalculation?.total || 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Review Your Delivery Request</CardTitle>
              <CardDescription>
                Please review your details before submitting your request
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Customer Information */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Customer Information</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p><strong>Name:</strong> {formData?.fullName || formData?.customerName}</p>
                  <p><strong>Phone:</strong> {formData?.phone}</p>
                  <p><strong>Email:</strong> {formData?.email}</p>
                </div>
              </div>

              {/* Business & Delivery Details */}
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">Delivery Details</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p><strong>Business:</strong> {selectedBusiness?.name}</p>
                  <p><strong>Pickup Address:</strong> {formData?.pickupAddress}</p>
                  <p><strong>Delivery Address:</strong> {formData?.deliveryAddress}</p>
                  <p><strong>Date:</strong> {formData?.preferredDate}</p>
                  <p><strong>Time:</strong> {formData?.preferredTime || 'ASAP'}</p>
                  {formData?.specialInstructions && (
                    <p><strong>Special Instructions:</strong> {formData.specialInstructions}</p>
                  )}
                </div>
              </div>

              {/* Pricing */}
              {priceCalculation && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Pricing</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <SimplePriceDisplay
                      result={priceCalculation}
                      isRush={false}
                    />
                  </div>
                </div>
              )}

              {/* Payment Method Selection */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Payment Method</h3>
                <div className="space-y-2">
                  {getAvailablePaymentMethods().map((method: { value: string; label: string }) => (
                    <div key={method.value} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id={method.value}
                        name="paymentMethod"
                        value={method.value}
                        checked={selectedPaymentMethod === method.value}
                        onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                        className="h-4 w-4"
                      />
                      <label htmlFor={method.value} className="text-sm font-medium">
                        {method.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Actions */}
              <div className="flex flex-col space-y-3 pt-4 border-t">
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={onBack}
                    disabled={submitting}
                    className="flex-1"
                  >
                    Back to Edit
                  </Button>
                  
                  {selectedPaymentMethod === 'online_payment' ? (
                    <Button
                      onClick={handlePayNow}
                      disabled={submitting || !selectedPaymentMethod}
                      className="flex-1"
                    >
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Pay Now ${total.toFixed(2)}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => onSubmit(false)}
                      disabled={submitting || !selectedPaymentMethod}
                      className="flex-1"
                    >
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Submit Request
                    </Button>
                  )}
                </div>
                
                {selectedPaymentMethod === 'online_payment' && (
                  <p className="text-sm text-gray-600 text-center">
                    You will be charged immediately and your delivery will be prioritized
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Square Payment Modal */}
          {showSquarePayment && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Complete Payment</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSquarePayment(false)}
                  >
                    ×
                  </Button>
                </div>
                <SquarePayment
                  amount={total}
                  deliveryRequestId="temp-request-id"
                  customerName={formData?.fullName || formData?.customerName}
                  onPaymentSuccess={handleSquarePaymentSuccess}
                  onPaymentError={handleSquarePaymentError}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function EnhancedDeliveryForm() {
  const { user, profile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [loyaltyInfo, setLoyaltyInfo] = useState<any>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [priceCalculation, setPriceCalculation] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<FormStep>('form');
  const [formData, setFormData] = useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  
  // Fetch businesses
  const { data: businesses, isLoading: businessesLoading } = useQuery({
    queryKey: ['/api/businesses'],
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch business settings for pricing display and payment methods
  const { data: businessSettings } = useQuery<any>({
    queryKey: ['/api/business-settings'],
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // Get available payment methods from business settings
  const getAvailablePaymentMethods = () => {
    const acceptedMethods = businessSettings?.acceptedPaymentMethods || ['cash_on_delivery', 'card_on_delivery', 'online_payment'];
    
    return acceptedMethods.map((method: string) => {
      const predefined = PREDEFINED_PAYMENT_METHODS.find(p => p.value === method);
      return {
        value: method,
        label: predefined?.label || method
      };
    });
  };
  
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

  // Calculate delivery price when addresses are available
  useEffect(() => {
    const pickupAddress = selectedBusiness?.address || form.watch('pickupAddress');
    const deliveryAddress = form.watch('deliveryAddress');
    
    if (pickupAddress && deliveryAddress) {
      const calculatePrice = async () => {
        try {
          const response = await fetch('/api/maps/calculate-delivery-fee', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pickup: pickupAddress,
              delivery: deliveryAddress,
              isRush: false
            }),
          });
          
          if (response.ok) {
            const data = await response.json();
            setPriceCalculation(data);
          }
        } catch (error) {
          console.error('Price calculation failed:', error);
          setPriceCalculation(null);
        }
      };
      
      calculatePrice();
    } else {
      setPriceCalculation(null);
    }
  }, [selectedBusiness?.address, form.watch('pickupAddress'), form.watch('deliveryAddress')]);

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

  // Step 1: Handle form submission to review
  const onFormSubmit = async (data: any) => {
    setFormData(data);
    setCurrentStep('review');
  };

  // Step 2: Handle final submission (with or without payment)
  const onFinalSubmit = async (isPaid: boolean = false, paymentResult?: any) => {
    setSubmitting(true);
    
    try {
      const requestData = {
        ...formData,
        userId: user?.id || undefined,
        paymentMethod: selectedPaymentMethod,
        isPaid,
        paymentId: paymentResult?.paymentId,
        paymentStatus: isPaid ? 'completed' : 'pending',
      };

      const result = await apiRequest('/api/delivery-requests', 'POST', requestData);

      toast({
        title: "Success!",
        description: isPaid ? 
          "Your delivery request has been submitted and payment processed successfully!" :
          "Your delivery request has been submitted successfully. We'll contact you soon!",
      });

      // Reset form and return to step 1
      setCurrentStep('form');
      setFormData(null);
      setSelectedPaymentMethod('');
      
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



  // Show review step if in review mode
  if (currentStep === 'review') {
    return (
      <ReviewStep 
        formData={formData}
        selectedBusiness={selectedBusiness}
        priceCalculation={priceCalculation}
        loyaltyInfo={loyaltyInfo}
        businessSettings={businessSettings}
        selectedPaymentMethod={selectedPaymentMethod}
        setSelectedPaymentMethod={setSelectedPaymentMethod}
        onBack={() => setCurrentStep('form')}
        onSubmit={onFinalSubmit}
        submitting={submitting}
        user={user}
      />
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
            <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6">
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
                      <AddressInput
                        label="Delivery Address"
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Where should we deliver your items?"
                        required
                        id={field.name}
                      />
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
                          {getAvailablePaymentMethods().map((method: { value: string; label: string }) => (
                            <SelectItem key={method.value} value={method.value}>
                              {method.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Pricing Information */}


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

              {/* Price Calculator - Total Section */}
              {selectedBusiness && form.watch('deliveryAddress') && (
                <SimplePriceDisplay
                  result={priceCalculation}
                  isRush={false}
                  className="mt-4"
                />
              )}

              <Button type="submit" size="lg" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Review Delivery Request
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}