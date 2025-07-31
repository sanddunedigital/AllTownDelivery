import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useDriverProfileRealtime, useCustomerDeliveriesRealtime } from '@/hooks/use-realtime';
import { Users, Truck, Clock, Plus, Eye, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

// Define form schema for phone orders
const phoneOrderSchema = z.object({
  customerName: z.string().min(1, 'Customer name is required'),
  phone: z.string().min(10, 'Valid phone number is required'),
  email: z.string().email('Valid email is required'),
  pickupAddress: z.string().min(1, 'Pickup address is required'),
  deliveryAddress: z.string().min(1, 'Delivery address is required'),
  preferredDate: z.string().min(1, 'Date is required'),
  preferredTime: z.string().min(1, 'Time is required'),
  paymentMethod: z.string().min(1, 'Payment method is required'),
  specialInstructions: z.string().optional(),
  businessId: z.string().optional(),
});

type PhoneOrderFormData = z.infer<typeof phoneOrderSchema>;

interface Driver {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  isOnDuty: boolean;
  totalDeliveries: number;
  loyaltyPoints: number;
}

interface Delivery {
  id: string;
  customerName: string;
  phone: string;
  email: string;
  pickupAddress: string;
  deliveryAddress: string;
  preferredDate: string;
  preferredTime: string;
  paymentMethod: string;
  specialInstructions?: string;
  status: string;
  usedFreeDelivery: boolean;
  claimedByDriver?: string;
  claimedAt?: string;
  driverNotes?: string;
  createdAt: string;
}

interface Business {
  id: string;
  name: string;
  address: string;
  phone: string;
  isActive: boolean;
}

export default function DispatchPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPhoneOrderDialog, setShowPhoneOrderDialog] = useState(false);

  // Check if user has dispatcher or admin access
  if (!user || (user.role !== 'dispatcher' && user.role !== 'admin')) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Access denied. This page is for dispatchers and administrators only.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch all drivers
  const { data: drivers = [], isLoading: loadingDrivers } = useQuery({
    queryKey: ['/api/dispatch/drivers'],
    refetchInterval: 30000, // Refresh every 30 seconds
  }) as { data: Driver[], isLoading: boolean };

  // Fetch all deliveries
  const { data: deliveries = [], isLoading: loadingDeliveries } = useQuery({
    queryKey: ['/api/dispatch/deliveries'],
    refetchInterval: 30000, // Refresh every 30 seconds
  }) as { data: Delivery[], isLoading: boolean };

  // Fetch businesses for phone orders
  const { data: businesses = [], isLoading: loadingBusinesses } = useQuery({
    queryKey: ['/api/businesses'],
  }) as { data: Business[], isLoading: boolean };

  // Set up real-time updates for dispatchers
  useEffect(() => {
    // Invalidate queries every 15 seconds for real-time feel
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['/api/dispatch/drivers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dispatch/deliveries'] });
    }, 15000);

    return () => clearInterval(interval);
  }, [queryClient]);

  // Phone order form
  const form = useForm<PhoneOrderFormData>({
    resolver: zodResolver(phoneOrderSchema),
    defaultValues: {
      customerName: '',
      phone: '',
      email: '',
      pickupAddress: '',
      deliveryAddress: '',
      preferredDate: format(new Date(), 'yyyy-MM-dd'),
      preferredTime: '',
      paymentMethod: 'cash',
      specialInstructions: '',
      businessId: '',
    },
  });

  // Create phone order mutation
  const createPhoneOrder = useMutation({
    mutationFn: (data: PhoneOrderFormData) =>
      apiRequest('/api/delivery-requests', 'POST', data),
    onSuccess: () => {
      toast({
        title: 'Phone Order Added',
        description: 'The phone order has been added to the waiting queue.',
      });
      form.reset();
      setShowPhoneOrderDialog(false);
      queryClient.invalidateQueries({ queryKey: ['/api/dispatch/deliveries'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create phone order.',
        variant: 'destructive',
      });
    },
  });

  const onSubmitPhoneOrder = (data: PhoneOrderFormData) => {
    createPhoneOrder.mutate(data);
  };

  // Filter deliveries by status
  const availableDeliveries = deliveries.filter((d) => d.status === 'available');
  const activeDeliveries = deliveries.filter((d) => d.status === 'claimed' || d.status === 'in_progress');
  const completedDeliveries = deliveries.filter((d) => d.status === 'completed');

  // Filter drivers by status
  const onDutyDrivers = drivers.filter((d) => d.isOnDuty);
  const offDutyDrivers = drivers.filter((d) => !d.isOnDuty);

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dispatch Center</h1>
          <p className="text-muted-foreground">
            Monitor drivers and manage delivery queue
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['/api/dispatch/drivers'] });
              queryClient.invalidateQueries({ queryKey: ['/api/dispatch/deliveries'] });
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          
          <Dialog open={showPhoneOrderDialog} onOpenChange={setShowPhoneOrderDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Phone Order
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Phone Order</DialogTitle>
                <DialogDescription>
                  Enter delivery details from phone call. This will be added to the waiting queue.
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitPhoneOrder)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Customer Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter customer name" {...field} />
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
                          <FormLabel>Phone Number</FormLabel>
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
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="customer@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="businessId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pickup Business (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select business or enter custom address" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Custom pickup address</SelectItem>
                            {businesses.map((business) => (
                              <SelectItem key={business.id} value={business.id}>
                                {business.name} - {business.address}
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
                    name="pickupAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {form.watch('businessId') ? 'Additional Pickup Notes' : 'Pickup Address'}
                        </FormLabel>
                        <FormControl>
                          <Input 
                            placeholder={
                              form.watch('businessId') 
                                ? "Suite number, special instructions, etc."
                                : "Enter pickup address"
                            } 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="deliveryAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Address</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter delivery address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="preferredDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="preferredTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Time</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="credit">Credit Card</SelectItem>
                            <SelectItem value="venmo">Venmo</SelectItem>
                            <SelectItem value="zelle">Zelle</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="specialInstructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Instructions</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Any special delivery instructions..."
                            className="min-h-[80px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end gap-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setShowPhoneOrderDialog(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createPhoneOrder.isPending}>
                      {createPhoneOrder.isPending ? 'Adding...' : 'Add to Queue'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="drivers">Drivers ({drivers.length})</TabsTrigger>
          <TabsTrigger value="queue">Queue ({availableDeliveries.length})</TabsTrigger>
          <TabsTrigger value="active">Active ({activeDeliveries.length})</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">On Duty Drivers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{onDutyDrivers.length}</div>
                <p className="text-xs text-muted-foreground">
                  {offDutyDrivers.length} off duty
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Waiting Queue</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{availableDeliveries.length}</div>
                <p className="text-xs text-muted-foreground">
                  Ready for pickup
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Deliveries</CardTitle>
                <Truck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeDeliveries.length}</div>
                <p className="text-xs text-muted-foreground">
                  In progress
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedDeliveries.length}</div>
                <p className="text-xs text-muted-foreground">
                  Total completed
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest delivery status changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {deliveries.slice(0, 5).map((delivery) => (
                  <div key={delivery.id} className="flex items-center justify-between border-b pb-2">
                    <div>
                      <p className="font-medium">{delivery.customerName}</p>
                      <p className="text-sm text-muted-foreground">
                        {delivery.pickupAddress} → {delivery.deliveryAddress}
                      </p>
                    </div>
                    <Badge variant={
                      delivery.status === 'completed' ? 'default' :
                      delivery.status === 'in_progress' ? 'secondary' :
                      delivery.status === 'claimed' ? 'outline' : 'destructive'
                    }>
                      {delivery.status === 'in_progress' ? 'In Transit' :
                       delivery.status === 'claimed' ? 'Driver Assigned' :
                       delivery.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Drivers Tab */}
        <TabsContent value="drivers" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">On Duty Drivers ({onDutyDrivers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {onDutyDrivers.map((driver) => {
                    const driverDeliveries = activeDeliveries.filter((d) => d.claimedByDriver === driver.id);
                    return (
                      <div key={driver.id} className="flex items-center justify-between border rounded-lg p-4">
                        <div>
                          <p className="font-medium">{driver.fullName}</p>
                          <p className="text-sm text-muted-foreground">{driver.phone}</p>
                          <p className="text-xs text-muted-foreground">
                            {driver.totalDeliveries} total deliveries
                          </p>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary">
                            {driverDeliveries.length} active
                          </Badge>
                          {driverDeliveries.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {driverDeliveries.map((delivery) => (
                                <p key={delivery.id} className="text-xs text-muted-foreground">
                                  {delivery.customerName} - {delivery.status}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  {onDutyDrivers.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      No drivers currently on duty
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-gray-600">Off Duty Drivers ({offDutyDrivers.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {offDutyDrivers.map((driver) => (
                    <div key={driver.id} className="border rounded-lg p-4 opacity-60">
                      <p className="font-medium">{driver.fullName}</p>
                      <p className="text-sm text-muted-foreground">{driver.phone}</p>
                      <p className="text-xs text-muted-foreground">
                        {driver.totalDeliveries} total deliveries
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Queue Tab */}
        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Waiting Queue ({availableDeliveries.length})</CardTitle>
              <CardDescription>Deliveries waiting to be claimed by drivers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {availableDeliveries.map((delivery) => (
                  <div key={delivery.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-medium">{delivery.customerName}</p>
                          {delivery.usedFreeDelivery && (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              FREE DELIVERY
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <p><strong>Phone:</strong> {delivery.phone}</p>
                            <p><strong>Pickup:</strong> {delivery.pickupAddress}</p>
                            <p><strong>Delivery:</strong> {delivery.deliveryAddress}</p>
                          </div>
                          <div>
                            <p><strong>Date:</strong> {delivery.preferredDate}</p>
                            <p><strong>Time:</strong> {delivery.preferredTime}</p>
                            <p><strong>Payment:</strong> {delivery.paymentMethod}</p>
                          </div>
                        </div>
                        {delivery.specialInstructions && (
                          <div className="mt-2">
                            <p className="text-sm"><strong>Instructions:</strong> {delivery.specialInstructions}</p>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">
                          Created {format(new Date(delivery.createdAt), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                {availableDeliveries.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No deliveries in queue
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Tab */}
        <TabsContent value="active" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Deliveries ({activeDeliveries.length})</CardTitle>
              <CardDescription>Deliveries currently being handled by drivers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activeDeliveries.map((delivery) => {
                  const driver = drivers.find((d) => d.id === delivery.claimedByDriver);
                  return (
                    <div key={delivery.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="font-medium">{delivery.customerName}</p>
                            <Badge variant={delivery.status === 'in_progress' ? 'default' : 'secondary'}>
                              {delivery.status === 'in_progress' ? 'In Transit' : 'Driver Assigned'}
                            </Badge>
                            {delivery.usedFreeDelivery && (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                FREE DELIVERY
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p><strong>Phone:</strong> {delivery.phone}</p>
                              <p><strong>Pickup:</strong> {delivery.pickupAddress}</p>
                              <p><strong>Delivery:</strong> {delivery.deliveryAddress}</p>
                            </div>
                            <div>
                              <p><strong>Driver:</strong> {driver?.fullName || 'Unknown'}</p>
                              <p><strong>Driver Phone:</strong> {driver?.phone || 'N/A'}</p>
                              <p><strong>Claimed:</strong> {delivery.claimedAt ? format(new Date(delivery.claimedAt), 'MMM d, h:mm a') : 'N/A'}</p>
                            </div>
                          </div>
                          {delivery.driverNotes && (
                            <div className="mt-2">
                              <p className="text-sm"><strong>Driver Notes:</strong> {delivery.driverNotes}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {activeDeliveries.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No active deliveries
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}