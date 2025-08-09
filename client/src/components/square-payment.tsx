import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';

declare global {
  interface Window {
    Square?: any;
  }
}

interface SquarePaymentProps {
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

export function SquarePayment({ 
  amount, 
  deliveryRequestId, 
  customerName, 
  onPaymentSuccess, 
  onPaymentError 
}: SquarePaymentProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSquareLoaded, setIsSquareLoaded] = useState(false);
  const [cardButton, setCardButton] = useState<any>(null);
  const [payments, setPayments] = useState<any>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Get Square configuration from backend
  const { data: squareConfig } = useQuery<SquareConfig>({
    queryKey: ['/api/square/config'],
    retry: false
  });

  useEffect(() => {
    if (squareConfig?.applicationId && squareConfig?.environment) {
      loadSquareSDK();
    }
  }, [squareConfig]);

  const loadSquareSDK = async () => {
    try {
      // Load Square Web Payments SDK if not already loaded
      if (!window.Square) {
        const script = document.createElement('script');
        script.src = 'https://sandbox.web.squarecdn.com/v1/square.js'; // Use production URL for production
        script.async = true;
        script.onload = () => initializeSquarePayments();
        document.head.appendChild(script);
      } else {
        initializeSquarePayments();
      }
    } catch (error) {
      console.error('Error loading Square SDK:', error);
      onPaymentError?.('Failed to load payment system');
    }
  };

  const initializeSquarePayments = async () => {
    try {
      if (!window.Square) {
        throw new Error('Square SDK not loaded');
      }

      const paymentsInstance = window.Square.payments(
        squareConfig!.applicationId,
        squareConfig!.locationId
      );
      
      setPayments(paymentsInstance);

      // Initialize card payment form
      const card = await paymentsInstance.card();
      await card.attach(cardContainerRef.current);
      
      setCardButton(card);
      setIsSquareLoaded(true);
    } catch (error) {
      console.error('Error initializing Square:', error);
      onPaymentError?.('Failed to initialize payment form');
    }
  };

  const handleCreditCardPayment = async () => {
    if (!cardButton || !payments) {
      toast({
        title: "Payment Not Ready",
        description: "Payment form is still loading. Please try again.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      // Tokenize the card
      const result = await cardButton.tokenize();
      
      if (result.status === 'OK') {
        const paymentToken = result.token;
        
        const response = await apiRequest('/api/payments/process', 'POST', {
          deliveryRequestId,
          paymentToken,
          amount,
          currency: 'USD'
        });
        
        const responseData = await response.json();

        if (responseData.success) {
          toast({
            title: "Payment Successful",
            description: `Payment of $${amount.toFixed(2)} processed successfully.`
          });
          onPaymentSuccess?.(responseData);
        } else {
          throw new Error(responseData.error || 'Payment failed');
        }
      } else {
        throw new Error(result.errors?.[0]?.message || 'Card tokenization failed');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      let errorMessage = error.message || 'Payment processing failed';
      
      // Check if this is a configuration error
      if (error.message?.includes('Square payment not configured')) {
        errorMessage = 'Square payment not set up yet. Please contact the business to enable online payments.';
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
        customerEmail: 'customer@example.com', // Would get from form
        title: `Delivery Service - ${customerName}`,
        description: `Delivery service fee for ${customerName}`,
        amount,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days from now
        autoCharge: false
      });
      
      const responseData = await response.json();

      if (responseData.success) {
        toast({
          title: "Invoice Created",
          description: "Invoice has been sent to the customer.",
        });
        
        // Open the invoice URL in a new tab
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
      
      // Check if this is a configuration error
      if (error.message?.includes('Square payment not configured')) {
        errorMessage = 'Square payment not set up yet. Please contact the business to enable invoicing.';
      }
      
      toast({
        title: "Invoice Not Available",
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
        <CardTitle>Secure Payment</CardTitle>
        <CardDescription>
          Total amount: ${amount.toFixed(2)} for {customerName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isSquareLoaded && squareConfig ? (
          <div className="p-4 border rounded-lg bg-blue-50">
            <p className="text-sm text-blue-700">Loading payment form...</p>
          </div>
        ) : !squareConfig ? (
          <div className="p-4 border rounded-lg bg-yellow-50">
            <h4 className="font-medium mb-2 text-yellow-800">Payment Setup Required</h4>
            <p className="text-sm text-yellow-700 mb-3">
              Square payment processing is not configured yet.
            </p>
            <div className="text-xs text-yellow-600">
              Contact the business to enable online payments.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-3">Card Information</h4>
              <div 
                ref={cardContainerRef} 
                id="card-container"
                className="min-h-[120px] p-3 border rounded bg-white"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Your payment is secured by Square's encryption technology
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        {squareConfig && (
          <Button 
            onClick={handleCreditCardPayment}
            disabled={isProcessing || !isSquareLoaded}
            className="w-full"
            variant="default"
          >
            {isProcessing ? 'Processing Payment...' : `Pay $${amount.toFixed(2)}`}
          </Button>
        )}
        <Button 
          onClick={handleInvoiceRequest}
          disabled={isProcessing}
          className="w-full"
          variant="outline"
        >
          {isProcessing ? 'Creating...' : 'Send Invoice Instead'}
        </Button>
        <div className="text-xs text-center text-muted-foreground">
          Powered by Square
        </div>
      </CardFooter>
    </Card>
  );
}

export default SquarePayment;