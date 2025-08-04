import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  Truck, 
  Clock, 
  MapPin, 
  Star, 
  Phone, 
  Mail, 
  ShoppingBag, 
  Package, 
  Utensils,
  Shield,
  Menu,
  X,
  User,
  LogOut,
  ChevronDown,
  CheckCircle,
  AlertCircle,
  Filter,
  Globe,
  Store,
  Users,
  Settings,
  Pill
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { EnhancedDeliveryForm } from "@/components/ui/enhanced-delivery-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCustomerDeliveriesRealtime } from "@/hooks/use-realtime";

interface BusinessSettings {
  businessPhone?: string;
  businessEmail?: string;
  businessHours?: {
    [key: string]: { open: string; close: string; closed: boolean };
  };
  logoUrl?: string;
  businessName?: string;
  features?: {
    loyaltyProgram?: boolean;
  };
}

interface LoyaltyInfo {
  loyaltyPoints: number;
  totalDeliveries: number;
  freeDeliveryCredits: number;
  eligibleForFreeDelivery: boolean;
  deliveriesUntilNextFree: number;
}

// Helper function to format time from 24-hour to 12-hour format
const formatTime = (time: string) => {
  if (!time) return '';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const formattedHour = hour % 12 || 12;
  return `${formattedHour}:${minutes} ${ampm}`;
};

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const { user, profile, signOut, loading } = useAuth();
  const [, navigate] = useLocation();

  // Set up real-time subscriptions for customer deliveries
  useCustomerDeliveriesRealtime(user?.id);

  // Fetch user's active deliveries with reduced polling since we have real-time
  const { data: userDeliveries } = useQuery({
    queryKey: [`/api/delivery-requests?userId=${user?.id}`],
    enabled: !!user?.id,
    refetchInterval: 120000, // Refresh every 2 minutes (reduced from 30 seconds)
  });

  // Fetch businesses
  const { data: businesses, isLoading: businessesLoading } = useQuery({
    queryKey: ['/api/businesses'],
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch business settings for pricing and branding
  const { data: businessSettings } = useQuery<BusinessSettings>({
    queryKey: ['/api/business-settings'],
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const queryClient = useQueryClient();
  
  // Fetch user loyalty info if logged in and loyalty program is enabled
  const loyaltyEnabled = !!user?.id && businessSettings?.features?.loyaltyProgram === true;
  
  const { data: loyaltyInfo } = useQuery<LoyaltyInfo>({
    queryKey: [`/api/users/${user?.id}/loyalty`],
    enabled: loyaltyEnabled,
    refetchInterval: loyaltyEnabled ? 120000 : false, // Only refresh when enabled
  });

  // Clear loyalty query and data when loyalty program is disabled
  useEffect(() => {
    if (!loyaltyEnabled && businessSettings?.features?.loyaltyProgram === false && user?.id) {
      queryClient.removeQueries({ queryKey: [`/api/users/${user.id}/loyalty`] });
    }
  }, [loyaltyEnabled, businessSettings?.features?.loyaltyProgram, queryClient, user?.id]);

  // Clear loyalty info when loyalty program is disabled
  const effectiveLoyaltyInfo = loyaltyEnabled ? loyaltyInfo : null;

  // Type the delivery data properly
  const deliveries = (userDeliveries as any[]) || [];
  const businessList = (businesses as any[]) || [];

  // Filter businesses by category
  const filteredBusinesses = selectedCategory === 'all' 
    ? businessList.filter(b => b.name !== 'Custom Location')
    : businessList.filter(b => b.category === selectedCategory && b.name !== 'Custom Location');

  // Get unique categories for filter
  const categories = ['all', ...Array.from(new Set(businessList.filter(b => b.name !== 'Custom Location').map(b => b.category)))];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'restaurant': return Utensils;
      case 'grocery': return ShoppingBag;
      case 'retail': return Store;
      case 'convenience': return Package;
      default: return Store;
    }
  };
  


  // Check for password reset tokens and redirect to reset page
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('access_token') && hash.includes('type=recovery')) {
      navigate(`/reset-password${hash}`);
    }
  }, [navigate]);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-white shadow-sm fixed w-full top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              {businessSettings?.logoUrl ? (
                <img 
                  src={businessSettings.logoUrl} 
                  alt={`${businessSettings.businessName || "Business"} Logo`} 
                  className="h-14 w-auto"
                />
              ) : (
                <img 
                  src="https://www.sarasquickiedelivery.com/uploads/b/355ffb41d51d1587e36487d7e874ef8e616e85c920dc275424910629c86f9cde/D40F3E6C-CFC1-4A36-B60A-A2E3D2E0596F_1678667317.jpeg?width=400" 
                  alt="Sara's Quickie Delivery Logo" 
                  className="h-14 w-auto"
                />
              )}
              <span className="ml-3 text-xl font-bold text-primary">
                {businessSettings?.businessName || "Sara's Quickie Delivery"}
              </span>
            </div>
            
            <div className="hidden md:flex items-center space-x-4">
              <button 
                onClick={() => scrollToSection('services')}
                className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Services
              </button>
              <button 
                onClick={() => scrollToSection('businesses')}
                className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Businesses
              </button>
              <button 
                onClick={() => scrollToSection('testimonials')}
                className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Reviews
              </button>
              <Button 
                onClick={() => scrollToSection('request-delivery')}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                Request Delivery
              </Button>
              
              {/* Auth Section */}
              {loading ? (
                <div className="w-8 h-8 animate-spin rounded-full border-2 border-orange-500 border-t-transparent"></div>
              ) : user ? (
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
                      <Link href="/profile" className="flex items-center w-full">
                        <User className="w-4 h-4 mr-2" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    
                    {/* Driver Portal - Available to drivers, dispatchers, and admins */}
                    {(profile?.role === 'driver' || profile?.role === 'dispatcher' || profile?.role === 'admin') && (
                      <DropdownMenuItem asChild>
                        <Link href="/driver" className="flex items-center w-full">
                          <Truck className="w-4 h-4 mr-2" />
                          Driver Portal
                        </Link>
                      </DropdownMenuItem>
                    )}
                    
                    {/* Dispatch Center - Available to dispatchers and admins */}
                    {(profile?.role === 'dispatcher' || profile?.role === 'admin') && (
                      <DropdownMenuItem asChild>
                        <Link href="/dispatch" className="flex items-center w-full">
                          <Globe className="w-4 h-4 mr-2" />
                          Dispatch Center
                        </Link>
                      </DropdownMenuItem>
                    )}
                    
                    {/* Admin Dashboard - Available to admins only */}
                    {profile?.role === 'admin' && (
                      <DropdownMenuItem asChild>
                        <Link href="/admin" className="flex items-center w-full">
                          <Settings className="w-4 h-4 mr-2" />
                          Admin Dashboard
                        </Link>
                      </DropdownMenuItem>
                    )}
                    
                    {/* Business Settings - Available to admins only */}
                    {profile?.role === 'admin' && (
                      <DropdownMenuItem asChild>
                        <Link href="/business-settings" className="flex items-center w-full">
                          <Settings className="w-4 h-4 mr-2" />
                          Business Settings
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/auth">
                  <Button variant="outline" size="sm">
                    <User className="w-4 h-4 mr-2" />
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
            
            <div className="md:hidden">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle mobile menu"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
              <button 
                onClick={() => scrollToSection('services')}
                className="block w-full text-left px-3 py-2 text-gray-700 hover:text-primary hover:bg-gray-50 rounded-md text-base font-medium"
              >
                Services
              </button>
              <button 
                onClick={() => scrollToSection('businesses')}
                className="block w-full text-left px-3 py-2 text-gray-700 hover:text-primary hover:bg-gray-50 rounded-md text-base font-medium"
              >
                Businesses
              </button>
              <button 
                onClick={() => scrollToSection('testimonials')}
                className="block w-full text-left px-3 py-2 text-gray-700 hover:text-primary hover:bg-gray-50 rounded-md text-base font-medium"
              >
                Reviews
              </button>
              <button 
                onClick={() => scrollToSection('contact')}
                className="block w-full text-left px-3 py-2 text-gray-700 hover:text-primary hover:bg-gray-50 rounded-md text-base font-medium"
              >
                Contact
              </button>
              <Button 
                onClick={() => scrollToSection('request-delivery')}
                className="w-full mt-2 bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                Request Delivery
              </Button>
              
              {user ? (
                <div className="space-y-2 pt-4 border-t border-gray-100">
                  <div className="px-3 py-2">
                    <div className="text-sm font-medium text-gray-900">{profile?.fullName || user?.email || 'User'}</div>
                  </div>
                  <Link href="/profile">
                    <Button variant="ghost" size="sm" className="w-full justify-start">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </Button>
                  </Link>
                  {profile?.role === 'driver' && (
                    <Link href="/driver">
                      <Button variant="ghost" size="sm" className="w-full justify-start">
                        <Truck className="w-4 h-4 mr-2" />
                        Driver Portal
                      </Button>
                    </Link>
                  )}
                  <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full justify-start text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <Link href="/auth">
                  <Button variant="outline" size="sm" className="w-full mt-2">
                    <User className="w-4 h-4 mr-2" />
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Active Delivery Status - Only show for logged-in users with active deliveries */}
      {user && deliveries.filter((d: any) => d.status !== 'completed' && d.status !== 'cancelled').length > 0 && (
        <section className="pt-16 pb-4 bg-blue-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <Package className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold text-gray-900">Your Active Deliveries</h2>
                <div className="flex items-center gap-2 ml-auto">
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Live Updates</span>
                  </div>
                </div>
              </div>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {deliveries
                  .filter((delivery: any) => delivery.status !== 'completed' && delivery.status !== 'cancelled')
                  .map((delivery: any) => (
                    <Card key={delivery.id} className={`border-l-4 ${delivery.usedFreeDelivery ? 'border-l-green-500 bg-green-50' : 'border-l-blue-500'}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">Delivery #{delivery.id.slice(-8)}</CardTitle>
                            {delivery.usedFreeDelivery && (
                              <Badge className="bg-green-500 hover:bg-green-600 text-white">
                                FREE DELIVERY
                              </Badge>
                            )}
                          </div>
                          <Badge 
                            variant={
                              delivery.status === 'available' ? 'secondary' :
                              delivery.status === 'claimed' ? 'default' :
                              delivery.status === 'in_progress' ? 'destructive' : 'outline'
                            }
                          >
                            {delivery.status === 'available' && 'Pending Assignment'}
                            {delivery.status === 'claimed' && 'Driver Assigned'}
                            {delivery.status === 'in_progress' && 'In Transit'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-1 text-blue-500 flex-shrink-0" />
                          <div className="text-sm">
                            <p className="font-medium">Pickup: {delivery.pickupAddress}</p>
                            <p className="text-gray-600">Deliver to: {delivery.deliveryAddress}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">
                            {delivery.preferredDate} at {delivery.preferredTime}
                          </span>
                        </div>

                        {delivery.status === 'available' && (
                          <div className="flex items-center gap-2 text-sm text-orange-600">
                            <AlertCircle className="h-4 w-4 animate-pulse" />
                            <span>Looking for available driver...</span>
                          </div>
                        )}

                        {delivery.status === 'claimed' && (
                          <div className="flex items-center gap-2 text-sm text-blue-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>Driver assigned, preparing for pickup</span>
                          </div>
                        )}

                        {delivery.status === 'in_progress' && (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <Truck className="h-4 w-4" />
                            <span>Driver is on the way</span>
                          </div>
                        )}

                        {delivery.status === 'in_progress' && (
                          <div className="flex items-center gap-2 text-sm text-green-600">
                            <Truck className="h-4 w-4" />
                            <span>On the way to your destination</span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                }
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 bg-gradient-to-br from-orange-50 to-red-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Fast & Reliable
              <span className="text-orange-500 block">Delivery Service</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Sara's Quickie Delivery provides professional delivery services throughout Oskaloosa and surrounding areas. 
              From groceries to prescriptions, we'll get your items where they need to go, quickly and safely.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                size="lg" 
                onClick={() => scrollToSection('request-delivery')}
                className="text-lg px-8 py-3 bg-orange-500 hover:bg-orange-600 text-white"
              >
                <Truck className="mr-2 h-5 w-5" />
                Request Delivery Now
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                onClick={() => scrollToSection('contact')}
                className="text-lg px-8 py-3"
              >
                <Phone className="mr-2 h-5 w-5" />
                Call {businessSettings?.businessPhone || '(641) 638-0756'}
              </Button>
            </div>
            
            {user && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg max-w-md mx-auto">
                <p className="text-green-800 font-medium">
                  Welcome back, {profile?.fullName || user?.email || 'User'}!
                </p>
                {businessSettings?.features?.loyaltyProgram && effectiveLoyaltyInfo && (
                  <p className="text-green-700 text-sm mt-1">
                    {effectiveLoyaltyInfo.deliveriesUntilNextFree > 0 
                      ? `${effectiveLoyaltyInfo.deliveriesUntilNextFree} more deliveries until your next free delivery`
                      : effectiveLoyaltyInfo.freeDeliveryCredits > 0 
                        ? `You have ${effectiveLoyaltyInfo.freeDeliveryCredits} free delivery credit${effectiveLoyaltyInfo.freeDeliveryCredits > 1 ? 's' : ''} available!`
                        : `${effectiveLoyaltyInfo.totalDeliveries} deliveries completed`
                    }
                  </p>
                )}
                <p className="text-green-700 text-sm mt-1">
                  Your delivery preferences are saved for faster checkout.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Services</h2>
            <p className="text-xl text-gray-600">
              Professional delivery solutions for all your needs
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <ShoppingBag className="h-8 w-8 text-orange-500" />
              </div>
              <CardContent className="p-0">
                <h3 className="text-xl font-semibold mb-2">Grocery Delivery</h3>
                <p className="text-gray-600">
                  Fresh groceries and household items delivered to your door from local stores.
                </p>
              </CardContent>
            </Card>
            
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <Pill className="h-8 w-8 text-orange-500" />
              </div>
              <CardContent className="p-0">
                <h3 className="text-xl font-semibold mb-2">Prescription Pickup</h3>
                <p className="text-gray-600">
                  Safe and confidential pickup and delivery of prescriptions from local pharmacies.
                </p>
              </CardContent>
            </Card>
            
            <Card className="p-6 text-center hover:shadow-lg transition-shadow">
              <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <Utensils className="h-8 w-8 text-orange-500" />
              </div>
              <CardContent className="p-0">
                <h3 className="text-xl font-semibold mb-2">Restaurant Delivery</h3>
                <p className="text-gray-600">
                  Hot, fresh meals delivered from your favorite local restaurants.
                </p>
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-12 text-center">
            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="flex items-center justify-center">
                <Clock className="h-8 w-8 text-orange-500 mr-3" />
                <div className="text-left">
                  <h4 className="font-semibold">Fast Delivery</h4>
                  <p className="text-gray-600">Same-day delivery available</p>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <Shield className="h-8 w-8 text-orange-500 mr-3" />
                <div className="text-left">
                  <h4 className="font-semibold">Secure & Safe</h4>
                  <p className="text-gray-600">Insured and reliable service</p>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <MapPin className="h-8 w-8 text-orange-500 mr-3" />
                <div className="text-left">
                  <h4 className="font-semibold">Local Coverage</h4>
                  <p className="text-gray-600">Serving Oskaloosa area</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partner Businesses Section */}
      <section id="businesses" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Partner Businesses</h2>
            <p className="text-xl text-gray-600">
              We deliver from these trusted local businesses in Oskaloosa
            </p>
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {categories.map((category) => {
              const Icon = category === 'all' ? Store : getCategoryIcon(category);
              return (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {category === 'all' ? 'All' : category.charAt(0).toUpperCase() + category.slice(1)}
                </Button>
              );
            })}
          </div>

          {/* Business Cards */}
          {businessesLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse overflow-hidden">
                  <div className="h-32 bg-gray-200"></div>
                  <CardHeader>
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBusinesses.map((business) => {
                const CategoryIcon = getCategoryIcon(business.category);
                return (
                  <Card key={business.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                    {business.imageUrl && (
                      <div className="h-32 overflow-hidden">
                        <img
                          src={business.imageUrl}
                          alt={`${business.name} business image`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Hide image if it fails to load
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{business.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <CategoryIcon className="h-4 w-4 text-orange-500" />
                            <Badge variant="secondary" className="text-xs">
                              {business.category}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4" />
                        <span>{business.address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4" />
                        <span>{business.phone}</span>
                      </div>
                      {business.website && (
                        <div className="flex items-center gap-2 text-sm">
                          <Globe className="h-4 w-4" />
                          <a 
                            href={business.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline truncate"
                          >
                            Visit Website
                          </a>
                        </div>
                      )}
                      <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-l-orange-500">
                        <p className="text-xs font-medium text-gray-700 mb-1">Ordering Instructions:</p>
                        <p className="text-xs text-gray-600">{business.orderingInstructions}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {filteredBusinesses.length === 0 && !businessesLoading && (
            <div className="text-center py-8">
              <Store className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No businesses found in this category.</p>
            </div>
          )}

          <div className="mt-12 text-center">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto">
              <h3 className="font-semibold text-blue-900 mb-2">Ready to Place an Order?</h3>
              <p className="text-blue-700 mb-4">
                Choose a business above, follow their ordering instructions, then request delivery below.
              </p>
              <Button 
                onClick={() => scrollToSection('request-delivery')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Request Delivery
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Delivery Request Form */}
      <section id="request-delivery" className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Request a Delivery</h2>
            <p className="text-xl text-gray-600">
              Fill out the form below and we'll get your items delivered quickly!
            </p>
            {user && businessSettings?.features?.loyaltyProgram && (
              <p className="text-orange-600 font-medium mt-2">
                ✨ Signed in users get loyalty rewards - after 10 deliveries your next one is free!
              </p>
            )}
          </div>

          <EnhancedDeliveryForm />
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">What Our Customers Say</h2>
            <p className="text-xl text-gray-600">
              Trusted by families and businesses throughout Oskaloosa
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-6">
              <CardContent className="p-0">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-500 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4">
                  "Sara's delivery service is amazing! Always on time and very professional. 
                  They've become an essential part of our weekly routine."
                </p>
                <div className="font-semibold">— Jennifer M.</div>
              </CardContent>
            </Card>
            
            <Card className="p-6">
              <CardContent className="p-0">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-500 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4">
                  "Fast, reliable, and reasonably priced. Sara has helped us so much, 
                  especially when we can't get out. Highly recommend!"
                </p>
                <div className="font-semibold">— Robert K.</div>
              </CardContent>
            </Card>
            
            <Card className="p-6">
              <CardContent className="p-0">
                <div className="flex mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-500 fill-current" />
                  ))}
                </div>
                <p className="text-gray-600 mb-4">
                  "Excellent service! Sara is friendly, punctual, and takes great care 
                  with our deliveries. We trust her completely."
                </p>
                <div className="font-semibold">— Mary S.</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Contact Us</h2>
            <p className="text-xl text-gray-600">
              Ready to schedule a delivery? Get in touch with us today!
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-semibold mb-6">Get in Touch</h3>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Phone className="h-6 w-6 text-orange-500 mr-4" />
                  <div>
                    <p className="font-semibold">Phone</p>
                    <a 
                      href={`tel:${businessSettings?.businessPhone || '(641) 638-0756'}`}
                      className="text-gray-600 hover:text-orange-500 transition-colors"
                    >
                      {businessSettings?.businessPhone || '(641) 638-0756'}
                    </a>
                  </div>
                </div>
                <div className="flex items-center">
                  <Mail className="h-6 w-6 text-orange-500 mr-4" />
                  <div>
                    <p className="font-semibold">Email</p>
                    <a 
                      href={`mailto:${businessSettings?.businessEmail || 'sarasquickiedelivery@gmail.com'}`}
                      className="text-gray-600 hover:text-orange-500 transition-colors"
                    >
                      {businessSettings?.businessEmail || 'sarasquickiedelivery@gmail.com'}
                    </a>
                  </div>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-6 w-6 text-orange-500 mr-4" />
                  <div>
                    <p className="font-semibold">Service Area</p>
                    <p className="text-gray-600">Oskaloosa, IA and surrounding areas</p>
                  </div>
                </div>
              </div>
            </div>
            
            <Card className="p-6">
              <CardContent className="p-0">
                <h4 className="font-semibold text-lg mb-4">Business Hours</h4>
                <div className="space-y-3">
                  {businessSettings?.businessHours ? (
                    ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((day) => {
                      const hours = businessSettings.businessHours?.[day];
                      if (!hours) return null;
                      return (
                        <div key={day} className="flex justify-between">
                          <span className="font-medium capitalize">{day}</span>
                          <span className="text-gray-600">
                            {hours.closed ? 'Closed' : `${formatTime(hours.open)} - ${formatTime(hours.close)}`}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="font-medium">Monday</span>
                        <span className="text-gray-600">9:00 AM - 5:00 PM</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Tuesday - Friday</span>
                        <span className="text-gray-600">9:00 AM - 5:00 PM</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Saturday - Sunday</span>
                        <span className="text-gray-600">Closed</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="mt-8 pt-6 border-t">
                  <h4 className="font-semibold mb-4">Payment Methods</h4>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="text-center p-2 border rounded-lg">
                      <div className="text-2xl mb-1">💳</div>
                      <p className="text-xs">Cards</p>
                    </div>
                    <div className="text-center p-2 border rounded-lg">
                      <div className="text-2xl mb-1">💵</div>
                      <p className="text-xs">Cash</p>
                    </div>
                    <div className="text-center p-2 border rounded-lg">
                      <div className="text-2xl mb-1">📱</div>
                      <p className="text-xs">Digital</p>
                    </div>
                    <div className="text-center p-2 border rounded-lg">
                      <div className="text-2xl mb-1">🍏</div>
                      <p className="text-xs">Apple Pay</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center mb-4">
                {businessSettings?.logoUrl ? (
                  <img 
                    src={businessSettings.logoUrl} 
                    alt={`${businessSettings.businessName || "Business"} Logo`} 
                    className="h-14 w-auto"
                  />
                ) : (
                  <img 
                    src="https://www.sarasquickiedelivery.com/uploads/b/355ffb41d51d1587e36487d7e874ef8e616e85c920dc275424910629c86f9cde/D40F3E6C-CFC1-4A36-B60A-A2E3D2E0596F_1678667317.jpeg?width=400" 
                    alt="Sara's Quickie Delivery Logo" 
                    className="h-10 w-auto"
                  />
                )}
                <span className="ml-3 text-lg font-bold">
                  {businessSettings?.businessName || "Sara's Quickie Delivery"}
                </span>
              </div>
              <p className="text-gray-300 mb-4 max-w-md">
                Your trusted local delivery service in Oskaloosa, Iowa. Fast, reliable, and professional delivery solutions for all your needs.
              </p>
              <div className="flex space-x-4">
                <a href={`tel:${businessSettings?.businessPhone || '(641) 638-0756'}`} className="text-gray-300 hover:text-white transition-colors">
                  <Phone className="h-5 w-5" />
                </a>
                <a href={`mailto:${businessSettings?.businessEmail || 'sarasquickiedelivery@gmail.com'}`} className="text-gray-300 hover:text-white transition-colors">
                  <Mail className="h-5 w-5" />
                </a>
              </div>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <button 
                    onClick={() => scrollToSection('services')}
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Services
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('request-delivery')}
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Request Delivery
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('testimonials')}
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Reviews
                  </button>
                </li>
                <li>
                  <button 
                    onClick={() => scrollToSection('contact')}
                    className="text-gray-300 hover:text-white transition-colors"
                  >
                    Contact
                  </button>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold text-lg mb-4">Contact Info</h3>
              <div className="space-y-2 text-gray-300">
                <p>N I St</p>
                <p>Oskaloosa, IA 52577</p>
                <a 
                  href={`tel:${businessSettings?.businessPhone || '(641) 638-0756'}`}
                  className="hover:text-white transition-colors block"
                >
                  {businessSettings?.businessPhone || '(641) 638-0756'}
                </a>
                <a 
                  href={`mailto:${businessSettings?.businessEmail || 'sarasquickiedelivery@gmail.com'}`}
                  className="hover:text-white transition-colors block"
                >
                  {businessSettings?.businessEmail || 'sarasquickiedelivery@gmail.com'}
                </a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-300">
            <p>&copy; {new Date().getFullYear()} {businessSettings?.businessName || "Sara's Quickie Delivery"}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}