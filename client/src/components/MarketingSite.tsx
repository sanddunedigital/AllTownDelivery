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
  Search,
  ArrowRight,
  Building,
  Zap,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function MarketingSite() {
  const [searchArea, setSearchArea] = useState("");

  const handleAreaSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement area search functionality
    console.log("Searching for delivery services in:", searchArea);
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
                onClick={() => document.getElementById('search')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-gray-700 hover:text-primary transition-colors"
              >
                Find Services
              </button>
              <button 
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="text-gray-700 hover:text-primary transition-colors"
              >
                How It Works
              </button>
              <Link href="/join">
                <Button variant="outline" className="mr-2">
                  For Businesses
                </Button>
              </Link>
              <Link href="/auth">
                <Button className="bg-primary hover:bg-primary/90">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-12 bg-gradient-to-br from-blue-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Find Local <span className="text-primary">Delivery Services</span> Near You
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Get groceries, pharmacy items, restaurant food, and more delivered fast from trusted local businesses in your area.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => document.getElementById('search')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-primary hover:bg-primary/90 text-white px-8 py-3"
              >
                <Search className="mr-2 h-5 w-5" />
                Find Services Near Me
              </Button>
              <Link href="/join">
                <Button 
                  size="lg" 
                  variant="outline"
                  className="px-8 py-3"
                >
                  <Building className="mr-2 h-5 w-5" />
                  I'm a Business
                </Button>
              </Link>
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

          <form onSubmit={handleAreaSearch} className="max-w-lg mx-auto">
            <div className="flex gap-3">
              <Input
                type="text"
                placeholder="Enter your city or zip code"
                value={searchArea}
                onChange={(e) => setSearchArea(e.target.value)}
                className="flex-1 h-12 text-base"
              />
              <Button type="submit" size="lg" className="h-12 px-6 bg-primary hover:bg-primary/90">
                <Search className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-2 text-center">
              Popular areas: Oskaloosa, IA • Des Moines, IA • Cedar Rapids, IA
            </p>
          </form>

          {/* Sample Results */}
          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  Sara's Quickie Delivery
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-3">Multi-service delivery for groceries, pharmacy, restaurants & more</p>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <MapPin className="h-4 w-4" />
                  Oskaloosa, IA
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                  <Star className="h-4 w-4 text-yellow-500" />
                  4.9 (127 reviews)
                </div>
                <div className="mb-3">
                  <Badge variant="secondary" className="mr-2">Groceries</Badge>
                  <Badge variant="secondary" className="mr-2">Pharmacy</Badge>
                  <Badge variant="secondary">Restaurants</Badge>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                  <Clock className="h-4 w-4" />
                  Average delivery: 30 minutes
                </div>
                <Button variant="outline" size="sm" className="w-full">
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

      {/* How It Works Section */}
      <section id="features" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600">
              Getting delivery services in your area is simple and fast
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="text-center">
              <CardHeader>
                <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Search className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle>Search Your Area</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Enter your city or zip code to find local delivery services 
                  powered by AllTownDelivery in your area.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Truck className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle>Choose Service</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Browse trusted local services offering groceries, pharmacy, 
                  restaurants, and more with real customer reviews.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-8 w-8 text-orange-600" />
                </div>
                <CardTitle>Track Delivery</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Get real-time tracking updates and know exactly when your 
                  delivery will arrive at your door.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Customer Benefits Section */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose AllTownDelivery Services?
            </h2>
            <p className="text-lg text-gray-600">
              Benefits you get when ordering from our partner delivery services
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-Time Tracking</h3>
              <p className="text-gray-600">Know exactly where your order is and when it will arrive</p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Trusted Services</h3>
              <p className="text-gray-600">All services are verified and rated by real customers</p>
            </div>
            
            <div className="text-center">
              <div className="bg-orange-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Loyalty Rewards</h3>
              <p className="text-gray-600">Earn free delivery credits with each order</p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Globe className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Local Focus</h3>
              <p className="text-gray-600">Supporting small businesses in your community</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Truck className="h-6 w-6" />
                <span className="text-lg font-bold">AllTownDelivery</span>
              </div>
              <p className="text-gray-400">
                Connecting customers with trusted local delivery services nationwide.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">For Customers</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white">Find Services</Link></li>
                <li><Link href="#" className="hover:text-white">How It Works</Link></li>
                <li><Link href="#" className="hover:text-white">Track Order</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">For Businesses</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/join" className="hover:text-white">Join Platform</Link></li>
                <li><Link href="/join" className="hover:text-white">Pricing</Link></li>
                <li><Link href="#" className="hover:text-white">Support</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <div className="space-y-2 text-gray-400">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2" />
                  <span>support@alltowndelivery.com</span>
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  <span>1-800-DELIVERY</span>
                </div>
              </div>
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