import { useState } from "react";
import { Link } from "wouter";
import { 
  Truck, 
  Clock, 
  MapPin, 
  Star, 
  Phone, 
  Mail, 
  Globe,
  Users,
  CheckCircle,
  Search,
  ArrowRight,
  Building,
  Zap,
  Shield,
  BarChart3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function MarketingSite() {
  const [searchArea, setSearchArea] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("basic");

  const handleAreaSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement area search functionality
    console.log("Searching for delivery services in:", searchArea);
  };

  const handleTenantSignup = (plan: string) => {
    // TODO: Implement tenant signup flow
    console.log("Starting signup for plan:", plan);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-white shadow-sm fixed w-full top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Truck className="h-8 w-8 text-primary mr-3" />
              <span className="text-2xl font-bold text-primary">AllTownDelivery</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-6">
              <button 
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-gray-700 hover:text-primary transition-colors"
              >
                Features
              </button>
              <button 
                onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-gray-700 hover:text-primary transition-colors"
              >
                Pricing
              </button>
              <button 
                onClick={() => document.getElementById('search')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-gray-700 hover:text-primary transition-colors"
              >
                Find Services
              </button>
              <Button 
                onClick={() => document.getElementById('signup')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-primary hover:bg-primary/90"
              >
                Start Your Service
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-gradient-to-br from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Launch Your Local <span className="text-primary">Delivery Service</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Complete delivery management platform with real-time tracking, 
              dispatch management, and customer engagement tools. Get your delivery 
              business online in minutes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => document.getElementById('signup')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-primary hover:bg-primary/90 text-white px-8 py-3"
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => document.getElementById('search')?.scrollIntoView({ behavior: 'smooth' })}
                className="px-8 py-3"
              >
                <Search className="mr-2 h-5 w-5" />
                Find Local Services
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Area Search Section */}
      <section id="search" className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Find Delivery Services in Your Area
            </h2>
            <p className="text-lg text-gray-600">
              Search for local delivery services powered by AllTownDelivery
            </p>
          </div>

          <form onSubmit={handleAreaSearch} className="max-w-md mx-auto">
            <div className="flex gap-3">
              <Input
                type="text"
                placeholder="Enter your city or zip code"
                value={searchArea}
                onChange={(e) => setSearchArea(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </form>

          {/* Sample Results */}
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-primary" />
                  Sara's Quickie Delivery
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-3">Fast local delivery service</p>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <MapPin className="h-4 w-4" />
                  Available in Chicago area
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  Average delivery: 30 minutes
                </div>
                <Button variant="outline" size="sm" className="w-full mt-4">
                  Visit Service
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow opacity-60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-gray-400" />
                  More Services Coming Soon
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 mb-3">New delivery services launching daily</p>
                <Badge variant="secondary">Coming Soon</Badge>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Everything You Need to Run a Delivery Service
            </h2>
            <p className="text-lg text-gray-600">
              Professional-grade tools trusted by delivery services across the country
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Zap className="h-6 w-6 text-yellow-500" />
                  Real-Time Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Live delivery tracking with WebSocket updates. Customers see exactly 
                  where their order is at all times.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Users className="h-6 w-6 text-blue-500" />
                  Driver Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Complete driver portal with job claiming, route optimization, 
                  and performance tracking.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <BarChart3 className="h-6 w-6 text-green-500" />
                  Dispatch Center
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Advanced dispatch dashboard with analytics, driver monitoring, 
                  and delivery optimization.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Globe className="h-6 w-6 text-purple-500" />
                  Custom Branding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Your own subdomain with custom logos, colors, and branding. 
                  Build your brand identity.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-red-500" />
                  Secure Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Integrated payment processing with multiple payment methods 
                  and automated invoicing.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Star className="h-6 w-6 text-orange-500" />
                  Customer Loyalty
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Built-in loyalty program with points, free delivery credits, 
                  and customer retention tools.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-lg text-gray-600">
              Choose the plan that fits your delivery service size
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Basic Plan */}
            <Card className={`relative ${selectedPlan === 'basic' ? 'ring-2 ring-primary' : ''}`}>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Basic</CardTitle>
                <div className="text-3xl font-bold text-primary">$29<span className="text-lg text-gray-500">/month</span></div>
                <p className="text-gray-600">Perfect for small delivery services</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Up to 100 deliveries/month
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Real-time tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    2 driver accounts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Custom subdomain
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Basic analytics
                  </li>
                </ul>
                <Button 
                  className="w-full mt-6" 
                  variant={selectedPlan === 'basic' ? 'default' : 'outline'}
                  onClick={() => handleTenantSignup('basic')}
                >
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>

            {/* Pro Plan */}
            <Card className={`relative ${selectedPlan === 'pro' ? 'ring-2 ring-primary' : ''}`}>
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                Most Popular
              </Badge>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Pro</CardTitle>
                <div className="text-3xl font-bold text-primary">$79<span className="text-lg text-gray-500">/month</span></div>
                <p className="text-gray-600">For growing delivery businesses</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Up to 500 deliveries/month
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Everything in Basic
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    10 driver accounts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Advanced analytics
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Customer loyalty program
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Custom domain support
                  </li>
                </ul>
                <Button 
                  className="w-full mt-6" 
                  onClick={() => handleTenantSignup('pro')}
                >
                  Start Free Trial
                </Button>
              </CardContent>
            </Card>

            {/* Enterprise Plan */}
            <Card className={`relative ${selectedPlan === 'enterprise' ? 'ring-2 ring-primary' : ''}`}>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Enterprise</CardTitle>
                <div className="text-3xl font-bold text-primary">$199<span className="text-lg text-gray-500">/month</span></div>
                <p className="text-gray-600">For large delivery operations</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Unlimited deliveries
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Everything in Pro
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Unlimited drivers
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    API access
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Priority support
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    White-label options
                  </li>
                </ul>
                <Button 
                  className="w-full mt-6" 
                  variant={selectedPlan === 'enterprise' ? 'default' : 'outline'}
                  onClick={() => handleTenantSignup('enterprise')}
                >
                  Contact Sales
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="signup" className="py-16 bg-primary text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Launch Your Delivery Service?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join hundreds of delivery services already using AllTownDelivery. 
            Start your free trial today and be delivering in hours, not weeks.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              variant="secondary"
              onClick={() => handleTenantSignup('pro')}
              className="px-8 py-3"
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="px-8 py-3 text-white border-white hover:bg-white hover:text-primary"
            >
              <Phone className="mr-2 h-5 w-5" />
              Schedule Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Truck className="h-6 w-6 mr-2" />
                <span className="text-xl font-bold">AllTownDelivery</span>
              </div>
              <p className="text-gray-400">
                The complete platform for local delivery services.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#search" className="hover:text-white transition-colors">Find Services</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 AllTownDelivery. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}