import { SquareClient, SquareEnvironment } from 'square';
import { randomUUID } from 'crypto';

// Note: Square clients are now created per-tenant with their own credentials

export interface PaymentRequest {
  paymentToken: string;
  amount: number; // Amount in cents
  currency?: string;
  orderId?: string;
  customerId?: string;
  description?: string;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  status?: string;
  receiptUrl?: string;
  error?: string;
}

export interface InvoiceRequest {
  orderId: string;
  customerId: string;
  title: string;
  description: string;
  amount: number; // Amount in cents
  dueDate?: string;
  autoCharge?: boolean;
}

export interface InvoiceResult {
  success: boolean;
  invoiceId?: string;
  publicUrl?: string;
  status?: string;
  error?: string;
}

export class SquareService {
  private squareClient: InstanceType<typeof SquareClient>;
  private paymentsApi: any;
  private customersApi: any;
  private ordersApi: any;
  private invoicesApi: any;
  private locationId: string;

  constructor(config: {
    accessToken: string;
    applicationId: string;
    locationId: string;
    environment?: 'sandbox' | 'production';
  }) {
    if (!config.accessToken || !config.locationId) {
      throw new Error('Square access token and location ID are required');
    }

    this.locationId = config.locationId;
    
    this.squareClient = new SquareClient({
      accessToken: config.accessToken,
      environment: config.environment === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
    });

    this.paymentsApi = this.squareClient.paymentsApi;
    this.customersApi = this.squareClient.customersApi;
    this.ordersApi = this.squareClient.ordersApi;
    this.invoicesApi = this.squareClient.invoicesApi;
  }

  /**
   * Process a payment using Square's Payments API
   */
  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    try {
      const paymentRequest = {
        sourceId: request.paymentToken,
        idempotencyKey: randomUUID(),
        amountMoney: {
          amount: BigInt(request.amount),
          currency: request.currency || 'USD'
        },
        locationId: this.locationId!,
        autocomplete: true,
        note: request.description || 'Delivery payment processed via Square',
        orderId: request.orderId,
        buyerEmailAddress: request.customerId ? undefined : undefined, // Will be filled from customer data if available
      };

      const response = await this.paymentsApi.createPayment(paymentRequest);

      if (response.result.payment) {
        return {
          success: true,
          paymentId: response.result.payment.id,
          status: response.result.payment.status,
          receiptUrl: response.result.payment.receiptUrl
        };
      } else {
        return {
          success: false,
          error: 'Payment creation failed'
        };
      }
    } catch (error: any) {
      console.error('Square payment error:', error);
      return {
        success: false,
        error: error.message || 'Payment processing failed'
      };
    }
  }

  /**
   * Create a Square customer
   */
  async createCustomer(customerData: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
  }) {
    try {
      const request = {
        givenName: customerData.firstName,
        familyName: customerData.lastName,
        emailAddress: customerData.email,
        phoneNumber: customerData.phone
      };

      const response = await this.customersApi.createCustomer(request);
      return response.result.customer;
    } catch (error: any) {
      console.error('Square customer creation error:', error);
      throw new Error(`Customer creation failed: ${error.message}`);
    }
  }

  /**
   * Create a Square order for invoicing
   */
  async createOrder(orderData: {
    customerId?: string;
    lineItems: Array<{
      name: string;
      quantity: string;
      basePriceMoney: { amount: bigint; currency: string };
    }>;
  }) {
    try {
      const request = {
        order: {
          locationId: this.locationId!,
          lineItems: orderData.lineItems,
          customerId: orderData.customerId,
        },
        idempotencyKey: randomUUID()
      };

      const response = await this.ordersApi.createOrder(request);
      return response.result.order;
    } catch (error: any) {
      console.error('Square order creation error:', error);
      throw new Error(`Order creation failed: ${error.message}`);
    }
  }

  /**
   * Create and optionally publish an invoice
   */
  async createInvoice(request: InvoiceRequest): Promise<InvoiceResult> {
    try {
      // First, create an order for the invoice
      const order = await this.createOrder({
        customerId: request.customerId,
        lineItems: [{
          name: request.title,
          quantity: '1',
          basePriceMoney: {
            amount: BigInt(request.amount),
            currency: 'USD'
          }
        }]
      });

      if (!order?.id) {
        return {
          success: false,
          error: 'Failed to create order for invoice'
        };
      }

      // Create the invoice
      const dueDate = request.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const invoiceRequest = {
        invoice: {
          locationId: this.locationId!,
          orderId: order.id,
          primaryRecipient: {
            customerId: request.customerId
          },
          deliveryMethod: 'EMAIL',
          paymentRequests: [{
            requestType: 'BALANCE',
            dueDate: dueDate,
            tippingEnabled: false,
            automaticPaymentSource: request.autoCharge ? 'CARD_ON_FILE' : 'NONE'
          }],
          title: request.title,
          description: request.description,
          acceptedPaymentMethods: {
            card: true,
            squareGiftCard: false,
            bankAccount: false,
            buyNowPayLater: false,
            cashAppPay: true
          }
        },
        idempotencyKey: randomUUID()
      };

      const invoiceResponse = await this.invoicesApi.createInvoice(invoiceRequest);

      if (!invoiceResponse.result.invoice?.id) {
        return {
          success: false,
          error: 'Failed to create invoice'
        };
      }

      const invoiceId = invoiceResponse.result.invoice.id;

      // Publish the invoice to send it to the customer
      const publishRequest = {
        version: invoiceResponse.result.invoice.version || 0,
        idempotencyKey: randomUUID()
      };

      const publishResponse = await this.invoicesApi.publishInvoice(invoiceId, publishRequest);

      if (publishResponse.result.invoice) {
        return {
          success: true,
          invoiceId: invoiceId,
          publicUrl: publishResponse.result.invoice.publicUrl,
          status: publishResponse.result.invoice.status
        };
      } else {
        return {
          success: false,
          error: 'Failed to publish invoice'
        };
      }
    } catch (error: any) {
      console.error('Square invoice error:', error);
      return {
        success: false,
        error: error.message || 'Invoice creation failed'
      };
    }
  }

  /**
   * Get invoice details
   */
  async getInvoice(invoiceId: string) {
    try {
      const response = await this.invoicesApi.getInvoice(invoiceId);
      return response.result.invoice;
    } catch (error: any) {
      console.error('Square get invoice error:', error);
      throw new Error(`Failed to get invoice: ${error.message}`);
    }
  }

  /**
   * Process a refund
   */
  async refundPayment(paymentId: string, refundAmount: number, reason?: string) {
    try {
      const request = {
        idempotencyKey: randomUUID(),
        amountMoney: {
          amount: BigInt(refundAmount),
          currency: 'USD'
        },
        paymentId: paymentId,
        reason: reason || 'Customer requested refund'
      };

      const response = await this.squareClient.refundsApi.refundPayment(request);
      return response.result.refund;
    } catch (error: any) {
      console.error('Square refund error:', error);
      throw new Error(`Refund failed: ${error.message}`);
    }
  }
}

// Factory function to create SquareService with tenant-specific config
export function createSquareService(config: {
  accessToken: string;
  applicationId: string;
  locationId: string;
  environment?: 'sandbox' | 'production';
}) {
  return new SquareService(config);
}