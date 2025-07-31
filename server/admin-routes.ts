import { Router } from 'express';
import { eq, sql, and, gte, lte, desc, count } from 'drizzle-orm';
import { db } from './db';
import { userProfiles, deliveryRequests, businesses } from '@shared/schema';
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
        .from(userProfiles)
        .where(
          and(
            eq(userProfiles.role, 'driver'),
            eq(userProfiles.isOnDuty, true)
          )
        ),
      
      // Total customers
      db.select({ count: count() })
        .from(userProfiles)
        .where(eq(userProfiles.role, 'customer')),
      
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
    const users = await db.select({
      id: userProfiles.id,
      email: userProfiles.email,
      fullName: userProfiles.fullName,
      phone: userProfiles.phone,
      role: userProfiles.role,
      isOnDuty: userProfiles.isOnDuty,
      totalDeliveries: userProfiles.totalDeliveries,
      loyaltyPoints: userProfiles.loyaltyPoints,
      createdAt: userProfiles.createdAt
    })
      .from(userProfiles)
      .orderBy(desc(userProfiles.createdAt));

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

    // Valid roles
    const validRoles = ['customer', 'driver', 'dispatcher', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if user exists
    const existingUser = await db.select()
      .from(userProfiles)
      .where(eq(userProfiles.email, email))
      .limit(1);

    if (existingUser.length === 0) {
      return res.status(404).json({ error: 'User not found. User must register first.' });
    }

    // Update user role
    await db.update(userProfiles)
      .set({ 
        role,
        updatedAt: new Date()
      })
      .where(eq(userProfiles.email, email));

    res.json({ 
      success: true, 
      message: `Role updated to ${role} for ${email}` 
    });
  } catch (error) {
    console.error('Error assigning role:', error);
    res.status(500).json({ error: 'Failed to assign role' });
  }
});

export default router;