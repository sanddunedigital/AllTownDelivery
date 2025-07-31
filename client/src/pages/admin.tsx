import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from '../hooks/use-toast';
import { apiRequest } from '../lib/queryClient';
import type { UserProfile, DeliveryRequest } from '@shared/schema';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Phone, 
  Globe, 
  Calendar,
  DollarSign,
  Home,
  Settings,
  UserCheck,
  UserX,
  Mail
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns';

// Analytics interface
interface Analytics {
  totalDeliveries: {
    thisWeek: number;
    lastWeek: number;
    thisMonth: number;
    lastMonth: number;
  };
  orderTypes: {
    phone: number;
    online: number;
    phonePercentage: number;
    onlinePercentage: number;
  };
  revenue: {
    thisWeek: number;
    lastWeek: number;
    thisMonth: number;
    lastMonth: number;
  };
  activeDrivers: number;
  totalCustomers: number;
  avgDeliveryTime: string;
  topBusinesses: Array<{
    name: string;
    orders: number;
  }>;
}

// Role assignment schema
const roleAssignmentSchema = {
  email: '',
  role: 'customer' as 'customer' | 'driver' | 'dispatcher' | 'admin'
};

function AdminDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [roleAssignment, setRoleAssignment] = useState(roleAssignmentSchema);

  // Fetch admin profile to verify access
  const { data: profile } = useQuery<UserProfile>({
    queryKey: [`/api/users/${user?.id}/profile`],
    enabled: !!user?.id
  });

  // Fetch analytics data
  const { data: analytics, isLoading: loadingAnalytics } = useQuery<Analytics>({
    queryKey: ['/api/admin/analytics'],
    enabled: !!user && profile?.role === 'admin'
  });

  // Fetch all users for role management
  const { data: allUsers = [], isLoading: loadingUsers } = useQuery<UserProfile[]>({
    queryKey: ['/api/admin/users'],
    enabled: !!user && profile?.role === 'admin'
  });

  // Role assignment mutation
  const assignRoleMutation = useMutation({
    mutationFn: async (data: { email: string; role: string }) => {
      return apiRequest('/api/admin/assign-role', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "Role Assigned",
        description: "User role has been updated successfully.",
      });
      setRoleAssignment(roleAssignmentSchema);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign role",
        variant: "destructive",
      });
    }
  });

  // Check if user has admin access
  if (!user || !profile || profile.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50">
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
              <Link href="/">
                <Button variant="outline" size="sm">
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
              </Link>
            </div>
          </div>
        </nav>
        
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Access denied. This page is for administrators only.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const handleRoleAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleAssignment.email.trim()) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }
    assignRoleMutation.mutate(roleAssignment);
  };

  // Calculate percentage changes
  const weeklyChange = analytics ? 
    ((analytics.totalDeliveries.thisWeek - analytics.totalDeliveries.lastWeek) / 
     (analytics.totalDeliveries.lastWeek || 1) * 100) : 0;
  
  const monthlyChange = analytics ? 
    ((analytics.totalDeliveries.thisMonth - analytics.totalDeliveries.lastMonth) / 
     (analytics.totalDeliveries.lastMonth || 1) * 100) : 0;

  const revenueWeeklyChange = analytics ? 
    ((analytics.revenue.thisWeek - analytics.revenue.lastWeek) / 
     (analytics.revenue.lastWeek || 1) * 100) : 0;

  const revenueMonthlyChange = analytics ? 
    ((analytics.revenue.thisMonth - analytics.revenue.lastMonth) / 
     (analytics.revenue.lastMonth || 1) * 100) : 0;

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
              <span className="text-sm text-gray-600">Admin Dashboard</span>
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

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">
              Business analytics and system administration
            </p>
          </div>
        </div>

        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              Business Analytics
            </TabsTrigger>
            <TabsTrigger value="users">
              <Settings className="w-4 h-4 mr-2" />
              User Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            {loadingAnalytics ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading analytics...</p>
              </div>
            ) : analytics ? (
              <>
                {/* Key Metrics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Deliveries This Week</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analytics.totalDeliveries.thisWeek}</div>
                      <p className="text-xs text-muted-foreground">
                        <span className={weeklyChange >= 0 ? "text-green-600" : "text-red-600"}>
                          {weeklyChange >= 0 ? "+" : ""}{weeklyChange.toFixed(1)}%
                        </span>
                        {" from last week"}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Deliveries This Month</CardTitle>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analytics.totalDeliveries.thisMonth}</div>
                      <p className="text-xs text-muted-foreground">
                        <span className={monthlyChange >= 0 ? "text-green-600" : "text-red-600"}>
                          {monthlyChange >= 0 ? "+" : ""}{monthlyChange.toFixed(1)}%
                        </span>
                        {" from last month"}
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Active Drivers</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analytics.activeDrivers}</div>
                      <p className="text-xs text-muted-foreground">Drivers currently on duty</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                      <UserCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{analytics.totalCustomers}</div>
                      <p className="text-xs text-muted-foreground">Registered users</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Order Type Analysis */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Phone className="h-5 w-5" />
                        Order Channel Analysis
                      </CardTitle>
                      <CardDescription>Phone vs Online orders breakdown</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-blue-600" />
                          <span className="font-medium">Phone Orders</span>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{analytics.orderTypes.phone}</div>
                          <div className="text-sm text-muted-foreground">
                            {analytics.orderTypes.phonePercentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-green-600" />
                          <span className="font-medium">Online Orders</span>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{analytics.orderTypes.online}</div>
                          <div className="text-sm text-muted-foreground">
                            {analytics.orderTypes.onlinePercentage.toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      {/* Visual progress bars */}
                      <div className="space-y-2">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${analytics.orderTypes.phonePercentage}%` }}
                          ></div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full" 
                            style={{ width: `${analytics.orderTypes.onlinePercentage}%` }}
                          ></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Revenue Trends
                      </CardTitle>
                      <CardDescription>Weekly and monthly revenue performance</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">This Week</span>
                        <div className="text-right">
                          <div className="text-xl font-bold">${analytics.revenue.thisWeek.toFixed(2)}</div>
                          <div className="text-sm text-muted-foreground">
                            <span className={revenueWeeklyChange >= 0 ? "text-green-600" : "text-red-600"}>
                              {revenueWeeklyChange >= 0 ? "+" : ""}{revenueWeeklyChange.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="font-medium">This Month</span>
                        <div className="text-right">
                          <div className="text-xl font-bold">${analytics.revenue.thisMonth.toFixed(2)}</div>
                          <div className="text-sm text-muted-foreground">
                            <span className={revenueMonthlyChange >= 0 ? "text-green-600" : "text-red-600"}>
                              {revenueMonthlyChange >= 0 ? "+" : ""}{revenueMonthlyChange.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t">
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Avg. Delivery Time</span>
                          <span className="font-medium">{analytics.avgDeliveryTime}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Businesses */}
                {analytics.topBusinesses.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Top Performing Businesses
                      </CardTitle>
                      <CardDescription>Businesses with the most orders this month</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {analytics.topBusinesses.map((business, index) => (
                          <div key={business.name} className="flex justify-between items-center">
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center">
                                {index + 1}
                              </Badge>
                              <span className="font-medium">{business.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-bold">{business.orders}</span>
                              <span className="text-sm text-muted-foreground ml-1">orders</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No analytics data available</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            {/* Role Assignment Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Assign User Role
                </CardTitle>
                <CardDescription>
                  Assign or change user roles by email address
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRoleAssignment} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="user@example.com"
                        value={roleAssignment.email}
                        onChange={(e) => setRoleAssignment(prev => ({ ...prev, email: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Select 
                        value={roleAssignment.role} 
                        onValueChange={(value) => setRoleAssignment(prev => ({ ...prev, role: value as any }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">Customer</SelectItem>
                          <SelectItem value="driver">Driver</SelectItem>
                          <SelectItem value="dispatcher">Dispatcher</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    disabled={assignRoleMutation.isPending}
                    className="w-full md:w-auto"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {assignRoleMutation.isPending ? 'Assigning...' : 'Assign Role'}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Users List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  All Users ({allUsers.length})
                </CardTitle>
                <CardDescription>
                  View and manage all registered users
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading users...</p>
                  </div>
                ) : allUsers.length > 0 ? (
                  <div className="space-y-3">
                    {allUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{user.fullName || 'No name set'}</div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                          {user.phone && (
                            <div className="text-sm text-muted-foreground">{user.phone}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge 
                            variant={user.role === 'admin' ? 'default' : 'secondary'}
                            className={`
                              ${user.role === 'admin' ? 'bg-red-100 text-red-800 border-red-200' : ''}
                              ${user.role === 'dispatcher' ? 'bg-blue-100 text-blue-800 border-blue-200' : ''}
                              ${user.role === 'driver' ? 'bg-green-100 text-green-800 border-green-200' : ''}
                              ${user.role === 'customer' ? 'bg-gray-100 text-gray-800 border-gray-200' : ''}
                            `}
                          >
                            {user.role}
                          </Badge>
                          {user.role === 'driver' && (
                            <Badge variant={user.isOnDuty ? 'default' : 'secondary'}>
                              {user.isOnDuty ? 'On Duty' : 'Off Duty'}
                            </Badge>
                          )}
                          <div className="text-sm text-muted-foreground">
                            {user.totalDeliveries} deliveries
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No users found</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default AdminDashboard;