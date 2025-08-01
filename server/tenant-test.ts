import { db } from './db';
import { deliveryRequests, userProfiles, businesses } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Test tenant isolation by creating sample data for different tenants
export async function createTestTenantData() {
  const testTenantId = 'test-tenant-123';
  
  try {
    console.log('Creating test tenant data...');
    
    // Create a test user profile for different tenant
    await db.insert(userProfiles).values({
      id: 'test-user-456',
      tenantId: testTenantId,
      email: 'test@competitor.com',
      fullName: 'Test User',
      phone: '555-0123',
      defaultPickupAddress: 'Test Address',
      role: 'customer',
      loyaltyPoints: 0,
      totalDeliveries: 0,
      freeDeliveryCredits: 0,
      isOnDuty: false,
      marketingConsent: false
    });

    // Create a test delivery for different tenant
    await db.insert(deliveryRequests).values({
      customerName: 'Test Customer',
      customerPhone: '555-0123',
      customerEmail: 'test@competitor.com',
      pickupAddress: 'Test Pickup',
      deliveryAddress: 'Test Delivery',
      specialInstructions: 'Test delivery for tenant isolation',
      deliveryFee: 5.00,
      isUrgent: false,
      status: 'pending',
      isFreeDelivery: false,
      tenantId: testTenantId,
      userId: 'test-user-456'
    });

    console.log('Test tenant data created successfully');
    return { testTenantId, testUserId: 'test-user-456', testDeliveryId: 'test-delivery-789' };
  } catch (error) {
    console.error('Error creating test tenant data:', error);
    throw error;
  }
}

// Test tenant isolation queries
export async function testTenantIsolation(currentTenantId: string) {
  console.log(`Testing tenant isolation for tenant: ${currentTenantId}`);
  
  try {
    // Query deliveries for current tenant only
    const currentTenantDeliveries = await db
      .select()
      .from(deliveryRequests)
      .where(eq(deliveryRequests.tenantId, currentTenantId));

    // Query users for current tenant only  
    const currentTenantUsers = await db
      .select()
      .from(userProfiles)
      .where(eq(userProfiles.tenantId, currentTenantId));

    // Query businesses for current tenant only
    const currentTenantBusinesses = await db
      .select()
      .from(businesses)
      .where(eq(businesses.tenantId, currentTenantId));

    console.log(`Found ${currentTenantDeliveries.length} deliveries for tenant ${currentTenantId}`);
    console.log(`Found ${currentTenantUsers.length} users for tenant ${currentTenantId}`);
    console.log(`Found ${currentTenantBusinesses.length} businesses for tenant ${currentTenantId}`);

    return {
      deliveryCount: currentTenantDeliveries.length,
      userCount: currentTenantUsers.length,
      businessCount: currentTenantBusinesses.length
    };
  } catch (error) {
    console.error('Error testing tenant isolation:', error);
    throw error;
  }
}

// Clean up test data
export async function cleanupTestTenantData() {
  const testTenantId = 'test-tenant-123';
  
  try {
    console.log('Cleaning up test tenant data...');
    
    // Delete test delivery requests
    await db.delete(deliveryRequests).where(eq(deliveryRequests.tenantId, testTenantId));
    
    // Delete test user profiles
    await db.delete(userProfiles).where(eq(userProfiles.tenantId, testTenantId));
    
    console.log('Test tenant data cleaned up successfully');
  } catch (error) {
    console.error('Error cleaning up test tenant data:', error);
    throw error;
  }
}

// Simulate RLS behavior for testing
export function getTenantFilteredQuery(tableName: string, tenantId: string) {
  return `${tableName} WHERE tenant_id = '${tenantId}'`;
}