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
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { EnhancedDeliveryForm } from "@/components/ui/enhanced-delivery-form";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, profile, signOut, loading } = useAuth();
  const [, navigate] = useLocation();

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
              <img 
                src="https://www.sarasquickiedelivery.com/uploads/b/355ffb41d51d1587e36487d7e874ef8e616e85c920dc275424910629c86f9cde/D40F3E6C-CFC1-4A36-B60A-A2E3D2E0596F_1678667317.jpeg?width=400" 
                alt="Sara's Quickie Delivery Logo" 
                className="h-10 w-auto"
              />
              <span className="ml-3 text-xl font-bold text-primary">Sara's Quickie Delivery</span>
            </div>
            
            <div className="hidden md:flex items-center space-x-4">
              <button 
                onClick={() => scrollToSection('services')}
                className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Services
              </button>
              <button 
                onClick={() => scrollToSection('testimonials')}
                className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Reviews
              </button>
              <button 
                onClick={() => scrollToSection('contact')}
                className="text-gray-700 hover:text-primary px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Contact
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
                <div className="flex items-center space-x-2">
                  <Link href="/profile">
                    <Button variant="outline" size="sm">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </Button>
                  </Link>
                  {profile?.role === 'driver' && (
                    <Link href="/driver">
                      <Button variant="outline" size="sm">
                        <Truck className="w-4 h-4 mr-2" />
                        Driver Portal
                      </Button>
                    </Link>
                  )}
                  <Button variant="outline" size="sm" onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
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
                <div className="flex flex-col space-y-2 pt-2">
                  <Link href="/profile">
                    <Button variant="outline" size="sm" className="w-full">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </Button>
                  </Link>
                  {profile?.role === 'driver' && (
                    <Link href="/driver">
                      <Button variant="outline" size="sm" className="w-full">
                        <Truck className="w-4 h-4 mr-2" />
                        Driver Portal
                      </Button>
                    </Link>
                  )}
                  <Button variant="outline" size="sm" onClick={handleSignOut} className="w-full">
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
                Call (641) 638-0756
              </Button>
            </div>
            
            {user && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg max-w-md mx-auto">
                <p className="text-green-800 font-medium">
                  Welcome back! Your delivery preferences are saved for faster checkout.
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
                <Package className="h-8 w-8 text-orange-500" />
              </div>
              <CardContent className="p-0">
                <h3 className="text-xl font-semibold mb-2">Package Delivery</h3>
                <p className="text-gray-600">
                  Secure pickup and delivery of packages, documents, and important items.
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

      {/* Delivery Request Form */}
      <section id="request-delivery" className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Request a Delivery</h2>
            <p className="text-xl text-gray-600">
              Fill out the form below and we'll get your items delivered quickly!
            </p>
            {user && (
              <p className="text-orange-600 font-medium mt-2">
                ✨ Signed in users get loyalty rewards - every 10th delivery is free!
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
                    <p className="text-gray-600">(641) 638-0756</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Mail className="h-6 w-6 text-orange-500 mr-4" />
                  <div>
                    <p className="font-semibold">Email</p>
                    <p className="text-gray-600">sarasquickiedelivery@gmail.com</p>
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
                  <div className="flex justify-between">
                    <span className="font-medium">Monday</span>
                    <span className="text-gray-600">9:00 AM - 4:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Tuesday - Sunday</span>
                    <span className="text-gray-600">9:00 AM - 9:00 PM</span>
                  </div>
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
                <img 
                  src="https://www.sarasquickiedelivery.com/uploads/b/355ffb41d51d1587e36487d7e874ef8e616e85c920dc275424910629c86f9cde/D40F3E6C-CFC1-4A36-B60A-A2E3D2E0596F_1678667317.jpeg?width=400" 
                  alt="Sara's Quickie Delivery Logo" 
                  className="h-8 w-auto"
                />
                <span className="ml-3 text-lg font-bold">Sara's Quickie Delivery</span>
              </div>
              <p className="text-gray-300 mb-4 max-w-md">
                Your trusted local delivery service in Oskaloosa, Iowa. Fast, reliable, and professional delivery solutions for all your needs.
              </p>
              <div className="flex space-x-4">
                <a href="tel:(641) 638-0756" className="text-gray-300 hover:text-white transition-colors">
                  <Phone className="h-5 w-5" />
                </a>
                <a href="mailto:sarasquickiedelivery@gmail.com" className="text-gray-300 hover:text-white transition-colors">
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
                <p>(641) 638-0756</p>
                <p>sarasquickiedelivery@gmail.com</p>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-300">
            <p>&copy; 2024 Sara's Quickie Delivery. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}