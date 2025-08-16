import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, AlertTriangle, ArrowLeft, Globe } from "lucide-react";

export default function TenantNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="pt-6">
          <div className="text-center space-y-6">
            <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto" />
            <h2 className="text-2xl font-bold text-gray-900">Delivery Service Not Found</h2>
            <p className="text-gray-600">
              This subdomain is not associated with any delivery service on AllTownDelivery.
            </p>
            
            <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
              <p className="text-sm text-orange-800">
                <strong>This could happen if:</strong>
              </p>
              <ul className="text-sm text-orange-800 mt-2 space-y-1 text-left">
                <li>• The delivery service hasn't completed their setup</li>
                <li>• There's a typo in the website address</li>
                <li>• The business is no longer active</li>
              </ul>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <div className="flex items-start space-x-3">
                <Globe className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-left">
                  <p className="text-sm font-medium text-blue-900">
                    Looking for delivery services in your area?
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Visit AllTownDelivery.com to find local delivery services and place orders.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="https://alltowndelivery.com" className="flex-1">
                <Button className="w-full bg-blue-600 hover:bg-blue-700">
                  <Truck className="w-4 h-4 mr-2" />
                  Find Delivery Services
                </Button>
              </Link>
              <Link href="https://alltowndelivery.com/join" className="flex-1">
                <Button variant="outline" className="w-full">
                  Start Your Business
                </Button>
              </Link>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                If you believe this is an error, please contact the delivery service directly
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}