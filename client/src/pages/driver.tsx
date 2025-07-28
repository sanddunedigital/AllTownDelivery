import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { toast } from '../hooks/use-toast';
import { apiRequest } from '../lib/queryClient';
import type { DeliveryRequest } from '@shared/schema';
import { Truck, Clock, MapPin, Phone, DollarSign, Package } from 'lucide-react';

export default function DriverPortal() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [claimNotes, setClaimNotes] = useState<{ [key: string]: string }>({});
  const [deliveryNotes, setDeliveryNotes] = useState<{ [key: string]: string }>({});
  const [activeTab, setActiveTab] = useState('available');

  // Fetch available deliveries
  const { data: availableDeliveries = [], isLoading: loadingAvailable } = useQuery<DeliveryRequest[]>({
    queryKey: ['/api/driver/deliveries/available'],
    enabled: !!user
  });

  // Fetch driver's claimed deliveries
  const { data: myDeliveries = [], isLoading: loadingMy } = useQuery<DeliveryRequest[]>({
    queryKey: ['/api/driver', user?.id, 'deliveries'],
    enabled: !!user
  });

  // Separate active and completed deliveries
  const activeDeliveries = myDeliveries.filter(d => d.status !== 'completed');
  const completedDeliveries = myDeliveries.filter(d => d.status === 'completed');

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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Driver Portal</h1>
        <p className="text-gray-600">Manage your delivery assignments and track your progress</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="available">
            Available ({availableDeliveries.length})
          </TabsTrigger>
          <TabsTrigger value="my-deliveries">
            Active ({activeDeliveries.length})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed ({completedDeliveries.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Available Deliveries</h2>
          </div>
          
          {loadingAvailable ? (
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
                <Card key={delivery.id} className="border-l-4 border-l-green-500">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{delivery.customerName}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Phone className="h-4 w-4" />
                          {delivery.phone}
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
                            <p className="text-sm text-gray-600">{formatAddress(delivery.pickupAddress)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-1 text-green-500" />
                          <div>
                            <p className="font-medium text-sm">Delivery</p>
                            <p className="text-sm text-gray-600">{formatAddress(delivery.deliveryAddress)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{delivery.preferredDate} at {delivery.preferredTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{delivery.deliveryType}</span>
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
                <Card key={delivery.id} className="border-l-4 border-l-blue-500">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{delivery.customerName}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Phone className="h-4 w-4" />
                          {delivery.phone}
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
                            <p className="text-sm text-gray-600">{delivery.pickupAddress}</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-1 text-green-500" />
                          <div>
                            <p className="font-medium text-sm">Delivery</p>
                            <p className="text-sm text-gray-600">{delivery.deliveryAddress}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{delivery.preferredDate} at {delivery.preferredTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{delivery.deliveryType}</span>
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

        <TabsContent value="completed" className="space-y-4">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Completed Deliveries</h2>
            <Badge variant="outline">{completedDeliveries.length} today</Badge>
          </div>

          {loadingMy ? (
            <div className="text-center py-8">Loading completed deliveries...</div>
          ) : completedDeliveries.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">No Completed Deliveries</h3>
                <p className="text-gray-600">Complete some deliveries to track your daily progress here.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {completedDeliveries.map((delivery: DeliveryRequest) => (
                <Card key={delivery.id} className="border-l-4 border-l-purple-500 opacity-75">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{delivery.customerName}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Phone className="h-4 w-4" />
                          {delivery.phone}
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
                            <p className="text-sm text-gray-600">{formatAddress(delivery.pickupAddress)}</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-1 text-green-500" />
                          <div>
                            <p className="font-medium text-sm">Delivery</p>
                            <p className="text-sm text-gray-600">{formatAddress(delivery.deliveryAddress)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{delivery.preferredDate} at {delivery.preferredTime}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{delivery.deliveryType}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-gray-500" />
                        <span className="text-sm">{delivery.paymentMethod}</span>
                      </div>
                    </div>

                    {delivery.driverNotes && (
                      <div className="bg-purple-50 p-3 rounded-md">
                        <p className="font-medium text-sm mb-1">Delivery Notes</p>
                        <p className="text-sm text-gray-600">{delivery.driverNotes}</p>
                      </div>
                    )}

                    <div className="text-sm text-green-600 font-medium">
                      ✓ Completed successfully
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}