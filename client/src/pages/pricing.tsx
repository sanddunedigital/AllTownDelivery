import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Calculator, Clock, DollarSign, Truck } from 'lucide-react';
import { AddressInput } from '@/components/AddressInput';
import { Link } from 'wouter';

interface BusinessSettings {
  businessName?: string;
  businessPhone?: string;
  businessAddress?: string;
  deliveryPricing?: {
    basePrice?: number;
    pricePerMile?: number;
    minimumOrder?: number;
    freeDeliveryThreshold?: number;
  };
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
}

interface PriceCalculation {
  pickup: string;
  delivery: string;
  distance: number;
  duration: number;
  deliveryFee: number;
  isWithinBaseRadius: boolean;
  pricing: {
    baseFee: number;
    pricePerMile: number;
    baseFeeRadius: number;
    extraMiles: number;
  };
}

export default function PricingPage() {
  const [pickupAddress, setPickupAddress] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [calculation, setCalculation] = useState<PriceCalculation | null>(null);
  const [calculating, setCalculating] = useState(false);

  const { data: businessSettings } = useQuery<BusinessSettings>({
    queryKey: ['/api/business-settings'],
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const calculatePrice = async () => {
    if (!pickupAddress.trim() || !deliveryAddress.trim()) return;
    
    setCalculating(true);
    try {
      const response = await fetch('/api/maps/calculate-delivery-fee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup: pickupAddress,
          delivery: deliveryAddress,
          isRush: false
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setCalculation({
          pickup: pickupAddress,
          delivery: deliveryAddress,
          ...data
        });
      }
    } catch (error) {
      console.error('Price calculation failed:', error);
    } finally {
      setCalculating(false);
    }
  };

  if (!businessSettings) {
    return <div className="flex justify-center items-center h-64">Loading pricing information...</div>;
  }

  // Provide default values for missing fields
  const baseFeeRadius = 10; // Default base fee radius
  const basePrice = businessSettings.deliveryPricing?.basePrice || 3;
  const pricePerMile = businessSettings.deliveryPricing?.pricePerMile || 1.5;
  const minimumOrder = businessSettings.deliveryPricing?.minimumOrder || 0;
  const freeDeliveryThreshold = businessSettings.deliveryPricing?.freeDeliveryThreshold || 25;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Delivery Pricing
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Transparent pricing with no hidden fees
              </p>
            </div>
            <Link href="/">
              <Button variant="outline">
                <Truck className="h-4 w-4 mr-2" />
                Request Delivery
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Pricing Information */}
          <div className="space-y-6">
            
            {/* Base Pricing Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                  Base Pricing Structure
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      ${basePrice.toFixed(2)}
                    </div>
                    <div className="text-sm text-blue-600">
                      Base Fee (within {baseFeeRadius} mi)
                    </div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-orange-600">
                      ${pricePerMile.toFixed(2)}
                    </div>
                    <div className="text-sm text-orange-600">
                      Per Mile (after {baseFeeRadius} mi)
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <h4 className="font-semibold mb-2">How It Works:</h4>
                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Deliveries within {baseFeeRadius} miles: flat ${basePrice.toFixed(2)} fee
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-orange-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Beyond {baseFeeRadius} miles: ${basePrice.toFixed(2)} + ${pricePerMile.toFixed(2)} per additional mile
                    </li>
                    <li className="flex items-start">
                      <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                      Free delivery on orders over ${freeDeliveryThreshold.toFixed(2)}
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Service Zone Map Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <MapPin className="h-5 w-5 mr-2 text-blue-600" />
                  Service Area
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-gradient-to-br from-blue-100 to-green-100 dark:from-blue-900/20 dark:to-green-900/20 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <MapPin className="h-12 w-12 mx-auto mb-2" />
                    <p className="font-medium">Interactive Service Map</p>
                    <p className="text-sm">Coming Soon - Visual zone pricing</p>
                  </div>
                </div>
                <div className="mt-4 text-center">
                  <Badge variant="secondary">
                    <MapPin className="h-3 w-3 mr-1" />
                    Primary Service Area: {businessSettings.businessAddress}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Additional Services */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-purple-600" />
                  Additional Services
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <span className="font-medium">Rush Delivery</span>
                  <Badge variant="secondary">1.5× standard rate</Badge>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <span className="font-medium">Scheduled Delivery</span>
                  <Badge variant="secondary">Standard rate</Badge>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  * Minimum order value: ${minimumOrder.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Price Calculator */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="h-5 w-5 mr-2 text-green-600" />
                  Price Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Pickup Address</label>
                    <AddressInput
                      value={pickupAddress}
                      onChange={setPickupAddress}
                      placeholder="Enter pickup address..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Delivery Address</label>
                    <AddressInput
                      value={deliveryAddress}
                      onChange={setDeliveryAddress}
                      placeholder="Enter delivery address..."
                    />
                  </div>
                  
                  <Button 
                    onClick={calculatePrice}
                    disabled={!pickupAddress.trim() || !deliveryAddress.trim() || calculating}
                    className="w-full"
                  >
                    {calculating ? 'Calculating...' : 'Calculate Price'}
                  </Button>
                </div>

                {calculation && (
                  <div className="mt-6 p-4 border rounded-lg bg-green-50 dark:bg-green-900/20">
                    <div className="space-y-3">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-600">
                          ${calculation.deliveryFee.toFixed(2)}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          Estimated Delivery Fee
                        </div>
                      </div>
                      
                      <div className="border-t pt-3 space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Distance:</span>
                          <span className="font-medium">{calculation.distance.toFixed(1)} miles</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Est. Time:</span>
                          <span className="font-medium">{calculation.duration} minutes</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">
                            {calculation.isWithinBaseRadius 
                              ? `Base fee (within ${calculation.pricing.baseFeeRadius} mi):`
                              : `Base + ${calculation.pricing.extraMiles.toFixed(1)} extra miles:`
                            }
                          </span>
                          <span className="font-medium">${calculation.deliveryFee.toFixed(2)}</span>
                        </div>
                        
                        {!calculation.isWithinBaseRadius && (
                          <div className="text-xs text-gray-500 pl-4">
                            ${calculation.pricing.baseFee.toFixed(2)} + ({calculation.pricing.extraMiles.toFixed(1)} mi × ${calculation.pricing.pricePerMile.toFixed(2)} per mile after {calculation.pricing.baseFeeRadius} mi)
                          </div>
                        )}
                      </div>
                      
                      <div className="border-t pt-3">
                        <Link href="/">
                          <Button className="w-full">
                            Request This Delivery
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Questions About Pricing?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Contact us for custom pricing on large orders or regular delivery schedules.
                </p>
                <div className="space-y-1 text-sm">
                  <div className="flex items-center">
                    <span className="font-medium w-16">Phone:</span>
                    <span>{businessSettings.businessPhone}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}