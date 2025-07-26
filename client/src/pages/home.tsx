import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
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
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Form schema extending the insert schema
const deliveryFormSchema = z.object({
  customerName: z.string().min(1, "Full name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  pickupAddress: z.string().min(5, "Pickup address is required"),
  deliveryAddress: z.string().min(5, "Delivery address is required"),
  preferredDate: z.string().min(1, "Preferred date is required"),
  preferredTime: z.string().min(1, "Preferred time is required"),
  deliveryType: z.string().min(1, "Delivery type is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  specialInstructions: z.string().optional(),
  marketingConsent: z.string().optional(),
});

type DeliveryFormData = z.infer<typeof deliveryFormSchema>;

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<DeliveryFormData>({
    resolver: zodResolver(deliveryFormSchema),
    defaultValues: {
      customerName: "",
      phone: "",
      email: "",
      pickupAddress: "",
      deliveryAddress: "",
      preferredDate: "",
      preferredTime: "",
      deliveryType: "",
      paymentMethod: "",
      specialInstructions: "",
      marketingConsent: "",
    },
  });

  const deliveryMutation = useMutation({
    mutationFn: async (data: DeliveryFormData) => {
      const response = await apiRequest("POST", "/api/delivery-requests", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Delivery Request Submitted!",
        description: "We'll contact you shortly to confirm your delivery request.",
        variant: "default",
      });
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Submission Failed",
        description: "Please check your information and try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: DeliveryFormData) => {
    deliveryMutation.mutate(data);
  };

  // Set minimum date to today
  const today = new Date().toISOString().split('T')[0];

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
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
            
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
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
              </div>
            </div>
            
            <div className="md:hidden">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t">
            <div className="px-2 pt-2 pb-3 space-y-1">
              <button 
                onClick={() => scrollToSection('services')}
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50 rounded-md w-full text-left"
              >
                Services
              </button>
              <button 
                onClick={() => scrollToSection('testimonials')}
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50 rounded-md w-full text-left"
              >
                Reviews
              </button>
              <button 
                onClick={() => scrollToSection('contact')}
                className="block px-3 py-2 text-base font-medium text-gray-700 hover:text-primary hover:bg-gray-50 rounded-md w-full text-left"
              >
                Contact
              </button>
              <Button 
                onClick={() => scrollToSection('request-delivery')}
                className="w-full mt-2 bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                Request Delivery
              </Button>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-16 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                Fast & Reliable{" "}
                <span className="text-primary">Local Delivery</span>
                {" "}in Oskaloosa
              </h1>
              <p className="mt-6 text-lg text-gray-600 leading-relaxed">
                Professional delivery service with a personal touch. We deliver food, packages, and more with speed and care throughout Oskaloosa and surrounding areas.
              </p>
              
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Button 
                  onClick={() => scrollToSection('request-delivery')}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-4 h-auto font-semibold text-base"
                >
                  <Truck className="mr-2 h-5 w-5" />
                  Request Delivery Now
                </Button>
                <Button 
                  variant="outline"
                  asChild
                  className="border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground px-8 py-4 h-auto font-semibold text-base"
                >
                  <a href="tel:(641) 638-0756">
                    <Phone className="mr-2 h-5 w-5" />
                    Call (641) 638-0756
                  </a>
                </Button>
              </div>
              
              <div className="mt-8 flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center">
                  <Clock className="text-secondary mr-2 h-5 w-5" />
                  <span>Same-day delivery</span>
                </div>
                <div className="flex items-center">
                  <Shield className="text-green-500 mr-2 h-5 w-5" />
                  <span>Fully insured</span>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <img 
                src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=800&h=600" 
                alt="Professional delivery van" 
                className="rounded-2xl shadow-2xl w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">What We Deliver</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">From food and groceries to packages and documents, we handle all your delivery needs with care and speed.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <img 
                  src="https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" 
                  alt="Food delivery" 
                  className="w-full h-32 object-cover rounded-lg mb-4"
                />
                <h3 className="font-semibold text-lg mb-2 flex items-center justify-center">
                  <Utensils className="mr-2 h-5 w-5" />
                  Food & Restaurant Orders
                </h3>
                <p className="text-gray-600 text-sm">Hot, fresh meals delivered from your favorite local restaurants</p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <img 
                  src="https://images.unsplash.com/photo-1542838132-92c53300491e?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" 
                  alt="Grocery delivery" 
                  className="w-full h-32 object-cover rounded-lg mb-4"
                />
                <h3 className="font-semibold text-lg mb-2 flex items-center justify-center">
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Groceries & Essentials
                </h3>
                <p className="text-gray-600 text-sm">Daily necessities and grocery items delivered to your door</p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <img 
                  src="https://images.unsplash.com/photo-1586771107445-d3ca888129ff?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" 
                  alt="Package delivery" 
                  className="w-full h-32 object-cover rounded-lg mb-4"
                />
                <h3 className="font-semibold text-lg mb-2 flex items-center justify-center">
                  <Package className="mr-2 h-5 w-5" />
                  Packages & Documents
                </h3>
                <p className="text-gray-600 text-sm">Secure delivery of important packages and documents</p>
              </CardContent>
            </Card>
            
            <Card className="text-center p-6 hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <img 
                  src="https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" 
                  alt="Retail delivery" 
                  className="w-full h-32 object-cover rounded-lg mb-4"
                />
                <h3 className="font-semibold text-lg mb-2">Retail & Special Items</h3>
                <p className="text-gray-600 text-sm">Custom delivery solutions for unique items and special requests</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="mt-16 bg-gray-50 rounded-2xl p-8">
            <div className="grid md:grid-cols-3 gap-8 text-center">
              <div>
                <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="text-secondary h-8 w-8" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Quick Turnaround</h3>
                <p className="text-gray-600">Most deliveries completed within 1-2 hours of request</p>
              </div>
              
              <div>
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="text-green-500 h-8 w-8" />
                </div>
                <h3 className="font-semibold text-lg mb-2">Local Coverage</h3>
                <p className="text-gray-600">Serving Oskaloosa and surrounding communities</p>
              </div>
              
              <div>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Star className="text-primary h-8 w-8" />
                </div>
                <h3 className="font-semibold text-lg mb-2">5-Star Service</h3>
                <p className="text-gray-600">Exceptional customer service and reliability</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Delivery Request Form */}
      <section id="request-delivery" className="py-16 bg-gradient-to-br from-indigo-50 to-blue-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Request a Delivery</h2>
            <p className="text-lg text-gray-600">Fill out the form below and we'll get your delivery scheduled right away.</p>
          </div>
          
          <Card className="p-8 shadow-xl">
            <CardContent className="p-0">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number *</FormLabel>
                          <FormControl>
                            <Input placeholder="(641) 555-0123" type="tel" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input placeholder="your@email.com" type="email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="pickupAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pickup Address *</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter pickup location address" 
                              className="resize-none" 
                              rows={3}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="deliveryAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Delivery Address *</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Enter delivery destination" 
                              className="resize-none" 
                              rows={3}
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="preferredDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Date *</FormLabel>
                          <FormControl>
                            <Input type="date" min={today} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="preferredTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preferred Time *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select time" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="9:00 AM">9:00 AM</SelectItem>
                              <SelectItem value="10:00 AM">10:00 AM</SelectItem>
                              <SelectItem value="11:00 AM">11:00 AM</SelectItem>
                              <SelectItem value="12:00 PM">12:00 PM</SelectItem>
                              <SelectItem value="1:00 PM">1:00 PM</SelectItem>
                              <SelectItem value="2:00 PM">2:00 PM</SelectItem>
                              <SelectItem value="3:00 PM">3:00 PM</SelectItem>
                              <SelectItem value="4:00 PM">4:00 PM</SelectItem>
                              <SelectItem value="5:00 PM">5:00 PM</SelectItem>
                              <SelectItem value="6:00 PM">6:00 PM</SelectItem>
                              <SelectItem value="7:00 PM">7:00 PM</SelectItem>
                              <SelectItem value="8:00 PM">8:00 PM</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="deliveryType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What are we delivering? *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select delivery type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="food">Food & Restaurant Orders</SelectItem>
                            <SelectItem value="groceries">Groceries & Essentials</SelectItem>
                            <SelectItem value="packages">Packages & Documents</SelectItem>
                            <SelectItem value="retail">Retail Items</SelectItem>
                            <SelectItem value="other">Other (specify in notes)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Payment Method *</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid sm:grid-cols-3 gap-4"
                          >
                            <div className="flex items-center space-x-2 border rounded-lg p-4 hover:border-primary">
                              <RadioGroupItem value="card-advance" id="card-advance" />
                              <label htmlFor="card-advance" className="text-sm cursor-pointer">
                                Card online in advance
                              </label>
                            </div>
                            <div className="flex items-center space-x-2 border rounded-lg p-4 hover:border-primary">
                              <RadioGroupItem value="card-arrival" id="card-arrival" />
                              <label htmlFor="card-arrival" className="text-sm cursor-pointer">
                                Card On Arrival (COA)
                              </label>
                            </div>
                            <div className="flex items-center space-x-2 border rounded-lg p-4 hover:border-primary">
                              <RadioGroupItem value="cash-delivery" id="cash-delivery" />
                              <label htmlFor="cash-delivery" className="text-sm cursor-pointer">
                                Cash On Delivery (COD)
                              </label>
                            </div>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="specialInstructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Instructions</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Any special delivery instructions, handling requirements, or additional notes..."
                            className="resize-none" 
                            rows={4}
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="marketingConsent"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value === "true"}
                            onCheckedChange={(checked) => field.onChange(checked ? "true" : "false")}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm text-gray-600">
                            You may receive marketing and promotional materials. Contact the merchant for their privacy practices.
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <div className="text-center">
                    <Button 
                      type="submit" 
                      disabled={deliveryMutation.isPending}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground px-8 py-4 h-auto font-semibold text-base"
                    >
                      {deliveryMutation.isPending ? (
                        "Submitting..."
                      ) : (
                        <>
                          <Mail className="mr-2 h-5 w-5" />
                          Submit Delivery Request
                        </>
                      )}
                    </Button>
                    
                    <p className="text-xs text-gray-500 mt-4">
                      This form is protected by reCAPTCHA and the Google{" "}
                      <a href="https://policies.google.com/privacy" className="text-primary hover:underline">
                        Privacy Policy
                      </a>{" "}
                      and{" "}
                      <a href="https://policies.google.com/terms" className="text-primary hover:underline">
                        Terms of Service
                      </a>{" "}
                      apply.
                    </p>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">What Our Customers Say</h2>
            <p className="text-lg text-gray-600">Don't just take our word for it - hear from our satisfied customers.</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="flex items-center mb-4">
                  <div className="flex text-secondary">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>
                
                <blockquote className="text-gray-700 mb-6 leading-relaxed">
                  "Big props to Sara's quickie delivery service. Last week we were under a tight schedule to get a project done in our home as we had construction glue drying and we all forgot that we had basically missed breakfast and lunch. We picked up the phone and ordered some burritos and they delivered really quickly. Service with a smile! Great job! We will definitely continue to use them for their services. Highly recommend!!!!"
                </blockquote>
                
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                    K
                  </div>
                  <div className="ml-3">
                    <p className="font-semibold text-gray-900">Keven Hempel</p>
                    <p className="text-sm text-gray-500">Digital Legacy</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="p-8 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="flex items-center mb-4">
                  <div className="flex text-secondary">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>
                
                <blockquote className="text-gray-700 mb-6 leading-relaxed">
                  "Best people, best service, very friendly! They go above and beyond every time!"
                </blockquote>
                
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                    J
                  </div>
                  <div className="ml-3">
                    <p className="font-semibold text-gray-900">Jodi</p>
                    <p className="text-sm text-gray-500">Local Customer</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="p-8 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="flex items-center mb-4">
                  <div className="flex text-secondary">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>
                </div>
                
                <blockquote className="text-gray-700 mb-6 leading-relaxed">
                  "Sara is kind, on time and very professional. She went out of her way to help me. I'll be using her more!!!"
                </blockquote>
                
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                    J
                  </div>
                  <div className="ml-3">
                    <p className="font-semibold text-gray-900">Jeremy</p>
                    <p className="text-sm text-gray-500">Oskaloosa</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Get in Touch</h2>
            <p className="text-lg text-gray-600">Ready to place an order or have questions? Contact us today!</p>
          </div>
          
          <div className="grid lg:grid-cols-2 gap-12">
            <Card className="p-8 shadow-sm">
              <CardContent className="p-0">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Contact Information</h3>
                
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="text-primary h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <h4 className="font-semibold text-gray-900 mb-1">Address</h4>
                      <p className="text-gray-600">N I St<br />Oskaloosa, Iowa 52577</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="text-primary h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <h4 className="font-semibold text-gray-900 mb-1">Phone</h4>
                      <a href="tel:(641) 638-0756" className="text-primary hover:underline">
                        (641) 638-0756
                      </a>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="text-primary h-6 w-6" />
                    </div>
                    <div className="ml-4">
                      <h4 className="font-semibold text-gray-900 mb-1">Email</h4>
                      <a href="mailto:sarasquickiedelivery@gmail.com" className="text-primary hover:underline">
                        sarasquickiedelivery@gmail.com
                      </a>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="p-8 shadow-sm">
              <CardContent className="p-0">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Business Hours</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="font-medium text-gray-900">Monday</span>
                    <span className="text-gray-600">9:00 am - 4:00 pm</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="font-medium text-gray-900">Tuesday</span>
                    <span className="text-gray-600">9:00 am - 9:00 pm</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="font-medium text-gray-900">Wednesday</span>
                    <span className="text-gray-600">9:00 am - 9:00 pm</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="font-medium text-gray-900">Thursday</span>
                    <span className="text-gray-600">9:00 am - 9:00 pm</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="font-medium text-gray-900">Friday</span>
                    <span className="text-gray-600">9:00 am - 9:00 pm</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-100">
                    <span className="font-medium text-gray-900">Saturday</span>
                    <span className="text-gray-600">9:00 am - 9:00 pm</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="font-medium text-gray-900">Sunday</span>
                    <span className="text-gray-600">9:00 am - 9:00 pm</span>
                  </div>
                </div>
                
                <div className="mt-8 pt-6 border-t border-gray-100">
                  <h4 className="font-semibold text-gray-900 mb-4">Accepted Payment Methods</h4>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="p-3 border border-gray-200 rounded-lg text-center">
                      <div className="text-2xl mb-1">🍏</div>
                      <p className="text-xs text-gray-600">Apple Pay</p>
                    </div>
                    <div className="p-3 border border-gray-200 rounded-lg text-center">
                      <div className="text-2xl mb-1">💳</div>
                      <p className="text-xs text-gray-600">Google Pay</p>
                    </div>
                    <div className="p-3 border border-gray-200 rounded-lg text-center">
                      <div className="text-2xl mb-1">💳</div>
                      <p className="text-xs text-gray-600">Visa</p>
                    </div>
                    <div className="p-3 border border-gray-200 rounded-lg text-center">
                      <div className="text-2xl mb-1">💳</div>
                      <p className="text-xs text-gray-600">Mastercard</p>
                    </div>
                    <div className="p-3 border border-gray-200 rounded-lg text-center">
                      <div className="text-2xl mb-1">💳</div>
                      <p className="text-xs text-gray-600">Amex</p>
                    </div>
                    <div className="p-3 border border-gray-200 rounded-lg text-center">
                      <div className="text-2xl mb-1">💳</div>
                      <p className="text-xs text-gray-600">Discover</p>
                    </div>
                    <div className="p-3 border border-gray-200 rounded-lg text-center">
                      <div className="text-2xl mb-1">💳</div>
                      <p className="text-xs text-gray-600">JCB</p>
                    </div>
                    <div className="p-3 border border-gray-200 rounded-lg text-center">
                      <div className="text-2xl mb-1">💵</div>
                      <p className="text-xs text-gray-600">Cash</p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-500 mt-4">Secure checkout powered by Square</p>
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
