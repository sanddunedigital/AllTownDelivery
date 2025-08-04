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
import type { UserProfile, DeliveryRequest, Business, InsertBusiness } from '@shared/schema';
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
  Mail,
  Store,
  Plus,
  ToggleLeft,
  ToggleRight,
  Edit,
  X,
  Check,
  User,
  ChevronDown,
  LogOut,
  Truck
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { BusinessImageUpload } from '../components/BusinessImageUpload';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns';

interface BusinessSettings {
  logoUrl?: string;
  businessName?: string;
}

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

// Business form schema
const businessFormSchema = {
  name: '',
  phone: '',
  address: '',
  website: '',
  orderingInstructions: '',
  category: '',
  imageUrl: null as string | null
};

// Edit business form schema
const editBusinessFormSchema = {
  id: '',
  name: '',
  phone: '',
  address: '',
  website: '',
  orderingInstructions: '',
  category: '',
  imageUrl: null as string | null
};

function AdminDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [roleAssignment, setRoleAssignment] = useState(roleAssignmentSchema);
  const [businessForm, setBusinessForm] = useState(businessFormSchema);
  const [editBusinessForm, setEditBusinessForm] = useState(editBusinessFormSchema);
  const [editingBusinessId, setEditingBusinessId] = useState<string | null>(null);

  // Fetch business settings for branding
  const { data: businessSettings } = useQuery<BusinessSettings>({
    queryKey: ['/api/business-settings'],
    refetchInterval: 300000, // Refresh every 5 minutes
  });

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

  // Fetch all businesses for management
  const { data: allBusinesses = [], isLoading: loadingBusinesses } = useQuery<Business[]>({
    queryKey: ['/api/admin/businesses'],
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

  // Add business mutation
  const addBusinessMutation = useMutation({
    mutationFn: async (data: InsertBusiness) => {
      return apiRequest('/api/admin/businesses', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/businesses'] });
      toast({
        title: "Business Added",
        description: "New business has been added successfully.",
      });
      setBusinessForm(businessFormSchema);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add business",
        variant: "destructive",
      });
    }
  });

  // Toggle business status mutation
  const toggleBusinessMutation = useMutation({
    mutationFn: async (data: { id: string; isActive: boolean }) => {
      return apiRequest(`/api/admin/businesses/${data.id}/toggle`, 'PATCH', { isActive: data.isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/businesses'] });
      toast({
        title: "Business Updated",
        description: "Business status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update business status",
        variant: "destructive",
      });
    }
  });

  // Edit business mutation
  const editBusinessMutation = useMutation({
    mutationFn: async (data: { id: string; updates: Omit<InsertBusiness, 'id'> }) => {
      return apiRequest(`/api/admin/businesses/${data.id}`, 'PATCH', data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/businesses'] });
      toast({
        title: "Business Updated",
        description: "Business information has been updated successfully.",
      });
      setEditingBusinessId(null);
      setEditBusinessForm(editBusinessFormSchema);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update business",
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
                {businessSettings?.logoUrl ? (
                  <img 
                    src={businessSettings.logoUrl} 
                    alt={`${businessSettings.businessName || "Business"} Logo`} 
                    className="h-[7.5em] w-auto"
                  />
                ) : (
                  <img 
                    src="https://www.sarasquickiedelivery.com/uploads/b/355ffb41d51d1587e36487d7e874ef8e616e85c920dc275424910629c86f9cde/D40F3E6C-CFC1-4A36-B60A-A2E3D2E0596F_1678667317.jpeg?width=400" 
                    alt="Sara's Quickie Delivery Logo" 
                    className="h-[7.5em] w-auto"
                  />
                )}
                <span className="ml-3 text-lg font-bold text-primary">
                  {businessSettings?.businessName || "Sara's Quickie Delivery"}
                </span>
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

  const handleAddBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessForm.name.trim() || !businessForm.phone.trim() || !businessForm.address.trim() || !businessForm.orderingInstructions.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    addBusinessMutation.mutate(businessForm);
  };

  const handleEditBusiness = (business: Business) => {
    setEditBusinessForm({
      id: business.id,
      name: business.name,
      phone: business.phone,
      address: business.address,
      website: business.website || '',
      orderingInstructions: business.orderingInstructions,
      category: business.category || '',
      imageUrl: business.imageUrl || null
    });
    setEditingBusinessId(business.id);
    
    // Scroll to edit form after state update
    setTimeout(() => {
      const editForm = document.getElementById('edit-business-form');
      if (editForm) {
        editForm.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
      }
    }, 100);
  };

  const handleUpdateBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBusinessForm.name.trim() || !editBusinessForm.phone.trim() || !editBusinessForm.address.trim() || !editBusinessForm.orderingInstructions.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    const { id, ...updates } = editBusinessForm;
    editBusinessMutation.mutate({ id, updates });
  };

  const handleCancelEdit = () => {
    setEditingBusinessId(null);
    setEditBusinessForm(editBusinessFormSchema);
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
              {businessSettings?.logoUrl ? (
                <img 
                  src={businessSettings.logoUrl} 
                  alt={`${businessSettings.businessName || "Business"} Logo`} 
                  className="h-[7.5em] w-auto"
                />
              ) : (
                <img 
                  src="https://www.sarasquickiedelivery.com/uploads/b/355ffb41d51d1587e36487d7e874ef8e616e85c920dc275424910629c86f9cde/D40F3E6C-CFC1-4A36-B60A-A2E3D2E0596F_1678667317.jpeg?width=400" 
                  alt="Sara's Quickie Delivery Logo" 
                  className="h-[7.5em] w-auto"
                />
              )}
              <span className="ml-3 text-lg font-bold text-primary">
                {businessSettings?.businessName || "Sara's Quickie Delivery"}
              </span>
            </Link>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Admin Dashboard</span>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">{profile?.fullName || user?.email || 'User'}</span>
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <div className="text-sm font-medium">{profile?.fullName || user?.email || 'User'}</div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/" className="flex items-center w-full">
                      <Home className="w-4 h-4 mr-2" />
                      Home
                    </Link>
                  </DropdownMenuItem>
                  
                  {/* Driver Portal */}
                  <DropdownMenuItem asChild>
                    <Link href="/driver" className="flex items-center w-full">
                      <Truck className="w-4 h-4 mr-2" />
                      Driver Portal
                    </Link>
                  </DropdownMenuItem>
                  
                  {/* Dispatch Center */}
                  <DropdownMenuItem asChild>
                    <Link href="/dispatch" className="flex items-center w-full">
                      <Globe className="w-4 h-4 mr-2" />
                      Dispatch Center
                    </Link>
                  </DropdownMenuItem>
                  
                  {/* Business Settings */}
                  <DropdownMenuItem asChild>
                    <Link href="/business-settings" className="flex items-center w-full">
                      <Settings className="w-4 h-4 mr-2" />
                      Business Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/auth" className="flex items-center w-full text-red-600">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analytics">
              <BarChart3 className="w-4 h-4 mr-2" />
              Business Analytics
            </TabsTrigger>
            <TabsTrigger value="users">
              <Settings className="w-4 h-4 mr-2" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="businesses">
              <Store className="w-4 h-4 mr-2" />
              Business Network
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

          <TabsContent value="businesses" className="space-y-6">
            {/* Edit Business Form - Show only when editing */}
            {editingBusinessId && (
              <Card id="edit-business-form" className="border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Edit className="w-5 h-5" />
                    Edit Business
                  </CardTitle>
                  <CardDescription>
                    Update business information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateBusiness} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-business-name">Business Name *</Label>
                        <Input
                          id="edit-business-name"
                          value={editBusinessForm.name}
                          onChange={(e) => setEditBusinessForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter business name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-business-phone">Phone Number *</Label>
                        <Input
                          id="edit-business-phone"
                          value={editBusinessForm.phone}
                          onChange={(e) => setEditBusinessForm(prev => ({ ...prev, phone: e.target.value }))}
                          placeholder="(641) 555-0123"
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-business-address">Address *</Label>
                      <Input
                        id="edit-business-address"
                        value={editBusinessForm.address}
                        onChange={(e) => setEditBusinessForm(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="123 Main St, Oskaloosa, IA 52577"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-business-website">Website</Label>
                        <Input
                          id="edit-business-website"
                          value={editBusinessForm.website}
                          onChange={(e) => setEditBusinessForm(prev => ({ ...prev, website: e.target.value }))}
                          placeholder="https://example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-business-category">Category</Label>
                        <Select value={editBusinessForm.category} onValueChange={(value) => setEditBusinessForm(prev => ({ ...prev, category: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="restaurant">Restaurant</SelectItem>
                            <SelectItem value="grocery">Grocery Store</SelectItem>
                            <SelectItem value="retail">Retail Store</SelectItem>
                            <SelectItem value="pharmacy">Pharmacy</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <BusinessImageUpload
                      currentImageUrl={editBusinessForm.imageUrl || undefined}
                      onImageChange={(imageUrl) => setEditBusinessForm(prev => ({ ...prev, imageUrl }))}
                      businessId={editBusinessForm.id}
                      businessName={editBusinessForm.name}
                    />

                    <div className="space-y-2">
                      <Label htmlFor="edit-business-instructions">Ordering Instructions *</Label>
                      <Input
                        id="edit-business-instructions"
                        value={editBusinessForm.orderingInstructions}
                        onChange={(e) => setEditBusinessForm(prev => ({ ...prev, orderingInstructions: e.target.value }))}
                        placeholder="How customers should place orders (e.g., Call ahead, Online ordering available)"
                        required
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        type="submit" 
                        disabled={editBusinessMutation.isPending}
                        className="flex-1"
                      >
                        <Check className="w-4 h-4 mr-2" />
                        {editBusinessMutation.isPending ? 'Updating...' : 'Update Business'}
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={handleCancelEdit}
                        className="flex-1"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Add New Business Form - Hide when editing */}
            {!editingBusinessId && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Add New Business
                  </CardTitle>
                  <CardDescription>
                    Add a new business to the delivery network
                  </CardDescription>
                </CardHeader>
              <CardContent>
                <form onSubmit={handleAddBusiness} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="business-name">Business Name *</Label>
                      <Input
                        id="business-name"
                        value={businessForm.name}
                        onChange={(e) => setBusinessForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter business name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="business-phone">Phone Number *</Label>
                      <Input
                        id="business-phone"
                        value={businessForm.phone}
                        onChange={(e) => setBusinessForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="(641) 555-0123"
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="business-address">Address *</Label>
                    <Input
                      id="business-address"
                      value={businessForm.address}
                      onChange={(e) => setBusinessForm(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="123 Main St, Oskaloosa, IA 52577"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="business-website">Website</Label>
                      <Input
                        id="business-website"
                        value={businessForm.website}
                        onChange={(e) => setBusinessForm(prev => ({ ...prev, website: e.target.value }))}
                        placeholder="https://example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="business-category">Category</Label>
                      <Select value={businessForm.category} onValueChange={(value) => setBusinessForm(prev => ({ ...prev, category: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="restaurant">Restaurant</SelectItem>
                          <SelectItem value="grocery">Grocery Store</SelectItem>
                          <SelectItem value="retail">Retail Store</SelectItem>
                          <SelectItem value="pharmacy">Pharmacy</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <BusinessImageUpload
                    currentImageUrl={businessForm.imageUrl || undefined}
                    onImageChange={(imageUrl) => setBusinessForm(prev => ({ ...prev, imageUrl }))}
                    businessName={businessForm.name}
                  />

                  <div className="space-y-2">
                    <Label htmlFor="business-instructions">Ordering Instructions *</Label>
                    <Input
                      id="business-instructions"
                      value={businessForm.orderingInstructions}
                      onChange={(e) => setBusinessForm(prev => ({ ...prev, orderingInstructions: e.target.value }))}
                      placeholder="How customers should place orders (e.g., Call ahead, Online ordering available)"
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    disabled={addBusinessMutation.isPending}
                    className="w-full"
                  >
                    {addBusinessMutation.isPending ? 'Adding Business...' : 'Add Business'}
                  </Button>
                </form>
              </CardContent>
            </Card>
            )}

            {/* Business List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Store className="w-5 h-5" />
                  Business Network ({allBusinesses.length})
                </CardTitle>
                <CardDescription>
                  Manage participating businesses and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingBusinesses ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading businesses...</p>
                  </div>
                ) : allBusinesses.length > 0 ? (
                  <div className="space-y-3">
                    {allBusinesses.map((business) => (
                      <div key={business.id} className="flex items-start justify-between p-4 border rounded-lg">
                        <div className="flex gap-4 flex-1">
                          {business.imageUrl && (
                            <div className="flex-shrink-0">
                              <img
                                src={business.imageUrl}
                                alt={business.name}
                                className="w-16 h-16 object-cover rounded-lg border"
                              />
                            </div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <div className="font-medium text-lg">{business.name}</div>
                              <Badge 
                                variant={business.isActive ? 'default' : 'secondary'}
                                className={business.isActive ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-800 border-gray-200'}
                              >
                                {business.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                              {business.category && (
                                <Badge variant="outline">
                                  {business.category}
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground mt-1">
                            <div className="flex items-center gap-2">
                              <Phone className="w-3 h-3" />
                              {business.phone}
                            </div>
                            <div className="mt-1">{business.address}</div>
                            {business.website && (
                              <div className="flex items-center gap-2 mt-1">
                                <Globe className="w-3 h-3" />
                                <a href={business.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                  {business.website}
                                </a>
                              </div>
                            )}
                            <div className="mt-2 text-xs">
                              <strong>Ordering:</strong> {business.orderingInstructions}
                            </div>
                          </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditBusiness(business)}
                            disabled={editingBusinessId === business.id}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleBusinessMutation.mutate({ 
                              id: business.id, 
                              isActive: !business.isActive 
                            })}
                            disabled={toggleBusinessMutation.isPending}
                          >
                            {business.isActive ? (
                              <>
                                <ToggleRight className="w-4 h-4 mr-1" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="w-4 h-4 mr-1" />
                                Activate
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Store className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-muted-foreground">No businesses in the network yet</p>
                    <p className="text-sm text-muted-foreground">Add your first business above to get started</p>
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