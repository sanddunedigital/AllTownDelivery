import express from 'express';
import { db } from './db.js';
import { userProfiles, deliveryRequests } from '../shared/schema.js';
import { eq, or, and, sql } from 'drizzle-orm';
import { storage } from './storage.js';

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
    userId: dbDelivery.userId,
    businessId: dbDelivery.businessId,
    customerName: dbDelivery.customerName,
    phone: dbDelivery.phone,
    email: dbDelivery.email,
    pickupAddress: dbDelivery.pickupAddress,
    deliveryAddress: dbDelivery.deliveryAddress,
    preferredDate: dbDelivery.preferredDate,
    preferredTime: dbDelivery.preferredTime,
    paymentMethod: dbDelivery.paymentMethod,
    specialInstructions: dbDelivery.specialInstructions,
    marketingConsent: dbDelivery.marketingConsent,
    status: dbDelivery.status,
    usedFreeDelivery: dbDelivery.usedFreeDelivery,
    claimedByDriver: dbDelivery.claimedByDriver,
    claimedAt: dbDelivery.claimedAt,
    driverNotes: dbDelivery.driverNotes,
    createdAt: dbDelivery.createdAt,
  };
}

// Get all drivers for dispatch monitoring
router.get('/drivers', async (req, res) => {
  try {
    console.log('Fetching all drivers for dispatch...');
    
    // Get tenant context
    const tenantId = (req as any).tenantId || '00000000-0000-0000-0000-000000000001';
    
    // Use storage layer to get drivers for this tenant
    const drivers = await storage.getDrivers(tenantId);

    console.log(`Found ${drivers.length} drivers for tenant ${tenantId}`);
    console.log('Driver data:', drivers.map(d => ({ 
      id: d.id, 
      role: d.role, 
      isOnDuty: d.isOnDuty,
      inviteStatus: d.inviteStatus
    })));

    res.json(drivers);
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
    
    res.json(deliveries);
  } catch (error) {
    console.error('Error fetching deliveries:', error);
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

export default router;