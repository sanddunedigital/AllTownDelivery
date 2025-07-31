import { useEffect, useRef } from 'react';
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

// Specific hook for driver profile updates
export function useDriverProfileRealtime(userId?: string) {
  const queryClient = useQueryClient();
  const { subscribe } = useRealtimeSubscription();

  useEffect(() => {
    if (!userId) return;

    const channel = subscribe(
      `driver-profile-${userId}`,
      'user_profiles',
      'UPDATE',
      `id=eq.${userId}`,
      (payload: RealtimePostgresChangesPayload<any>) => {
        // Immediately update the profile cache
        queryClient.setQueryData([`/api/users/${userId}/profile`], payload.new);
        
        // Also invalidate to ensure consistency
        queryClient.invalidateQueries({ 
          queryKey: [`/api/users/${userId}/profile`],
          refetchType: 'none' // Don't refetch, we already have the latest data
        });
      }
    );

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, subscribe, queryClient]);
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
        if (oldDelivery?.status !== newDelivery?.status && 
            (oldDelivery?.status === 'available' || newDelivery?.status === 'available')) {
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

    const channel = subscribe(
      `customer-deliveries-${userId}`,
      'delivery_requests',
      '*',
      `userId=eq.${userId}`,
      (payload: RealtimePostgresChangesPayload<any>) => {
        // Invalidate customer's delivery list
        queryClient.invalidateQueries({ 
          queryKey: ['/api/delivery-requests'] 
        });
      }
    );

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, subscribe, queryClient]);
}