import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { ChangePasswordForm } from '@/components/ui/change-password-form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trophy, Star, Gift, MapPin, Phone, Mail, User, Home } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface LogoBusinessSettings {
  logoUrl?: string;
  businessName?: string;
}

interface LoyaltyInfo {
  loyaltyPoints: number;
  totalDeliveries: number;
  freeDeliveryCredits: number;
  eligibleForFreeDelivery: boolean;
  deliveriesUntilNextFree: number;
}

interface BusinessSettings {
  features?: {
    loyaltyProgram?: boolean;
  };
}

function UserProfile({ businessSettings }: { businessSettings?: BusinessSettings }) {
  const { user, profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [loyaltyInfo, setLoyaltyInfo] = useState<LoyaltyInfo | null>(null);
  const [editing, setEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: profile?.fullName || '',
    phone: profile?.phone || '',
    defaultDeliveryAddress: profile?.defaultDeliveryAddress || '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        fullName: profile.fullName || '',
        phone: profile.phone || '',
        defaultDeliveryAddress: profile.defaultDeliveryAddress || '',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (user && businessSettings?.features?.loyaltyProgram === true) {
      fetchLoyaltyInfo();
    } else if (businessSettings?.features?.loyaltyProgram === false) {
      // Clear loyalty info when loyalty program is disabled
      setLoyaltyInfo(null);
    }
  }, [user, businessSettings?.features?.loyaltyProgram]);

  const fetchLoyaltyInfo = async () => {
    if (!user || businessSettings?.features?.loyaltyProgram !== true) return;
    
    try {
      const response = await fetch(`/api/users/${user.id}/loyalty`);
      if (response.ok) {
        const loyalty = await response.json();
        setLoyaltyInfo(loyalty);
      }
    } catch (error) {
      console.error('Error fetching loyalty info:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateProfile(formData);
      setEditing(false);
      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Loyalty Card - Only show if loyalty program is enabled */}
      {businessSettings?.features?.loyaltyProgram && (
        <Card className="bg-gradient-to-r from-orange-500 to-red-600 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Sara's Loyalty Rewards
            </CardTitle>
            <CardDescription className="text-orange-100">
              Every 10th delivery is free!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loyaltyInfo && (
              <>
                <div className="flex justify-between items-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{loyaltyInfo.totalDeliveries}</div>
                    <div className="text-sm text-orange-100">Total Deliveries</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{loyaltyInfo.freeDeliveryCredits}</div>
                    <div className="text-sm text-orange-100">Free Credits</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{loyaltyInfo.deliveriesUntilNextFree}</div>
                    <div className="text-sm text-orange-100">Until Next Free</div>
                  </div>
                </div>
                
                {loyaltyInfo.eligibleForFreeDelivery && (
                  <Badge className="bg-green-500 hover:bg-green-600 w-full justify-center">
                    <Gift className="h-4 w-4 mr-2" />
                    You have free delivery credits available!
                  </Badge>
                )}
                
                <div className="bg-white/20 rounded-lg p-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress to next free delivery</span>
                    <span>{loyaltyInfo.totalDeliveries % 10}/10</span>
                  </div>
                  <div className="w-full bg-white/20 rounded-full h-2">
                    <div 
                      className="bg-white rounded-full h-2 transition-all duration-300"
                      style={{ width: `${((loyaltyInfo.totalDeliveries % 10) / 10) * 100}%` }}
                    />
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Manage your delivery preferences and saved addresses
              </CardDescription>
            </div>
            <Button 
              variant={editing ? "outline" : "default"}
              onClick={() => editing ? setEditing(false) : setEditing(true)}
            >
              {editing ? 'Cancel' : 'Edit'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  value={user.email || ''}
                  disabled
                  className="pl-10 bg-muted"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  disabled={!editing}
                  className={!editing ? "bg-muted" : ""}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!editing}
                  className={`pl-10 ${!editing ? "bg-muted" : ""}`}
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="delivery">Default Delivery Address</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="delivery"
                value={formData.defaultDeliveryAddress}
                onChange={(e) => setFormData({ ...formData, defaultDeliveryAddress: e.target.value })}
                disabled={!editing}
                className={`pl-10 ${!editing ? "bg-muted" : ""}`}
              />
            </div>
          </div>
          
          {editing && (
            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Password Change Section */}
      <ChangePasswordForm />
    </div>
  );
}

export default function ProfilePage() {
  const { user, loading } = useAuth();
  
  // Fetch business settings to check if loyalty program is enabled  
  const { data: businessSettings } = useQuery<BusinessSettings>({
    queryKey: ['/api/business-settings'],
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  // Fetch logo business settings for header
  const { data: logoBusinessSettings } = useQuery<LogoBusinessSettings>({
    queryKey: ['/api/business-settings'],
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <Card className="mb-6">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mb-4">
                <User className="h-6 w-6 text-white" />
              </div>
              <CardTitle>Sign In Required</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-6">
                Please sign in to view and manage your profile.
              </p>
              <Link href="/auth?returnTo=/profile">
                <Button className="w-full">
                  <User className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50">
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
              <span className="text-sm text-gray-600">Profile</span>
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

      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600 mt-2">Manage your delivery preferences{businessSettings?.features?.loyaltyProgram ? ' and loyalty rewards' : ''}</p>
          </div>
          
          <UserProfile businessSettings={businessSettings} />
        </div>
      </div>
    </div>
  );
}