import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export function useRealtimeSubscription() {
  const queryClient = useQueryClient();
  const channelsRef = useRef<RealtimeChannel[]>([]);

  const subscribe = (
    channelName: string,
    table: string,
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
    filter?: string,
    callback?: (payload: RealtimePostgresChangesPayload<any>) => void
  ) => {
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        {
          event,
          schema: 'public',
          table,
          ...(filter && { filter })
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          // Default behavior: invalidate related queries
          queryClient.invalidateQueries({ 
            queryKey: [table], 
            refetchType: 'active' 
          });
          
          // Custom callback if provided
          callback?.(payload);
        }
      )
      .subscribe();

    channelsRef.current.push(channel);
    return channel;
  };

  const unsubscribeAll = () => {
    channelsRef.current.forEach(channel => {
      supabase.removeChannel(channel);
    });
    channelsRef.current = [];
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribeAll();
    };
  }, []);

  return { subscribe, unsubscribeAll };
}

// Specific hook for driver profile updates with immediate connection
export function useDriverProfileRealtime(userId?: string) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const setupSubscription = useCallback(() => {
    if (!userId || channelRef.current) return;

    console.log(`Setting up real-time subscription for driver profile: ${userId}`);
    
    const channel = supabase
      .channel(`driver-profile-${userId}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'user_profiles',
          filter: `id=eq.${userId}`
        },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('Real-time profile update received:', payload);
          console.log('Updating cache for userId:', userId);
          console.log('New profile data:', payload.new);
          
          // Convert snake_case to camelCase for the frontend
          const profileData = {
            id: payload.new.id,
            email: payload.new.email,
            fullName: payload.new.full_name,
            phone: payload.new.phone,
            defaultPickupAddress: payload.new.default_pickup_address,
            defaultDeliveryAddress: payload.new.default_delivery_address,
            preferredPaymentMethod: payload.new.preferred_payment_method,
            marketingConsent: payload.new.marketing_consent,
            loyaltyPoints: payload.new.loyalty_points,
            totalDeliveries: payload.new.total_deliveries,
            freeDeliveryCredits: payload.new.free_delivery_credits,
            role: payload.new.role,
            isOnDuty: payload.new.is_on_duty,
            createdAt: payload.new.created_at,
            updatedAt: payload.new.updated_at
          };
          
          console.log('Converted profile data:', profileData);
          
          // Update the profile cache with converted data
          queryClient.setQueryData([`/api/users/${userId}/profile`], profileData);
          
          // Force invalidation and refetch
          queryClient.invalidateQueries({ 
            queryKey: [`/api/users/${userId}/profile`],
            refetchType: 'active'
          });
          
          // Also invalidate driver-specific queries
          queryClient.invalidateQueries({ 
            queryKey: ['/api/driver/deliveries/available'],
            refetchType: 'active'
          });
          
          // If driver went off duty, invalidate their active deliveries too
          if (payload.new.is_on_duty === false) {
            console.log('Driver went off duty - invalidating active deliveries cache');
            queryClient.invalidateQueries({ 
              queryKey: ['/api/driver', userId, 'deliveries'],
              refetchType: 'active'
            });
          }
          
          console.log('Cache updated and queries invalidated');
        }
      )
      .subscribe((status) => {
        console.log(`Driver profile subscription status: ${status}`);
        setIsConnected(status === 'SUBSCRIBED');
      });

    channelRef.current = channel;
  }, [userId, queryClient]);

  useEffect(() => {
    setupSubscription();

    return () => {
      if (channelRef.current) {
        console.log('Cleaning up driver profile subscription');
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
        setIsConnected(false);
      }
    };
  }, [setupSubscription]);

  return isConnected;
}

// Hook for available deliveries real-time updates
export function useAvailableDeliveriesRealtime() {
  const queryClient = useQueryClient();
  const { subscribe } = useRealtimeSubscription();

  useEffect(() => {
    // Subscribe to delivery status changes that affect available deliveries
    const statusChannel = subscribe(
      'delivery-status-changes',
      'delivery_requests',
      'UPDATE',
      undefined,
      (payload: RealtimePostgresChangesPayload<any>) => {
        const { old: oldDelivery, new: newDelivery } = payload;
        
        // If status changed to/from 'available', update the available deliveries list
        if ((oldDelivery as any)?.status !== (newDelivery as any)?.status && 
            ((oldDelivery as any)?.status === 'available' || (newDelivery as any)?.status === 'available')) {
          queryClient.invalidateQueries({ 
            queryKey: ['/api/driver/deliveries/available'] 
          });
        }
      }
    );

    // Subscribe to new deliveries being created
    const newDeliveryChannel = subscribe(
      'new-deliveries',
      'delivery_requests',
      'INSERT',
      undefined,
      (payload: RealtimePostgresChangesPayload<any>) => {
        // If new delivery is available, add it to the list
        if (payload.new?.status === 'available') {
          queryClient.invalidateQueries({ 
            queryKey: ['/api/driver/deliveries/available'] 
          });
        }
      }
    );

    return () => {
      supabase.removeChannel(statusChannel);
      supabase.removeChannel(newDeliveryChannel);
    };
  }, [subscribe, queryClient]);
}

// Hook for driver's claimed deliveries
export function useDriverDeliveriesRealtime(driverId?: string) {
  const queryClient = useQueryClient();
  const { subscribe } = useRealtimeSubscription();

  useEffect(() => {
    if (!driverId) return;

    const channel = subscribe(
      `driver-deliveries-${driverId}`,
      'delivery_requests',
      '*',
      `claimedByDriver=eq.${driverId}`,
      (payload: RealtimePostgresChangesPayload<any>) => {
        // Invalidate driver's delivery list
        queryClient.invalidateQueries({ 
          queryKey: ['/api/driver', driverId, 'deliveries'] 
        });
      }
    );

    return () => {
      supabase.removeChannel(channel);
    };
  }, [driverId, subscribe, queryClient]);
}

// Hook for customer delivery updates
export function useCustomerDeliveriesRealtime(userId?: string) {
  const queryClient = useQueryClient();
  const { subscribe } = useRealtimeSubscription();

  useEffect(() => {
    if (!userId) return;

    console.log(`Setting up customer delivery subscription for user: ${userId}`);

    // Subscribe to all delivery changes and filter in the callback
    // This avoids potential issues with Supabase filter syntax
    const channel = subscribe(
      `customer-deliveries-${userId}`,
      'delivery_requests',
      '*',
      undefined, // No server-side filter, we'll filter client-side
      (payload: RealtimePostgresChangesPayload<any>) => {
        console.log('Customer delivery update received:', payload);
        
        // Check if this delivery belongs to the current user (using snake_case from database)
        const isUserDelivery = (payload.new as any)?.user_id === userId || (payload.old as any)?.user_id === userId;
        
        if (isUserDelivery) {
          console.log('Delivery update is for current user - invalidating cache');
          // Invalidate customer's delivery list - match the exact query key format
          queryClient.invalidateQueries({ 
            queryKey: [`/api/delivery-requests?userId=${userId}`] 
          });
          // Also invalidate the general delivery requests query for compatibility
          queryClient.invalidateQueries({ 
            queryKey: ['/api/delivery-requests'] 
          });
        } else {
          console.log('Delivery update is not for current user - ignoring');
        }
      }
    );

    return () => {
      console.log(`Cleaning up customer delivery subscription for user: ${userId}`);
      supabase.removeChannel(channel);
    };
  }, [userId, subscribe, queryClient]);
}