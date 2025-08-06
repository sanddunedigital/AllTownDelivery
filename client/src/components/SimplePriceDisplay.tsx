import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, Info } from 'lucide-react';
import { Link } from 'wouter';

interface PriceResult {
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

interface SimplePriceDisplayProps {
  result: PriceResult | null;
  isRush: boolean;
  className?: string;
}

export function SimplePriceDisplay({ result, isRush, className }: SimplePriceDisplayProps) {
  if (!result) {
    return null;
  }

  const finalPrice = isRush ? result.deliveryFee * 1.5 : result.deliveryFee;

  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Price Display */}
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              ${finalPrice.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">
              {isRush ? 'Rush Delivery Fee' : 'Delivery Fee'}
            </p>
            {isRush && (
              <Badge variant="secondary" className="mt-1">
                1.5× Rush Rate
              </Badge>
            )}
          </div>

          {/* Quick Summary */}
          <div className="text-center space-y-1">
            <div className="text-sm text-muted-foreground">
              {result.distance.toFixed(1)} miles • {result.duration} minutes
            </div>
            {result.isWithinBaseRadius && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                Within base fee radius
              </Badge>
            )}
          </div>

          {/* Pricing Details Link */}
          <div className="border-t pt-4 text-center">
            <Link href="/pricing">
              <Button variant="outline" size="sm" className="text-xs">
                <Info className="h-3 w-3 mr-1" />
                View Pricing Details
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}