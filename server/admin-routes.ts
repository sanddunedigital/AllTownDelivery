import { Router } from 'express';
import { eq, sql, and, gte, lte, desc, count } from 'drizzle-orm';
import { db } from './db.js';
import { userProfiles, deliveryRequests, businesses, businessSettings, businessStaff } from '../shared/schema.js';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns';

const router = Router();

// Get business analytics
router.get('/analytics', async (req, res) => {
  try {
    const now = new Date();
    
    // Date ranges
    const thisWeekStart = startOfWeek(now);
    const thisWeekEnd = endOfWeek(now);
    const lastWeekStart = startOfWeek(subWeeks(now, 1));
    const lastWeekEnd = endOfWeek(subWeeks(now, 1));
    
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // Query deliveries for different time periods
    const [
      thisWeekDeliveries,
      lastWeekDeliveries,
      thisMonthDeliveries,
      lastMonthDeliveries,
      phoneOrders,
      onlineOrders,
      activeDrivers,
      totalCustomers,
      topBusinesses
    ] = await Promise.all([
      // This week deliveries
      db.select({ count: count() })
        .from(deliveryRequests)
        .where(
          and(
            gte(deliveryRequests.createdAt, thisWeekStart),
            lte(deliveryRequests.createdAt, thisWeekEnd)
          )
        ),
      
      // Last week deliveries
      db.select({ count: count() })
        .from(deliveryRequests)
        .where(
          and(
            gte(deliveryRequests.createdAt, lastWeekStart),
            lte(deliveryRequests.createdAt, lastWeekEnd)
          )
        ),
      
      // This month deliveries
      db.select({ count: count() })
        .from(deliveryRequests)
        .where(
          and(
            gte(deliveryRequests.createdAt, thisMonthStart),
            lte(deliveryRequests.createdAt, thisMonthEnd)
          )
        ),
      
      // Last month deliveries
      db.select({ count: count() })
        .from(deliveryRequests)
        .where(
          and(
            gte(deliveryRequests.createdAt, lastMonthStart),
            lte(deliveryRequests.createdAt, lastMonthEnd)
          )
        ),
      
      // Phone orders (orders with phone-order email)
      db.select({ count: count() })
        .from(deliveryRequests)
        .where(eq(deliveryRequests.email, 'phone-order@sarasquickie.com')),
      
      // Online orders (orders without phone-order email)
      db.select({ count: count() })
        .from(deliveryRequests)
        .where(sql`${deliveryRequests.email} != 'phone-order@sarasquickie.com'`),
      
      // Active drivers
      db.select({ count: count() })
        .from(businessStaff)
        .where(
          and(
            eq(businessStaff.role, 'driver'),
            eq(businessStaff.isOnDuty, true)
          )
        ),
      
      // Total customers (users who are not business staff)
      db.select({ count: count() })
        .from(userProfiles)
        .where(sql`${userProfiles.id} NOT IN (SELECT id FROM business_staff)`),
      
      // Top businesses by order count
      db.select({
        businessId: deliveryRequests.businessId,
        count: count()
      })
        .from(deliveryRequests)
        .where(
          and(
            gte(deliveryRequests.createdAt, thisMonthStart),
            lte(deliveryRequests.createdAt, thisMonthEnd)
          )
        )
        .groupBy(deliveryRequests.businessId)
        .orderBy(desc(count()))
        .limit(5)
    ]);

    // Get business names for top businesses
    const businessData = await Promise.all(
      topBusinesses.map(async (business) => {
        if (business.businessId) {
          const businessInfo = await db.select()
            .from(businesses)
            .where(eq(businesses.id, business.businessId))
            .limit(1);
          
          return {
            name: businessInfo[0]?.name || 'Unknown Business',
            orders: business.count
          };
        }
        return {
          name: 'Custom Pickup',
          orders: business.count
        };
      })
    );

    const totalOrders = phoneOrders[0].count + onlineOrders[0].count;
    const phonePercentage = totalOrders > 0 ? (phoneOrders[0].count / totalOrders) * 100 : 0;
    const onlinePercentage = totalOrders > 0 ? (onlineOrders[0].count / totalOrders) * 100 : 0;

    // Calculate estimated revenue (assuming $5 per delivery)
    const deliveryFee = 5;
    const revenue = {
      thisWeek: thisWeekDeliveries[0].count * deliveryFee,
      lastWeek: lastWeekDeliveries[0].count * deliveryFee,
      thisMonth: thisMonthDeliveries[0].count * deliveryFee,
      lastMonth: lastMonthDeliveries[0].count * deliveryFee
    };

    const analytics = {
      totalDeliveries: {
        thisWeek: thisWeekDeliveries[0].count,
        lastWeek: lastWeekDeliveries[0].count,
        thisMonth: thisMonthDeliveries[0].count,
        lastMonth: lastMonthDeliveries[0].count
      },
      orderTypes: {
        phone: phoneOrders[0].count,
        online: onlineOrders[0].count,
        phonePercentage,
        onlinePercentage
      },
      revenue,
      activeDrivers: activeDrivers[0].count,
      totalCustomers: totalCustomers[0].count,
      avgDeliveryTime: '25 mins', // This would need actual delivery time tracking
      topBusinesses: businessData
    };

    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Get all users for admin management
router.get('/users', async (req, res) => {
  try {
    // Get all user profiles with optional business staff info
    const usersWithStaff = await db.select({
      id: userProfiles.id,
      email: userProfiles.email,
      fullName: userProfiles.fullName,
      phone: userProfiles.phone,
      tenantId: userProfiles.tenantId,
      createdAt: userProfiles.createdAt,
      // Business staff info (may be null for customers)
      role: businessStaff.role,
      isOnDuty: businessStaff.isOnDuty,
      inviteStatus: businessStaff.inviteStatus
    })
      .from(userProfiles)
      .leftJoin(businessStaff, eq(userProfiles.id, businessStaff.id))
      .orderBy(desc(userProfiles.createdAt));

    // Transform data to include user type
    const users = usersWithStaff.map(user => ({
      ...user,
      userType: user.role ? 'business_staff' : 'customer',
      role: user.role || 'customer'
    }));

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Assign or update user role
router.post('/assign-role', async (req, res) => {
  try {
    const { email, role } = req.body;

    if (!email || !role) {
      return res.status(400).json({ error: 'Email and role are required' });
    }

    // Valid business staff roles only
    const validRoles = ['driver', 'dispatcher', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be driver, dispatcher, or admin' });
    }

    // Check if user exists in base user_profiles
    const existingUser = await db.select()
      .from(userProfiles)
      .where(eq(userProfiles.email, email))
      .limit(1);

    if (existingUser.length === 0) {
      return res.status(404).json({ error: 'User not found. User must register first.' });
    }

    const userId = existingUser[0].id;
    const tenantId = existingUser[0].tenantId;

    // Check if business staff record exists
    const existingStaff = await db.select()
      .from(businessStaff)
      .where(eq(businessStaff.id, userId))
      .limit(1);

    if (existingStaff.length === 0) {
      // Create new business staff record
      await db.insert(businessStaff).values({
        id: userId,
        tenantId: tenantId,
        role: role,
        inviteStatus: 'accepted',
        acceptedAt: new Date(),
        permissions: {}
      });
    } else {
      // Update existing business staff role
      await db.update(businessStaff)
        .set({ 
          role,
          updatedAt: new Date()
        })
        .where(eq(businessStaff.id, userId));
    }

    res.json({ 
      success: true, 
      message: `Business role updated to ${role} for ${email}` 
    });
  } catch (error) {
    console.error('Error assigning role:', error);
    res.status(500).json({ error: 'Failed to assign role' });
  }
});

// Get all businesses for admin management
router.get('/businesses', async (req, res) => {
  try {
    const allBusinesses = await db.select()
      .from(businesses)
      .orderBy(desc(businesses.createdAt));

    res.json(allBusinesses);
  } catch (error) {
    console.error('Error fetching businesses:', error);
    res.status(500).json({ error: 'Failed to fetch businesses' });
  }
});

// Toggle business active status
router.patch('/businesses/:id/toggle', async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be a boolean' });
    }

    // Update business status
    const result = await db.update(businesses)
      .set({ 
        isActive,
        // Note: businesses table doesn't have updatedAt field, so we don't update it
      })
      .where(eq(businesses.id, id))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json({ 
      success: true, 
      message: `Business ${isActive ? 'activated' : 'deactivated'} successfully`,
      business: result[0]
    });
  } catch (error) {
    console.error('Error toggling business status:', error);
    res.status(500).json({ error: 'Failed to update business status' });
  }
});

// Edit business information
router.patch('/businesses/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, address, website, orderingInstructions, category, imageUrl } = req.body;

    // Validate required fields
    if (!name || !phone || !address || !orderingInstructions) {
      return res.status(400).json({ error: 'Name, phone, address, and ordering instructions are required' });
    }

    // Update business information
    const result = await db.update(businesses)
      .set({ 
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        website: website?.trim() || null,
        orderingInstructions: orderingInstructions.trim(),
        category: category?.trim() || null,
        imageUrl: imageUrl || null
      })
      .where(eq(businesses.id, id))
      .returning();

    if (result.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }

    res.json({ 
      success: true, 
      message: 'Business updated successfully',
      business: result[0]
    });
  } catch (error) {
    console.error('Error updating business:', error);
    res.status(500).json({ error: 'Failed to update business' });
  }
});

// Add new business
router.post('/businesses', async (req, res) => {
  try {
    const { name, phone, address, website, orderingInstructions, category, imageUrl } = req.body;

    // Validate required fields
    if (!name || !phone || !address || !orderingInstructions) {
      return res.status(400).json({ error: 'Name, phone, address, and ordering instructions are required' });
    }

    // Insert new business
    const result = await db.insert(businesses)
      .values({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        website: website?.trim() || null,
        orderingInstructions: orderingInstructions.trim(),
        category: category?.trim() || null,
        imageUrl: imageUrl || null,
        isActive: true
      })
      .returning();

    res.status(201).json({ 
      success: true, 
      message: 'Business added successfully',
      business: result[0]
    });
  } catch (error) {
    console.error('Error adding business:', error);
    res.status(500).json({ error: 'Failed to add business' });
  }
});

// Update logo URL in database after successful client-side Supabase upload
router.put('/business-settings/logo', async (req, res) => {
  try {
    const { logoURL } = req.body;

    if (!logoURL) {
      return res.status(400).json({ error: 'logoURL is required' });
    }

    // Store the full Supabase public URL directly
    const [result] = await db
      .update(businessSettings)
      .set({ 
        logoUrl: logoURL,
        updatedAt: new Date()
      })
      .where(eq(businessSettings.tenantId, DEFAULT_TENANT_ID))
      .returning({ 
        id: businessSettings.id,
        logoUrl: businessSettings.logoUrl 
      });

    if (!result) {
      return res.status(404).json({ error: 'Business settings not found' });
    }

    res.json({ 
      success: true, 
      logoPath: logoURL,
      message: 'Logo updated successfully'
    });
  } catch (error) {
    console.error('Error updating logo:', error);
    res.status(500).json({ error: 'Failed to update logo' });
  }
});

export default router;