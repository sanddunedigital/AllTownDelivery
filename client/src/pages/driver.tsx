import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { toast } from '../hooks/use-toast';
import { apiRequest } from '../lib/queryClient';
import { useDriverProfileRealtime, useAvailableDeliveriesRealtime, useDriverDeliveriesRealtime } from '../hooks/use-realtime';
import type { DeliveryRequest, UserProfile } from '@shared/schema';
import { Truck, Clock, MapPin, Phone, DollarSign, Package, Home, Power, PowerOff } from 'lucide-react';

export default function DriverPortal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [claimNotes, setClaimNotes] = useState<{ [key: string]: string }>({});
  const [deliveryNotes, setDeliveryNotes] = useState<{ [key: string]: string }>({});
  const [activeTab, setActiveTab] = useState('available');

  // Fetch profile directly with React Query to get real-time updates
  const { data: profile } = useQuery<UserProfile>({
    queryKey: [`/api/users/${user?.id}/profile`],
    enabled: !!user?.id
  });

  // Set up real-time subscriptions
  const isProfileConnected = useDriverProfileRealtime(user?.id);
  useAvailableDeliveriesRealtime();
  useDriverDeliveriesRealtime(user?.id);

  // Debug connection status
  useEffect(() => {
    if (user?.id && isProfileConnected) {
      console.log(`Driver profile real-time connected for user: ${user.id}`);
    }
  }, [user?.id, isProfileConnected]);

  // Check if driver is on duty - this will now be reactive to real-time updates
  const isOnDuty = profile?.isOnDuty ?? false;
  
  // Debug the current state
  useEffect(() => {
    console.log('Driver portal - Current profile:', profile);
    console.log('Driver portal - isOnDuty value:', isOnDuty);
  }, [profile, isOnDuty]);

  // Fetch available deliveries (only when on duty)
  const { data: availableDeliveries = [], isLoading: loadingAvailable } = useQuery<DeliveryRequest[]>({
    queryKey: ['/api/driver/deliveries/available'],
    enabled: !!user && isOnDuty
  });

  // Fetch driver's claimed deliveries
  const { data: myDeliveries = [], isLoading: loadingMy } = useQuery<DeliveryRequest[]>({
    queryKey: ['/api/driver', user?.id, 'deliveries'],
    enabled: !!user
  });

  // Filter active deliveries only  
  const activeDeliveries = myDeliveries.filter(d => d.status !== 'completed');

  // Claim delivery mutation
  const claimDeliveryMutation = useMutation({
    mutationFn: async ({ deliveryId, notes }: { deliveryId: string; notes?: string }) => {
      return apiRequest(`/api/driver/${user!.id}/claim`, 'POST', { deliveryId, driverNotes: notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/driver/deliveries/available'] });
      queryClient.invalidateQueries({ queryKey: ['/api/driver', user?.id, 'deliveries'] });
      toast({
        title: "Delivery Claimed",
        description: "You have successfully claimed this delivery.",
      });
      setClaimNotes({});
      setActiveTab('my-deliveries'); // Auto-switch to My Deliveries tab
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to claim delivery",
        variant: "destructive",
      });
    }
  });

  // Update delivery status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ deliveryId, status, notes }: { deliveryId: string; status: string; notes?: string }) => {
      return apiRequest(`/api/driver/${user!.id}/deliveries/${deliveryId}`, 'PATCH', { status, driverNotes: notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/driver', user?.id, 'deliveries'] });
      toast({
        title: "Status Updated",
        description: "Delivery status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    }
  });

  // Update driver duty status mutation
  const updateDriverStatusMutation = useMutation({
    mutationFn: async (isOnDuty: boolean) => {
      return apiRequest(`/api/driver/${user!.id}/status`, 'PATCH', { isOnDuty });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/users/${user?.id}/profile`] });
      toast({
        title: "Status Updated",
        description: `You are now ${isOnDuty ? 'off-duty' : 'on-duty'}.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update duty status",
        variant: "destructive",
      });
    }
  });

  const handleClaimDelivery = (deliveryId: string) => {
    const notes = claimNotes[deliveryId];
    claimDeliveryMutation.mutate({ deliveryId, notes });
  };

  const handleStatusUpdate = (deliveryId: string, status: string) => {
    const notes = deliveryNotes[deliveryId];
    updateStatusMutation.mutate({ deliveryId, status, notes });
  };

  const handleUpdateNotes = (deliveryId: string, currentStatus: string) => {
    const notes = deliveryNotes[deliveryId];
    updateStatusMutation.mutate({ deliveryId, status: currentStatus, notes });
  };

  const formatAddress = (address: string) => {
    return address.length > 40 ? `${address.slice(0, 40)}...` : address;
  };

  const renderClickablePhone = (phone: string) => (
    <a 
      href={`tel:${phone}`}
      className="text-blue-600 hover:text-blue-800 hover:underline"
    >
      {phone}
    </a>
  );

  const renderClickableAddress = (address: string) => (
    <a 
      href={`https://maps.google.com/?q=${encodeURIComponent(address)}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
    >
      {formatAddress(address)}
    </a>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'claimed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'completed':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-8">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-gray-600">Please sign in to access the driver portal.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              <img 
                src="https://www.sarasquickiedelivery.com/uploads/b/355ffb41d51d1587e36487d7e874ef8e616e85c920dc275424910629c86f9cde/D40F3E6C-CFC1-4A36-B60A-A2E3D2E0596F_1678667317.jpeg?width=400" 
                alt="Sara's Quickie Delivery Logo" 
                className="h-8 w-auto"
              />
              <span className="ml-3 text-lg font-bold text-primary">Sara's Quickie Delivery</span>
            </Link>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Driver Portal</span>
              <Link href="/">
                <Button variant="outline" size="sm">
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-4 max-w-4xl">
        {/* Header with Duty Toggle */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">Driver Portal</h1>
              <p className="text-sm text-gray-600">Welcome back, {profile?.fullName}!</p>
            </div>
            
            {/* Compact duty toggle */}
            <div className="flex items-center gap-3">
              {isOnDuty ? (
                <Power className="h-5 w-5 text-green-600" />
              ) : (
                <PowerOff className="h-5 w-5 text-gray-400" />
              )}
              <div className="text-right">
                <Label htmlFor="duty-toggle" className="text-sm font-medium">
                  {isOnDuty ? "On Duty" : "Off Duty"}
                </Label>
                <div className="mt-1">
                  <Switch
                    id="duty-toggle"
                    checked={isOnDuty}
                    onCheckedChange={(checked) => updateDriverStatusMutation.mutate(checked)}
                    disabled={updateDriverStatusMutation.isPending}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="available">
            Available ({availableDeliveries.length})
          </TabsTrigger>
          <TabsTrigger value="my-deliveries">
            Active ({activeDeliveries.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Available Deliveries</h2>
          </div>
          
          {!isOnDuty ? (
            <Card>
              <CardContent className="text-center py-8">
                <PowerOff className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">You're Off Duty</h3>
                <p className="text-gray-600">Go on duty to see available deliveries and receive new assignments.</p>
              </CardContent>
            </Card>
          ) : loadingAvailable ? (
            <div className="text-center py-8">Loading available deliveries...</div>
          ) : availableDeliveries.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">No Available Deliveries</h3>
                <p className="text-gray-600">Check back later for new delivery opportunities.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {availableDeliveries.map((delivery: DeliveryRequest) => (
                <Card key={delivery.id} className={`border-l-4 ${delivery.usedFreeDelivery ? 'border-l-yellow-500 bg-yellow-50' : 'border-l-green-500'}`}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{delivery.customerName}</CardTitle>
                          {delivery.usedFreeDelivery && (
                            <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
                              FREE DELIVERY
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Phone className="h-4 w-4" />
                          {renderClickablePhone(delivery.phone)}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(delivery.status)}>
                        {delivery.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-1 text-blue-500" />
                          <div>
                            <p className="font-medium text-sm">Pickup</p>
                            {renderClickableAddress(delivery.pickupAddress)}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-1 text-green-500" />
                          <div>
                            <p className="font-medium text-sm">Delivery</p>
                            {renderClickableAddress(delivery.deliveryAddress)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{delivery.preferredDate} at {delivery.preferredTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{delivery.paymentMethod}</span>
                      </div>
                    </div>

                    {delivery.specialInstructions && (
                      <div className="bg-gray-50 p-3 rounded-md">
                        <p className="font-medium text-sm mb-1">Special Instructions</p>
                        <p className="text-sm text-gray-600">{delivery.specialInstructions}</p>
                      </div>
                    )}

                    <Button 
                      onClick={() => handleClaimDelivery(delivery.id)}
                      disabled={claimDeliveryMutation.isPending}
                      className="w-full"
                    >
                      {claimDeliveryMutation.isPending ? 'Claiming...' : 'Claim This Delivery'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="my-deliveries" className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Active Deliveries</h2>
          </div>

          {loadingMy ? (
            <div className="text-center py-8">Loading your deliveries...</div>
          ) : activeDeliveries.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Truck className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">No Active Deliveries</h3>
                <p className="text-gray-600">Claim deliveries from the available tab to get started.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {activeDeliveries.map((delivery: DeliveryRequest) => (
                <Card key={delivery.id} className={`border-l-4 ${delivery.usedFreeDelivery ? 'border-l-yellow-500 bg-yellow-50' : 'border-l-blue-500'}`}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{delivery.customerName}</CardTitle>
                          {delivery.usedFreeDelivery && (
                            <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white">
                              FREE DELIVERY
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Phone className="h-4 w-4" />
                          {renderClickablePhone(delivery.phone)}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(delivery.status)}>
                        {delivery.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-1 text-blue-500" />
                          <div>
                            <p className="font-medium text-sm">Pickup</p>
                            {renderClickableAddress(delivery.pickupAddress)}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-1 text-green-500" />
                          <div>
                            <p className="font-medium text-sm">Delivery</p>
                            {renderClickableAddress(delivery.deliveryAddress)}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{delivery.preferredDate} at {delivery.preferredTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{delivery.paymentMethod}</span>
                      </div>
                    </div>

                    {delivery.specialInstructions && (
                      <div className="bg-gray-50 p-3 rounded-md">
                        <p className="font-medium text-sm mb-1">Special Instructions</p>
                        <p className="text-sm text-gray-600">{delivery.specialInstructions}</p>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <Label htmlFor={`delivery-notes-${delivery.id}`} className="text-sm font-medium">
                          Delivery Notes
                        </Label>
                        <Textarea
                          id={`delivery-notes-${delivery.id}`}
                          placeholder="Add notes about this delivery..."
                          value={deliveryNotes[delivery.id] ?? delivery.driverNotes ?? ''}
                          onChange={(e) => setDeliveryNotes(prev => ({ ...prev, [delivery.id]: e.target.value }))}
                          className="mt-1"
                          rows={2}
                        />
                        {deliveryNotes[delivery.id] !== undefined && deliveryNotes[delivery.id] !== (delivery.driverNotes ?? '') && (
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateNotes(delivery.id, delivery.status)}
                            disabled={updateStatusMutation.isPending}
                            className="mt-2"
                          >
                            Save Notes
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {delivery.status === 'claimed' && (
                        <Button 
                          onClick={() => handleStatusUpdate(delivery.id, 'in_progress')}
                          disabled={updateStatusMutation.isPending}
                          className="flex-1"
                        >
                          Start Delivery
                        </Button>
                      )}
                      {delivery.status === 'in_progress' && (
                        <Button 
                          onClick={() => handleStatusUpdate(delivery.id, 'completed')}
                          disabled={updateStatusMutation.isPending}
                          className="flex-1"
                        >
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>


      </Tabs>
      </div>
    </div>
  );
}