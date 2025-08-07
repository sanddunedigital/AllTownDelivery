import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface SquarePaymentProps {
  amount: number;
  deliveryRequestId: string;
  customerName: string;
  onPaymentSuccess?: (result: any) => void;
  onPaymentError?: (error: string) => void;
}

export function SquarePayment({ 
  amount, 
  deliveryRequestId, 
  customerName, 
  onPaymentSuccess, 
  onPaymentError 
}: SquarePaymentProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentForm, setPaymentForm] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize Square Web Payments SDK
    initializeSquarePayments();
  }, []);

  const initializeSquarePayments = async () => {
    // Note: This requires Square Web Payments SDK to be loaded
    // For demo purposes, we'll show payment options without full Square integration
    console.log('Square Web Payments SDK would be initialized here');
  };

  const handleCreditCardPayment = async () => {
    setIsProcessing(true);
    
    try {
      // In a real implementation, this would use Square's Web Payments SDK
      // to tokenize the card and get a payment token
      const mockPaymentToken = 'mock-payment-token-for-demo';
      
      const response = await apiRequest('/api/payments/process', {
        method: 'POST',
        body: JSON.stringify({
          deliveryRequestId,
          paymentToken: mockPaymentToken,
          amount,
          currency: 'USD'
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.success) {
        toast({
          title: "Payment Successful",
          description: `Payment of $${amount.toFixed(2)} processed successfully.`
        });
        onPaymentSuccess?.(response);
      } else {
        throw new Error(response.error || 'Payment failed');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      const errorMessage = error.message || 'Payment processing failed';
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
      const response = await apiRequest('/api/invoices/create', {
        method: 'POST',
        body: JSON.stringify({
          deliveryRequestId,
          customerEmail: 'customer@example.com', // Would get from form
          title: `Delivery Service - ${customerName}`,
          description: `Delivery service fee for ${customerName}`,
          amount,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
          autoCharge: false
        }),
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.success) {
        toast({
          title: "Invoice Created",
          description: "Invoice has been sent to the customer.",
        });
        
        // Open the invoice URL in a new tab
        if (response.publicUrl) {
          window.open(response.publicUrl, '_blank');
        }
        
        onPaymentSuccess?.(response);
      } else {
        throw new Error(response.error || 'Invoice creation failed');
      }
    } catch (error: any) {
      console.error('Invoice error:', error);
      const errorMessage = error.message || 'Invoice creation failed';
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
        <div className="p-4 border rounded-lg bg-muted/50">
          <h4 className="font-medium mb-2">Square Payment Processing</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Secure payment processing powered by Square. Accept credit cards, debit cards, and digital wallets.
          </p>
          <div className="text-xs text-muted-foreground">
            <strong>Note:</strong> Square integration requires API keys. Contact support to configure payment processing.
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <Button 
          onClick={handleCreditCardPayment}
          disabled={isProcessing}
          className="w-full"
          variant="default"
        >
          {isProcessing ? 'Processing...' : 'Pay Now with Card'}
        </Button>
        <Button 
          onClick={handleInvoiceRequest}
          disabled={isProcessing}
          className="w-full"
          variant="outline"
        >
          {isProcessing ? 'Creating...' : 'Send Invoice'}
        </Button>
        <div className="text-xs text-center text-muted-foreground">
          Payments are securely processed by Square
        </div>
      </CardFooter>
    </Card>
  );
}

export default SquarePayment;