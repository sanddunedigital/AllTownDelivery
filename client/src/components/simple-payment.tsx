import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, Receipt } from 'lucide-react';

interface SimplePaymentProps {
  amount: number;
  deliveryRequestId: string;
  customerName: string;
  onPaymentSuccess?: (result: any) => void;
  onPaymentError?: (error: string) => void;
}

interface SquareConfig {
  applicationId: string;
  locationId: string;
  environment: 'sandbox' | 'production';
}

export function SimplePayment({ 
  amount, 
  deliveryRequestId, 
  customerName, 
  onPaymentSuccess, 
  onPaymentError 
}: SimplePaymentProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'invoice'>('card');
  const { toast } = useToast();

  // Get Square configuration to check if payments are set up
  const { data: squareConfig } = useQuery<SquareConfig>({
    queryKey: ['/api/square/config'],
    retry: false
  });

  const handleCardPayment = async () => {
    if (!squareConfig) {
      toast({
        title: "Payment Not Available",
        description: "Payment processing is not set up yet. Please contact the business.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // For now, create a simplified payment request that will be handled server-side
      const response = await apiRequest('/api/payments/process-simple', 'POST', {
        deliveryRequestId,
        amount,
        currency: 'USD',
        paymentMethod: 'card'
      });
      
      const responseData = await response.json();

      if (responseData.success) {
        toast({
          title: "Payment Processed",
          description: `Payment of $${amount.toFixed(2)} has been processed successfully.`
        });
        onPaymentSuccess?.(responseData);
      } else {
        throw new Error(responseData.error || 'Payment failed');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      let errorMessage = error.message || 'Payment processing failed';
      
      if (error.message?.includes('Square payment not configured')) {
        errorMessage = 'Payment system not configured. Please contact the business.';
      }
      
      toast({
        title: "Payment Failed",
        description: errorMessage,
        variant: "destructive"
      });
      onPaymentError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInvoiceRequest = async () => {
    setIsProcessing(true);
    
    try {
      const response = await apiRequest('/api/invoices/create', 'POST', {
        deliveryRequestId,
        customerEmail: 'customer@example.com',
        title: `Delivery Service - ${customerName}`,
        description: `Delivery service fee for ${customerName}`,
        amount,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        autoCharge: false
      });
      
      const responseData = await response.json();

      if (responseData.success) {
        toast({
          title: "Invoice Created",
          description: "Invoice has been sent to the customer."
        });
        
        if (responseData.publicUrl) {
          window.open(responseData.publicUrl, '_blank');
        }
        
        onPaymentSuccess?.(responseData);
      } else {
        throw new Error(responseData.error || 'Invoice creation failed');
      }
    } catch (error: any) {
      console.error('Invoice error:', error);
      let errorMessage = error.message || 'Invoice creation failed';
      
      if (error.message?.includes('Square payment not configured')) {
        errorMessage = 'Payment system not configured. Please contact the business.';
      }
      
      toast({
        title: "Invoice Failed",
        description: errorMessage,
        variant: "destructive"
      });
      onPaymentError?.(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Payment Options</CardTitle>
        <CardDescription>
          Total amount: ${amount.toFixed(2)} for {customerName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!squareConfig ? (
          <div className="p-4 border rounded-lg bg-yellow-50">
            <h4 className="font-medium mb-2 text-yellow-800">Payment Setup Required</h4>
            <p className="text-sm text-yellow-700 mb-3">
              Payment processing is not configured yet.
            </p>
            <div className="text-xs text-yellow-600">
              Contact the business to enable online payments.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={paymentMethod === 'card' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('card')}
                className="flex items-center gap-2"
              >
                <CreditCard className="h-4 w-4" />
                Card
              </Button>
              <Button
                variant={paymentMethod === 'invoice' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('invoice')}
                className="flex items-center gap-2"
              >
                <Receipt className="h-4 w-4" />
                Invoice
              </Button>
            </div>

            {paymentMethod === 'card' && (
              <div className="p-4 border rounded-lg bg-blue-50">
                <h4 className="font-medium mb-2 text-blue-800">Card Payment</h4>
                <p className="text-sm text-blue-700 mb-3">
                  Process payment immediately using Square's secure payment system.
                </p>
                <div className="text-xs text-blue-600">
                  Payment will be processed securely through Square.
                </div>
              </div>
            )}

            {paymentMethod === 'invoice' && (
              <div className="p-4 border rounded-lg bg-green-50">
                <h4 className="font-medium mb-2 text-green-800">Send Invoice</h4>
                <p className="text-sm text-green-700 mb-3">
                  Create and send an invoice that the customer can pay later.
                </p>
                <div className="text-xs text-green-600">
                  Customer will receive a link to pay online.
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        {squareConfig && paymentMethod === 'card' && (
          <Button 
            onClick={handleCardPayment}
            disabled={isProcessing}
            className="w-full"
            variant="default"
          >
            {isProcessing ? 'Processing Payment...' : `Process Payment $${amount.toFixed(2)}`}
          </Button>
        )}
        
        {squareConfig && paymentMethod === 'invoice' && (
          <Button 
            onClick={handleInvoiceRequest}
            disabled={isProcessing}
            className="w-full"
            variant="default"
          >
            {isProcessing ? 'Creating Invoice...' : `Send Invoice $${amount.toFixed(2)}`}
          </Button>
        )}

        <div className="text-xs text-center text-muted-foreground">
          {squareConfig ? 'Powered by Square' : 'Payment system setup required'}
        </div>
      </CardFooter>
    </Card>
  );
}

export default SimplePayment;