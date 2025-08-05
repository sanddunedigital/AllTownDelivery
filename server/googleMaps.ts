interface DistanceResult {
  distance: number; // in miles
  duration: number; // in minutes
  status: 'OK' | 'ERROR';
  errorMessage?: string;
}

interface AddressValidationResult {
  isValid: boolean;
  formattedAddress?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  errorMessage?: string;
}

export class GoogleMapsService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('GOOGLE_MAPS_API_KEY environment variable is required');
    }
  }

  /**
   * Calculate driving distance and time between two addresses
   */
  async calculateDistance(originAddress: string, destinationAddress: string): Promise<DistanceResult> {
    try {
      const baseUrl = 'https://maps.googleapis.com/maps/api/distancematrix/json';
      const params = new URLSearchParams({
        origins: originAddress,
        destinations: destinationAddress,
        units: 'imperial', // Use miles
        mode: 'driving',
        key: this.apiKey
      });

      const response = await fetch(`${baseUrl}?${params}`);
      const data = await response.json();

      if (data.status !== 'OK') {
        return {
          distance: 0,
          duration: 0,
          status: 'ERROR',
          errorMessage: `Google Maps API error: ${data.status}`
        };
      }

      const element = data.rows[0]?.elements[0];
      if (!element || element.status !== 'OK') {
        return {
          distance: 0,
          duration: 0,
          status: 'ERROR',
          errorMessage: 'Could not calculate distance between addresses'
        };
      }

      // Convert meters to miles and seconds to minutes
      const distanceInMiles = element.distance.value * 0.000621371;
      const durationInMinutes = Math.ceil(element.duration.value / 60);

      return {
        distance: Math.round(distanceInMiles * 100) / 100, // Round to 2 decimal places
        duration: durationInMinutes,
        status: 'OK'
      };
    } catch (error) {
      console.error('Error calculating distance:', error);
      return {
        distance: 0,
        duration: 0,
        status: 'ERROR',
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Validate and format an address using Google Places API
   */
  async validateAddress(address: string): Promise<AddressValidationResult> {
    try {
      const baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';
      const params = new URLSearchParams({
        address: address,
        key: this.apiKey
      });

      const response = await fetch(`${baseUrl}?${params}`);
      const data = await response.json();

      if (data.status !== 'OK') {
        return {
          isValid: false,
          errorMessage: `Address validation failed: ${data.status}`
        };
      }

      if (!data.results || data.results.length === 0) {
        return {
          isValid: false,
          errorMessage: 'No results found for this address'
        };
      }

      const result = data.results[0];
      return {
        isValid: true,
        formattedAddress: result.formatted_address,
        coordinates: {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng
        }
      };
    } catch (error) {
      console.error('Error validating address:', error);
      return {
        isValid: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Calculate delivery fee based on distance and business settings
   */
  calculateDeliveryFee(
    distance: number,
    businessSettings: {
      baseDeliveryFee: number;
      pricePerMile: number;
      baseFeeRadius: number;
      rushDeliveryMultiplier?: number;
    },
    isRush: boolean = false
  ): number {
    let fee = businessSettings.baseDeliveryFee;

    // If distance exceeds base fee radius, add per-mile charges
    if (distance > businessSettings.baseFeeRadius) {
      const extraMiles = distance - businessSettings.baseFeeRadius;
      fee += extraMiles * businessSettings.pricePerMile;
    }

    // Apply rush delivery multiplier if requested
    if (isRush && businessSettings.rushDeliveryMultiplier) {
      fee *= businessSettings.rushDeliveryMultiplier;
    }

    return Math.round(fee * 100) / 100; // Round to 2 decimal places
  }
}

export const googleMapsService = new GoogleMapsService();