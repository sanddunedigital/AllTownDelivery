import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, MapPin, Clock, DollarSign } from 'lucide-react';

interface DeliveryPriceCalculatorProps {
  pickupAddress: string;
  deliveryAddress: string;
  isRush?: boolean;
  onPriceCalculated?: (data: {
    distance: number;
    duration: number;
    deliveryFee: number;
    isWithinBaseRadius: boolean;
  }) => void;
  className?: string;
}

interface PricingResult {
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

export function DeliveryPriceCalculator({ 
  pickupAddress, 
  deliveryAddress, 
  isRush = false,
  onPriceCalculated,
  className 
}: DeliveryPriceCalculatorProps) {
  const [calculating, setCalculating] = useState(false);
  const [result, setResult] = useState<PricingResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculatePrice = async () => {
    if (!pickupAddress.trim() || !deliveryAddress.trim()) {
      setResult(null);
      setError(null);
      return;
    }

    setCalculating(true);
    setError(null);

    try {
      const response = await fetch('/api/maps/calculate-delivery-fee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pickup: pickupAddress,
          delivery: deliveryAddress,
          isRush
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        onPriceCalculated?.(data);
      } else {
        setError(data.message || 'Failed to calculate delivery fee');
        setResult(null);
      }
    } catch (err) {
      setError('Unable to calculate delivery fee');
      setResult(null);
    } finally {
      setCalculating(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      calculatePrice();
    }, 500); // Debounce calculations

    return () => clearTimeout(timer);
  }, [pickupAddress, deliveryAddress, isRush]);

  if (!pickupAddress.trim() || !deliveryAddress.trim()) {
    return null;
  }

  if (calculating) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-muted-foreground">Calculating delivery price...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center">
            <Badge variant="destructive" className="mb-2">Error</Badge>
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              ${result.deliveryFee.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">
              {isRush ? 'Rush Delivery Fee' : 'Delivery Fee'}
            </p>
          </div>

          <div className="border-t pt-3">
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  {result.isWithinBaseRadius 
                    ? `Base fee (within ${result.pricing.baseFeeRadius} mi)`
                    : `Base fee + ${result.pricing.extraMiles.toFixed(1)} extra miles`
                  }
                </span>
                <span className="font-medium">${result.deliveryFee.toFixed(2)}</span>
              </div>
              
              {!result.isWithinBaseRadius && (
                <div className="text-xs text-muted-foreground pl-4">
                  ${result.pricing.baseFee.toFixed(2)} + ({result.pricing.extraMiles.toFixed(1)} mi × ${result.pricing.pricePerMile.toFixed(2)} per mile after ${result.pricing.baseFeeRadius} mi)
                </div>
              )}
              
              {isRush && (
                <div className="flex justify-between">
                  <span className="text-orange-600">Rush delivery (1.5×)</span>
                  <span className="font-medium text-orange-600">+${(result.deliveryFee * 0.5).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
          
          {result.isWithinBaseRadius && (
            <div className="text-center">
              <Badge variant="default" className="bg-green-100 text-green-800">
                Within base fee radius
              </Badge>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}