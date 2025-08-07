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
import { Switch } from '../components/ui/switch';
import { Textarea } from '../components/ui/textarea';
import { Separator } from '../components/ui/separator';
import { toast } from '../hooks/use-toast';
import { apiRequest } from '../lib/queryClient';
import { 
  Settings, 
  DollarSign, 
  Clock, 
  MapPin, 
  Palette, 
  Globe, 
  Phone, 
  Mail,
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  Home,
  User,
  ChevronDown,
  LogOut,
  Truck
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { LogoUpload } from '../components/LogoUpload';

interface LogoBusinessSettings {
  logoUrl?: string;
  businessName?: string;
}

interface BusinessSettings {
  id?: string;
  tenantId: string;
  businessName: string;
  businessEmail: string;
  businessPhone: string;
  businessAddress: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  currency: string;
  timezone: string;
  businessHours: {
    monday: { open: string; close: string; closed: boolean };
    tuesday: { open: string; close: string; closed: boolean };
    wednesday: { open: string; close: string; closed: boolean };
    thursday: { open: string; close: string; closed: boolean };
    friday: { open: string; close: string; closed: boolean };
    saturday: { open: string; close: string; closed: boolean };
    sunday: { open: string; close: string; closed: boolean };
  };
  deliveryPricing: {
    basePrice: number;
    pricePerMile: number;
    minimumOrder: number;
    freeDeliveryThreshold: number; // Keep for backward compatibility but will be hidden
    rushDeliveryMultiplier: number;
  };
  loyaltyProgram: {
    deliveriesForFreeDelivery: number;
  };
  distanceSettings: {
    baseFeeRadius: number;
  };
  notifications: {
    emailNotifications: boolean;
    smsNotifications: boolean;
    customerUpdates: boolean;
    driverAlerts: boolean;
  };
  features: {
    loyaltyProgram: boolean;
    realTimeTracking: boolean;
    scheduledDeliveries: boolean;
    multiplePaymentMethods: boolean;
  };
  googleReviews?: {
    placeId?: string;
    enabled: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}

interface ServiceZone {
  id?: string;
  tenantId: string;
  name: string;
  description: string;
  coordinates: string; // JSON string of coordinates
  deliveryFee: number;
  estimatedTime: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const defaultBusinessHours = {
  monday: { open: '09:00', close: '17:00', closed: false },
  tuesday: { open: '09:00', close: '17:00', closed: false },
  wednesday: { open: '09:00', close: '17:00', closed: false },
  thursday: { open: '09:00', close: '17:00', closed: false },
  friday: { open: '09:00', close: '17:00', closed: false },
  saturday: { open: '10:00', close: '16:00', closed: false },
  sunday: { open: '12:00', close: '16:00', closed: true }
};

const defaultSettings: Partial<BusinessSettings> = {
  businessName: "Sara's Quickie Delivery",
  businessEmail: "contact@sarasquickiedelivery.com",
  businessPhone: "(641) 673-0123",
  businessAddress: "Oskaloosa, IA",
  primaryColor: "#0369a1",
  secondaryColor: "#64748b",
  accentColor: "#ea580c",
  currency: "USD",
  timezone: "America/Chicago",
  businessHours: defaultBusinessHours,
  deliveryPricing: {
    basePrice: 3.00,
    pricePerMile: 1.50,
    minimumOrder: 10.00,
    freeDeliveryThreshold: 50.00,
    rushDeliveryMultiplier: 1.5
  },
  loyaltyProgram: {
    deliveriesForFreeDelivery: 10
  },
  distanceSettings: {
    baseFeeRadius: 10.0
  },
  notifications: {
    emailNotifications: true,
    smsNotifications: false,
    customerUpdates: true,
    driverAlerts: true
  },
  features: {
    loyaltyProgram: true,
    realTimeTracking: true,
    scheduledDeliveries: false,
    multiplePaymentMethods: true
  },
  googleReviews: {
    placeId: "",
    enabled: false
  }
};

export default function BusinessSettingsPage() {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<BusinessSettings>(defaultSettings as BusinessSettings);
  const [newZone, setNewZone] = useState<Partial<ServiceZone>>({
    name: '',
    description: '',
    coordinates: '',
    deliveryFee: 5.00,
    estimatedTime: '30-45 minutes',
    isActive: true
  });

  // Fetch logo business settings for header
  const { data: logoBusinessSettings } = useQuery<LogoBusinessSettings>({
    queryKey: ['/api/business-settings'],
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // Fetch business settings
  const { data: businessSettings, isLoading: loadingSettings } = useQuery<BusinessSettings>({
    queryKey: ['/api/admin/business-settings'],
    enabled: !!user && profile?.role === 'admin'
  });

  // Fetch service zones
  const { data: serviceZones = [], isLoading: loadingZones } = useQuery<ServiceZone[]>({
    queryKey: ['/api/admin/service-zones'],
    enabled: !!user && profile?.role === 'admin'
  });

  // Update settings state when data is loaded
  useEffect(() => {
    if (businessSettings) {
      setSettings({
        ...defaultSettings,
        ...businessSettings,
        features: { ...defaultSettings.features, ...businessSettings.features },
        notifications: { ...defaultSettings.notifications, ...businessSettings.notifications },
        deliveryPricing: { ...defaultSettings.deliveryPricing, ...businessSettings.deliveryPricing },
        businessHours: { ...defaultBusinessHours, ...businessSettings.businessHours }
      } as BusinessSettings);
    }
  }, [businessSettings]);

  // Save business settings mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (data: BusinessSettings) => {
      return apiRequest('/api/admin/business-settings', 'PUT', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/business-settings'] });
      toast({
        title: "Settings Saved",
        description: "Business settings have been saved to the database successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    }
  });

  // Create service zone mutation
  const createZoneMutation = useMutation({
    mutationFn: async (data: Partial<ServiceZone>) => {
      return apiRequest('/api/admin/service-zones', 'POST', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/service-zones'] });
      setNewZone({
        name: '',
        description: '',
        coordinates: '',
        deliveryFee: 5.00,
        estimatedTime: '30-45 minutes',
        isActive: true
      });
      toast({
        title: "Zone Created",
        description: "Service zone has been created successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create service zone",
        variant: "destructive",
      });
    }
  });

  // Delete service zone mutation
  const deleteZoneMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/service-zones/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/service-zones'] });
      toast({
        title: "Zone Deleted",
        description: "Service zone has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete service zone",
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
                {logoBusinessSettings?.logoUrl ? (
                  <img 
                    src={logoBusinessSettings.logoUrl} 
                    alt={`${logoBusinessSettings.businessName || "Business"} Logo`} 
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
                  {logoBusinessSettings?.businessName || "Sara's Quickie Delivery"}
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

  const handleSaveSettings = () => {
    saveSettingsMutation.mutate(settings);
  };

  const handleCreateZone = () => {
    if (!newZone.name || !newZone.description) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }
    createZoneMutation.mutate(newZone);
  };

  const updateBusinessHours = (day: string, field: string, value: string | boolean) => {
    setSettings(prev => ({
      ...prev,
      businessHours: {
        ...prev.businessHours,
        [day]: {
          ...prev.businessHours[day as keyof typeof prev.businessHours],
          [field]: value
        }
      }
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center hover:opacity-80 transition-opacity">
              {logoBusinessSettings?.logoUrl ? (
                <img 
                  src={logoBusinessSettings.logoUrl} 
                  alt={`${logoBusinessSettings.businessName || "Business"} Logo`} 
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
                {logoBusinessSettings?.businessName || "Sara's Quickie Delivery"}
              </span>
            </Link>
            <div className="flex items-center space-x-4">
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
                  
                  {/* Admin Dashboard */}
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="flex items-center w-full">
                      <Settings className="w-4 h-4 mr-2" />
                      Admin Dashboard
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
            <h1 className="text-3xl font-bold">Business Settings</h1>
            <p className="text-muted-foreground">
              Configure your delivery service preferences and pricing
            </p>
          </div>
          <Button 
            onClick={handleSaveSettings}
            disabled={saveSettingsMutation.isPending}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saveSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>

        {loadingSettings ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading business settings...</p>
          </div>
        ) : (
          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="general">
                <Settings className="w-4 h-4 mr-2" />
                General
              </TabsTrigger>
              <TabsTrigger value="pricing">
                <DollarSign className="w-4 h-4 mr-2" />
                Pricing
              </TabsTrigger>
              <TabsTrigger value="hours">
                <Clock className="w-4 h-4 mr-2" />
                Hours
              </TabsTrigger>
              <TabsTrigger value="zones">
                <MapPin className="w-4 h-4 mr-2" />
                Service Zones
              </TabsTrigger>
              <TabsTrigger value="branding">
                <Palette className="w-4 h-4 mr-2" />
                Branding
              </TabsTrigger>
              <TabsTrigger value="reviews">
                <Globe className="w-4 h-4 mr-2" />
                Reviews
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Business Information</CardTitle>
                  <CardDescription>Basic information about your delivery service</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business Name</Label>
                      <Input
                        id="businessName"
                        value={settings.businessName}
                        onChange={(e) => setSettings(prev => ({ ...prev, businessName: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessEmail">Business Email</Label>
                      <Input
                        id="businessEmail"
                        type="email"
                        value={settings.businessEmail}
                        onChange={(e) => setSettings(prev => ({ ...prev, businessEmail: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessPhone">Business Phone</Label>
                      <Input
                        id="businessPhone"
                        value={settings.businessPhone}
                        onChange={(e) => setSettings(prev => ({ ...prev, businessPhone: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select
                        value={settings.timezone}
                        onValueChange={(value) => setSettings(prev => ({ ...prev, timezone: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="America/Chicago">Central Time (Chicago)</SelectItem>
                          <SelectItem value="America/New_York">Eastern Time (New York)</SelectItem>
                          <SelectItem value="America/Los_Angeles">Pacific Time (Los Angeles)</SelectItem>
                          <SelectItem value="America/Denver">Mountain Time (Denver)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="businessAddress">Business Address</Label>
                    <Textarea
                      id="businessAddress"
                      value={settings.businessAddress}
                      onChange={(e) => setSettings(prev => ({ ...prev, businessAddress: e.target.value }))}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Features & Notifications</CardTitle>
                  <CardDescription>Configure service features and notification preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <h4 className="text-sm font-medium mb-4">Service Features</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Loyalty Program</Label>
                          <p className="text-sm text-muted-foreground">Enable customer loyalty points and rewards</p>
                        </div>
                        <Switch
                          checked={settings.features.loyaltyProgram}
                          onCheckedChange={(checked) => setSettings(prev => ({
                            ...prev,
                            features: { ...prev.features, loyaltyProgram: checked }
                          }))}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Real-Time Tracking</Label>
                          <p className="text-sm text-muted-foreground">Live delivery status updates for customers</p>
                        </div>
                        <Switch
                          checked={settings.features.realTimeTracking}
                          onCheckedChange={(checked) => setSettings(prev => ({
                            ...prev,
                            features: { ...prev.features, realTimeTracking: checked }
                          }))}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Scheduled Deliveries</Label>
                          <p className="text-sm text-muted-foreground">Allow customers to schedule future deliveries</p>
                        </div>
                        <Switch
                          checked={settings.features.scheduledDeliveries}
                          onCheckedChange={(checked) => setSettings(prev => ({
                            ...prev,
                            features: { ...prev.features, scheduledDeliveries: checked }
                          }))}
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="text-sm font-medium mb-4">Notifications</h4>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Email Notifications</Label>
                          <p className="text-sm text-muted-foreground">Send notifications via email</p>
                        </div>
                        <Switch
                          checked={settings.notifications.emailNotifications}
                          onCheckedChange={(checked) => setSettings(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, emailNotifications: checked }
                          }))}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Customer Updates</Label>
                          <p className="text-sm text-muted-foreground">Automatically notify customers of delivery status changes</p>
                        </div>
                        <Switch
                          checked={settings.notifications.customerUpdates}
                          onCheckedChange={(checked) => setSettings(prev => ({
                            ...prev,
                            notifications: { ...prev.notifications, customerUpdates: checked }
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="pricing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Delivery Pricing</CardTitle>
                  <CardDescription>Configure your delivery fees and pricing structure</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="basePrice">Base Delivery Fee ($)</Label>
                      <Input
                        id="basePrice"
                        type="number"
                        step="0.01"
                        value={settings.deliveryPricing.basePrice}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          deliveryPricing: { ...prev.deliveryPricing, basePrice: parseFloat(e.target.value) || 0 }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pricePerMile">Price Per Mile ($)</Label>
                      <Input
                        id="pricePerMile"
                        type="number"
                        step="0.01"
                        value={settings.deliveryPricing.pricePerMile}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          deliveryPricing: { ...prev.deliveryPricing, pricePerMile: parseFloat(e.target.value) || 0 }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="minimumOrder">Minimum Order ($)</Label>
                      <Input
                        id="minimumOrder"
                        type="number"
                        step="0.01"
                        value={settings.deliveryPricing.minimumOrder}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          deliveryPricing: { ...prev.deliveryPricing, minimumOrder: parseFloat(e.target.value) || 0 }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deliveriesForFree">Deliveries Until Free Delivery</Label>
                      <Input
                        id="deliveriesForFree"
                        type="number"
                        step="1"
                        min="1"
                        value={settings.loyaltyProgram.deliveriesForFreeDelivery}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          loyaltyProgram: { ...prev.loyaltyProgram, deliveriesForFreeDelivery: parseInt(e.target.value) || 10 }
                        }))}
                      />
                      <p className="text-sm text-gray-600">
                        After this many paid deliveries, customers earn 1 free delivery credit
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="baseFeeRadius">Base Fee Radius (miles)</Label>
                      <Input
                        id="baseFeeRadius"
                        type="number"
                        step="0.1"
                        min="0"
                        value={settings.distanceSettings.baseFeeRadius}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          distanceSettings: { ...prev.distanceSettings, baseFeeRadius: parseFloat(e.target.value) || 10.0 }
                        }))}
                      />
                      <p className="text-sm text-gray-600">
                        Deliveries within this distance get base fee only. Beyond this, per-mile charges apply.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rushMultiplier">Rush Delivery Multiplier</Label>
                      <Input
                        id="rushMultiplier"
                        type="number"
                        step="0.1"
                        value={settings.deliveryPricing.rushDeliveryMultiplier}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          deliveryPricing: { ...prev.deliveryPricing, rushDeliveryMultiplier: parseFloat(e.target.value) || 1 }
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={settings.currency}
                        onValueChange={(value) => setSettings(prev => ({ ...prev, currency: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD ($)</SelectItem>
                          <SelectItem value="CAD">CAD ($)</SelectItem>
                          <SelectItem value="EUR">EUR (€)</SelectItem>
                          <SelectItem value="GBP">GBP (£)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="hours" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Business Hours</CardTitle>
                  <CardDescription>Set your operating hours for each day of the week</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(settings.businessHours).map(([day, hours]) => (
                    <div key={day} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className="w-24">
                          <Label className="capitalize font-medium">{day}</Label>
                        </div>
                        <Switch
                          checked={!hours.closed}
                          onCheckedChange={(checked) => updateBusinessHours(day, 'closed', !checked)}
                        />
                        <span className="text-sm text-muted-foreground">
                          {hours.closed ? 'Closed' : 'Open'}
                        </span>
                      </div>
                      {!hours.closed && (
                        <div className="flex items-center space-x-2">
                          <Input
                            type="time"
                            value={hours.open}
                            onChange={(e) => updateBusinessHours(day, 'open', e.target.value)}
                            className="w-32"
                          />
                          <span className="text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={hours.close}
                            onChange={(e) => updateBusinessHours(day, 'close', e.target.value)}
                            className="w-32"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="zones" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Service Zones</CardTitle>
                  <CardDescription>Define delivery areas with custom pricing and time estimates</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Add new zone form */}
                  <div className="border rounded-lg p-4 space-y-4">
                    <h4 className="font-medium">Add New Service Zone</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="zoneName">Zone Name</Label>
                        <Input
                          id="zoneName"
                          value={newZone.name || ''}
                          onChange={(e) => setNewZone(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Downtown Area"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zoneDescription">Description</Label>
                        <Input
                          id="zoneDescription"
                          value={newZone.description || ''}
                          onChange={(e) => setNewZone(prev => ({ ...prev, description: e.target.value }))}
                          placeholder="Central business district"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zoneFee">Delivery Fee ($)</Label>
                        <Input
                          id="zoneFee"
                          type="number"
                          step="0.01"
                          value={newZone.deliveryFee || 0}
                          onChange={(e) => setNewZone(prev => ({ ...prev, deliveryFee: parseFloat(e.target.value) || 0 }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="zoneTime">Estimated Time</Label>
                        <Input
                          id="zoneTime"
                          value={newZone.estimatedTime || ''}
                          onChange={(e) => setNewZone(prev => ({ ...prev, estimatedTime: e.target.value }))}
                          placeholder="30-45 minutes"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handleCreateZone}
                      disabled={createZoneMutation.isPending}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {createZoneMutation.isPending ? 'Creating...' : 'Add Service Zone'}
                    </Button>
                  </div>

                  {/* Existing zones */}
                  <div className="space-y-4">
                    {loadingZones ? (
                      <p className="text-center text-muted-foreground">Loading service zones...</p>
                    ) : serviceZones.length > 0 ? (
                      serviceZones.map((zone) => (
                        <div key={zone.id} className="border rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{zone.name}</h4>
                                <Badge variant={zone.isActive ? "default" : "secondary"}>
                                  {zone.isActive ? "Active" : "Inactive"}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{zone.description}</p>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" />
                                  ${Number(zone.deliveryFee || 0).toFixed(2)}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {zone.estimatedTime}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteZoneMutation.mutate(zone.id!)}
                              disabled={deleteZoneMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-muted-foreground">No service zones configured yet</p>
                        <p className="text-sm text-muted-foreground">Add your first service zone above</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="branding" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Brand Customization</CardTitle>
                  <CardDescription>Customize the look and feel of your delivery platform</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primaryColor">Primary Color</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="primaryColor"
                          type="color"
                          value={settings.primaryColor}
                          onChange={(e) => setSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                          className="w-20 h-10"
                        />
                        <Input
                          value={settings.primaryColor}
                          onChange={(e) => setSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                          placeholder="#0369a1"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="secondaryColor">Secondary Color</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="secondaryColor"
                          type="color"
                          value={settings.secondaryColor}
                          onChange={(e) => setSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                          className="w-20 h-10"
                        />
                        <Input
                          value={settings.secondaryColor}
                          onChange={(e) => setSettings(prev => ({ ...prev, secondaryColor: e.target.value }))}
                          placeholder="#64748b"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="accentColor">Accent Color</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="accentColor"
                          type="color"
                          value={settings.accentColor}
                          onChange={(e) => setSettings(prev => ({ ...prev, accentColor: e.target.value }))}
                          className="w-20 h-10"
                        />
                        <Input
                          value={settings.accentColor}
                          onChange={(e) => setSettings(prev => ({ ...prev, accentColor: e.target.value }))}
                          placeholder="#ea580c"
                        />
                      </div>
                    </div>
                  </div>
                  <LogoUpload
                    currentLogoUrl={settings.logoUrl}
                    onLogoChange={(logoUrl) => setSettings(prev => ({ ...prev, logoUrl: logoUrl || undefined }))}
                    businessName={settings.businessName}
                  />
                  
                  <div className="border rounded-lg p-4 space-y-2">
                    <Label>Preview</Label>
                    <div className="bg-gray-50 p-4 rounded border" style={{ backgroundColor: settings.secondaryColor + '10' }}>
                      <div className="flex items-center space-x-3 mb-4">
                        {settings.logoUrl && (
                          <img 
                            src={settings.logoUrl} 
                            alt="Business Logo" 
                            className="h-8 w-auto object-contain"
                          />
                        )}
                        <div 
                          className="text-lg font-bold" 
                          style={{ color: settings.primaryColor }}
                        >
                          {settings.businessName}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: settings.primaryColor }}></div>
                          <span className="text-xs">Primary</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: settings.secondaryColor }}></div>
                          <span className="text-xs">Secondary</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: settings.accentColor }}></div>
                          <span className="text-xs">Accent</span>
                        </div>
                      </div>
                      <button 
                        className="px-4 py-2 rounded text-white text-sm"
                        style={{ backgroundColor: settings.accentColor }}
                      >
                        Sample Button
                      </button>
                      <p className="text-sm text-muted-foreground mt-2">This is how your brand colors and logo will appear</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reviews" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Google Reviews Integration
                    <Badge variant="secondary" className="ml-2">Premium Feature</Badge>
                  </CardTitle>
                  <CardDescription>
                    Display Google Reviews on your website. This premium feature costs $20/month and automatically syncs your Google Business reviews weekly.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <Switch
                        checked={settings.googleReviews?.enabled || false}
                        onCheckedChange={(checked) => setSettings(prev => ({
                          ...prev,
                          googleReviews: { ...prev.googleReviews, enabled: checked }
                        }))}
                      />
                      <div>
                        <Label className="text-base font-medium">Enable Google Reviews</Label>
                        <p className="text-sm text-gray-600">
                          Show Google Reviews on your customer-facing pages
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      $20/month
                    </Badge>
                  </div>

                  {settings.googleReviews?.enabled && (
                    <div className="space-y-4 p-4 border rounded-lg">
                      <div className="space-y-2">
                        <Label htmlFor="googlePlaceId">Google Place ID</Label>
                        <Input
                          id="googlePlaceId"
                          value={settings.googleReviews?.placeId || ''}
                          onChange={(e) => setSettings(prev => ({
                            ...prev,
                            googleReviews: { ...prev.googleReviews, placeId: e.target.value }
                          }))}
                          placeholder="ChIJN1t_tDeuEmsRUsoyG83frY4"
                        />
                        <p className="text-sm text-gray-600">
                          Enter your Google Business Place ID. You can find this by searching for your business on Google Maps and copying the ID from the URL.
                        </p>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-medium text-blue-900 mb-2">How to find your Google Place ID:</h4>
                        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                          <li>Search for your business on Google Maps</li>
                          <li>Click on your business listing</li>
                          <li>Copy the long ID from the URL (after "place/") </li>
                          <li>Paste it in the field above</li>
                        </ol>
                      </div>

                      {settings.googleReviews?.placeId && (
                        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-green-800 font-medium">Google Reviews Configured</span>
                          </div>
                          <p className="text-sm text-green-700">
                            Reviews will be automatically fetched when enabled and displayed on your customer-facing pages.
                          </p>
                          {updateMutation.isPending && (
                            <div className="mt-3 bg-blue-50 p-3 rounded border border-blue-200">
                              <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                <span className="text-blue-800 text-sm font-medium">Fetching reviews...</span>
                              </div>
                              <p className="text-xs text-blue-700 mt-1">
                                Loading your Google Reviews from the API
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="p-4 border rounded-lg bg-yellow-50 border-yellow-200">
                    <h4 className="font-medium text-yellow-900 mb-2">Premium Feature Benefits:</h4>
                    <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
                      <li>Automatic weekly sync with Google Business Profile</li>
                      <li>Professional review display on your website</li>
                      <li>Star ratings and customer testimonials</li>
                      <li>Builds customer trust and credibility</li>
                      <li>No API rate limits or manual updates needed</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}