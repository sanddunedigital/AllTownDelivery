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
  private client: InstanceType<typeof SquareClient>;
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
    
    this.client = new SquareClient({
      token: config.accessToken,
      environment: config.environment === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox
    });
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
          currency: (request.currency || 'USD') as 'USD'
        },
        locationId: this.locationId!,
        autocomplete: true,
        note: request.description || 'Delivery payment processed via Square',
        ...(request.orderId && { orderId: request.orderId })
      };

      const response = await this.client.payments.create(paymentRequest);

      if (response.payment) {
        // Handle BigInt serialization
        const payment = JSON.parse(JSON.stringify(response.payment, (key, value) => {
          return typeof value === "bigint" ? Number(value) : value;
        }));
        
        return {
          success: true,
          paymentId: payment.id,
          status: payment.status,
          receiptUrl: payment.receiptUrl
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
        ...(customerData.firstName && { givenName: customerData.firstName }),
        ...(customerData.lastName && { familyName: customerData.lastName }),
        ...(customerData.email && { emailAddress: customerData.email }),
        ...(customerData.phone && { phoneNumber: customerData.phone })
      };

      const response = await this.client.customers.create(request);
      // Handle BigInt serialization
      const customer = JSON.parse(JSON.stringify(response.customer, (key, value) => {
        return typeof value === "bigint" ? Number(value) : value;
      }));
      return customer;
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
        idempotencyKey: randomUUID(),
        order: {
          locationId: this.locationId!,
          lineItems: orderData.lineItems,
          ...(orderData.customerId && { customerId: orderData.customerId })
        }
      };

      const response = await this.client.orders.create(request);
      // Handle BigInt serialization
      const order = JSON.parse(JSON.stringify(response.order, (key, value) => {
        return typeof value === "bigint" ? Number(value) : value;
      }));
      return order;
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
            currency: 'USD' as 'USD'
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
        idempotencyKey: randomUUID(),
        invoice: {
          locationId: this.locationId!,
          orderId: order.id,
          primaryRecipient: {
            customerId: request.customerId
          },
          deliveryMethod: 'EMAIL' as 'EMAIL',
          paymentRequests: [{
            requestType: 'BALANCE' as 'BALANCE',
            dueDate: dueDate,
            tippingEnabled: false,
            automaticPaymentSource: (request.autoCharge ? 'CARD_ON_FILE' : 'NONE') as any
          }],
          invoiceNumber: request.title,
          title: request.title,
          description: request.description,
          acceptedPaymentMethods: {
            card: true,
            squareGiftCard: false,
            bankAccount: false,
            buyNowPayLater: false,
            cashAppPay: true
          }
        }
      };

      const invoiceResponse = await this.client.invoices.create(invoiceRequest);

      if (!invoiceResponse.invoice?.id) {
        return {
          success: false,
          error: 'Failed to create invoice'
        };
      }

      const invoiceId = invoiceResponse.invoice!.id;

      // Publish the invoice to send it to the customer
      const publishRequest = {
        idempotencyKey: randomUUID(),
        version: invoiceResponse.invoice?.version || 0
      };

      const publishResponse = await this.client.invoices.publish({ invoiceId, ...publishRequest });

      if (publishResponse.invoice) {
        return {
          success: true,
          invoiceId: invoiceId,
          publicUrl: publishResponse.invoice?.publicUrl,
          status: publishResponse.invoice?.status
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
      const response = await this.client.invoices.get({ invoiceId });
      // Handle BigInt serialization
      const invoice = JSON.parse(JSON.stringify(response.invoice, (key, value) => {
        return typeof value === "bigint" ? Number(value) : value;
      }));
      return invoice;
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
          currency: 'USD' as 'USD'
        },
        paymentId: paymentId,
        reason: reason || 'Customer requested refund'
      };

      const response = await this.client.refunds.refundPayment(request);
      // Handle BigInt serialization
      const refund = JSON.parse(JSON.stringify(response.refund, (key, value) => {
        return typeof value === "bigint" ? Number(value) : value;
      }));
      return refund;
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