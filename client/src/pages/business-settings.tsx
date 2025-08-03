import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Settings, DollarSign, Clock, MapPin, Bell, CreditCard, Globe, Phone, Mail } from "lucide-react";

// Business settings form schema
const businessSettingsSchema = z.object({
  // Pricing
  baseDeliveryFee: z.string().min(1, "Base delivery fee is required"),
  urgentDeliveryFee: z.string().min(1, "Urgent delivery fee is required"),
  freeDeliveryThreshold: z.string().optional(),
  loyaltyPointsPerDollar: z.number().min(1).max(10),
  pointsForFreeDelivery: z.number().min(5).max(50),
  
  // Service
  maxDeliveryRadius: z.number().min(5).max(100),
  averageDeliveryTime: z.number().min(10).max(120),
  
  // Contact
  businessPhone: z.string().optional(),
  businessEmail: z.string().email().optional().or(z.literal("")),
  businessAddress: z.string().optional(),
  websiteUrl: z.string().url().optional().or(z.literal("")),
  
  // Features
  enableRealTimeTracking: z.boolean(),
  enableLoyaltyProgram: z.boolean(),
  enableScheduledDeliveries: z.boolean(),
  enableMultiStopDeliveries: z.boolean(),
  
  // Payment
  requirePaymentUpfront: z.boolean(),
  
  // Notifications
  smsNotifications: z.boolean(),
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
});

type BusinessSettingsForm = z.infer<typeof businessSettingsSchema>;

export default function BusinessSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("pricing");

  // Fetch business settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/admin/business-settings'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Form setup
  const form = useForm<BusinessSettingsForm>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: {
      baseDeliveryFee: settings?.baseDeliveryFee || "5.00",
      urgentDeliveryFee: settings?.urgentDeliveryFee || "10.00",
      freeDeliveryThreshold: settings?.freeDeliveryThreshold || "",
      loyaltyPointsPerDollar: settings?.loyaltyPointsPerDollar || 1,
      pointsForFreeDelivery: settings?.pointsForFreeDelivery || 10,
      maxDeliveryRadius: settings?.maxDeliveryRadius || 25,
      averageDeliveryTime: settings?.averageDeliveryTime || 30,
      businessPhone: settings?.businessPhone || "",
      businessEmail: settings?.businessEmail || "",
      businessAddress: settings?.businessAddress || "",
      websiteUrl: settings?.websiteUrl || "",
      enableRealTimeTracking: settings?.enableRealTimeTracking ?? true,
      enableLoyaltyProgram: settings?.enableLoyaltyProgram ?? true,
      enableScheduledDeliveries: settings?.enableScheduledDeliveries ?? false,
      enableMultiStopDeliveries: settings?.enableMultiStopDeliveries ?? false,
      requirePaymentUpfront: settings?.requirePaymentUpfront ?? false,
      smsNotifications: settings?.customerNotifications?.sms ?? true,
      emailNotifications: settings?.customerNotifications?.email ?? true,
      pushNotifications: settings?.customerNotifications?.push ?? false,
    },
  });

  // Update settings mutation
  const updateSettings = useMutation({
    mutationFn: (data: BusinessSettingsForm) =>
      apiRequest('/api/admin/business-settings', {
        method: 'PUT',
        body: {
          baseDeliveryFee: data.baseDeliveryFee,
          urgentDeliveryFee: data.urgentDeliveryFee,
          freeDeliveryThreshold: data.freeDeliveryThreshold,
          loyaltyPointsPerDollar: data.loyaltyPointsPerDollar,
          pointsForFreeDelivery: data.pointsForFreeDelivery,
          maxDeliveryRadius: data.maxDeliveryRadius,
          averageDeliveryTime: data.averageDeliveryTime,
          businessPhone: data.businessPhone,
          businessEmail: data.businessEmail,
          businessAddress: data.businessAddress,
          websiteUrl: data.websiteUrl,
          enableRealTimeTracking: data.enableRealTimeTracking,
          enableLoyaltyProgram: data.enableLoyaltyProgram,
          enableScheduledDeliveries: data.enableScheduledDeliveries,
          enableMultiStopDeliveries: data.enableMultiStopDeliveries,
          requirePaymentUpfront: data.requirePaymentUpfront,
          customerNotifications: {
            sms: data.smsNotifications,
            email: data.emailNotifications,
            push: data.pushNotifications,
          },
        },
      }),
    onSuccess: () => {
      toast({ title: "Settings updated successfully!" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/business-settings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BusinessSettingsForm) => {
    updateSettings.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Settings className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Business Settings</h1>
        </div>
        <div className="text-center py-8">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6" />
        <h1 className="text-2xl font-bold">Business Settings</h1>
        <Badge variant="secondary" className="ml-2">Admin</Badge>
      </div>

      <form onSubmit={form.handleSubmit(onSubmit)}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="pricing" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="service" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Service
            </TabsTrigger>
            <TabsTrigger value="contact" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Contact
            </TabsTrigger>
            <TabsTrigger value="features" className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Features
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Notifications
            </TabsTrigger>
          </TabsList>

          {/* Pricing Settings */}
          <TabsContent value="pricing">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Pricing Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="baseDeliveryFee">Base Delivery Fee ($)</Label>
                    <Input
                      id="baseDeliveryFee"
                      type="number"
                      step="0.01"
                      {...form.register("baseDeliveryFee")}
                    />
                    {form.formState.errors.baseDeliveryFee && (
                      <p className="text-sm text-red-500">{form.formState.errors.baseDeliveryFee.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="urgentDeliveryFee">Urgent Delivery Fee ($)</Label>
                    <Input
                      id="urgentDeliveryFee"
                      type="number"
                      step="0.01"
                      {...form.register("urgentDeliveryFee")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="freeDeliveryThreshold">Free Delivery Threshold ($)</Label>
                    <Input
                      id="freeDeliveryThreshold"
                      type="number"
                      step="0.01"
                      placeholder="Optional minimum order"
                      {...form.register("freeDeliveryThreshold")}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Loyalty Program</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="loyaltyPointsPerDollar">Points per Dollar Spent</Label>
                      <Input
                        id="loyaltyPointsPerDollar"
                        type="number"
                        min="1"
                        max="10"
                        {...form.register("loyaltyPointsPerDollar", { valueAsNumber: true })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pointsForFreeDelivery">Points for Free Delivery</Label>
                      <Input
                        id="pointsForFreeDelivery"
                        type="number"
                        min="5"
                        max="50"
                        {...form.register("pointsForFreeDelivery", { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Service Settings */}
          <TabsContent value="service">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Service Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="maxDeliveryRadius">Max Delivery Radius (miles)</Label>
                    <Input
                      id="maxDeliveryRadius"
                      type="number"
                      min="5"
                      max="100"
                      {...form.register("maxDeliveryRadius", { valueAsNumber: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="averageDeliveryTime">Average Delivery Time (minutes)</Label>
                    <Input
                      id="averageDeliveryTime"
                      type="number"
                      min="10"
                      max="120"
                      {...form.register("averageDeliveryTime", { valueAsNumber: true })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Settings */}
          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Business Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessPhone">Business Phone</Label>
                    <Input
                      id="businessPhone"
                      type="tel"
                      placeholder="(555) 123-4567"
                      {...form.register("businessPhone")}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="businessEmail">Business Email</Label>
                    <Input
                      id="businessEmail"
                      type="email"
                      placeholder="contact@business.com"
                      {...form.register("businessEmail")}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessAddress">Business Address</Label>
                  <Input
                    id="businessAddress"
                    placeholder="123 Main St, City, State 12345"
                    {...form.register("businessAddress")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website URL</Label>
                  <Input
                    id="websiteUrl"
                    type="url"
                    placeholder="https://yourbusiness.com"
                    {...form.register("websiteUrl")}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Settings */}
          <TabsContent value="features">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Service Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Real-Time Tracking</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow customers to track their deliveries in real-time
                      </p>
                    </div>
                    <Switch
                      checked={form.watch("enableRealTimeTracking")}
                      onCheckedChange={(checked) => form.setValue("enableRealTimeTracking", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Loyalty Program</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable points-based loyalty rewards for customers
                      </p>
                    </div>
                    <Switch
                      checked={form.watch("enableLoyaltyProgram")}
                      onCheckedChange={(checked) => form.setValue("enableLoyaltyProgram", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Scheduled Deliveries</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow customers to schedule deliveries for later
                      </p>
                    </div>
                    <Switch
                      checked={form.watch("enableScheduledDeliveries")}
                      onCheckedChange={(checked) => form.setValue("enableScheduledDeliveries", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Multi-Stop Deliveries</Label>
                      <p className="text-sm text-muted-foreground">
                        Enable deliveries with multiple pickup/drop-off points
                      </p>
                    </div>
                    <Switch
                      checked={form.watch("enableMultiStopDeliveries")}
                      onCheckedChange={(checked) => form.setValue("enableMultiStopDeliveries", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Payment Upfront</Label>
                      <p className="text-sm text-muted-foreground">
                        Require customers to pay before delivery starts
                      </p>
                    </div>
                    <Switch
                      checked={form.watch("requirePaymentUpfront")}
                      onCheckedChange={(checked) => form.setValue("requirePaymentUpfront", checked)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Customer Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>SMS Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send delivery updates via text message
                    </p>
                  </div>
                  <Switch
                    checked={form.watch("smsNotifications")}
                    onCheckedChange={(checked) => form.setValue("smsNotifications", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send delivery updates via email
                    </p>
                  </div>
                  <Switch
                    checked={form.watch("emailNotifications")}
                    onCheckedChange={(checked) => form.setValue("emailNotifications", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Push Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Send real-time push notifications via app
                    </p>
                  </div>
                  <Switch
                    checked={form.watch("pushNotifications")}
                    onCheckedChange={(checked) => form.setValue("pushNotifications", checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-6">
          <Button
            type="submit"
            disabled={updateSettings.isPending}
            className="min-w-[120px]"
          >
            {updateSettings.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}