import express from 'express';
import { db } from './db';
import { userProfiles, deliveryRequests } from '../shared/schema';
import { eq, or, and } from 'drizzle-orm';

const router = express.Router();

// Convert database response from snake_case to camelCase
function convertUserProfileFromDb(dbProfile: any) {
  if (!dbProfile) return null;
  
  return {
    id: dbProfile.id,
    email: dbProfile.email,
    fullName: dbProfile.full_name,
    phone: dbProfile.phone,
    defaultPickupAddress: dbProfile.default_pickup_address,
    defaultDeliveryAddress: dbProfile.default_delivery_address,
    preferredPaymentMethod: dbProfile.preferred_payment_method,
    marketingConsent: dbProfile.marketing_consent,
    loyaltyPoints: dbProfile.loyalty_points,
    totalDeliveries: dbProfile.total_deliveries,
    freeDeliveryCredits: dbProfile.free_delivery_credits,
    role: dbProfile.role,
    isOnDuty: dbProfile.is_on_duty,
    createdAt: dbProfile.created_at,
    updatedAt: dbProfile.updated_at,
  };
}

function convertDeliveryFromDb(dbDelivery: any) {
  if (!dbDelivery) return null;
  
  return {
    id: dbDelivery.id,
    userId: dbDelivery.user_id,
    businessId: dbDelivery.business_id,
    customerName: dbDelivery.customer_name,
    phone: dbDelivery.phone,
    email: dbDelivery.email,
    pickupAddress: dbDelivery.pickup_address,
    deliveryAddress: dbDelivery.delivery_address,
    preferredDate: dbDelivery.preferred_date,
    preferredTime: dbDelivery.preferred_time,
    paymentMethod: dbDelivery.payment_method,
    specialInstructions: dbDelivery.special_instructions,
    marketingConsent: dbDelivery.marketing_consent,
    status: dbDelivery.status,
    usedFreeDelivery: dbDelivery.used_free_delivery,
    claimedByDriver: dbDelivery.claimed_by_driver,
    claimedAt: dbDelivery.claimed_at,
    driverNotes: dbDelivery.driver_notes,
    createdAt: dbDelivery.created_at,
  };
}

// Get all drivers for dispatch monitoring
router.get('/drivers', async (req, res) => {
  try {
    console.log('Fetching all drivers for dispatch...');
    
    const drivers = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.role, 'driver'));
    
    console.log(`Found ${drivers.length} drivers`);
    
    const convertedDrivers = drivers.map(convertUserProfileFromDb);
    
    res.json(convertedDrivers);
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ error: 'Failed to fetch drivers' });
  }
});

// Get all deliveries for dispatch monitoring
router.get('/deliveries', async (req, res) => {
  try {
    console.log('Fetching all deliveries for dispatch...');
    
    const deliveries = await db
      .select()
      .from(deliveryRequests);
    
    console.log(`Found ${deliveries.length} deliveries`);
    
    const convertedDeliveries = deliveries.map(convertDeliveryFromDb);
    
    res.json(convertedDeliveries);
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

export default router;