interface GooglePlacesReview {
  author_name: string;
  author_url?: string;
  profile_photo_url?: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
}

interface GooglePlacesResponse {
  result: {
    name: string;
    rating: number;
    user_ratings_total: number;
    reviews: GooglePlacesReview[];
  };
  status: string;
}

export class GooglePlacesService {
  private apiKey: string;

  constructor() {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_MAPS_API_KEY environment variable is required');
    }
    this.apiKey = apiKey;
  }

  async getPlaceReviews(placeId: string): Promise<{
    reviews: GooglePlacesReview[];
    rating: number;
    user_ratings_total: number;
  } | null> {
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
      url.searchParams.append('place_id', placeId);
      url.searchParams.append('fields', 'name,rating,user_ratings_total,reviews');
      url.searchParams.append('key', this.apiKey);
      url.searchParams.append('reviews_sort', 'newest');

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        console.error(`Google Places API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data: GooglePlacesResponse = await response.json();
      
      if (data.status !== 'OK') {
        console.error(`Google Places API status error: ${data.status}`);
        return null;
      }

      return {
        reviews: data.result.reviews || [],
        rating: data.result.rating || 0,
        user_ratings_total: data.result.user_ratings_total || 0,
      };
    } catch (error) {
      console.error('Error fetching Google Places reviews:', error);
      return null;
    }
  }

  /**
   * Search for a place by name and address to get Place ID
   * Useful for businesses to find their Place ID
   */
  async searchPlace(query: string): Promise<{ place_id: string; name: string; formatted_address: string }[]> {
    try {
      const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
      url.searchParams.append('query', query);
      url.searchParams.append('key', this.apiKey);

      const response = await fetch(url.toString());
      
      if (!response.ok) {
        console.error(`Google Places Search API error: ${response.status} ${response.statusText}`);
        return [];
      }

      const data = await response.json();
      
      if (data.status !== 'OK') {
        console.error(`Google Places Search API status error: ${data.status}`);
        return [];
      }

      return data.results.map((result: any) => ({
        place_id: result.place_id,
        name: result.name,
        formatted_address: result.formatted_address,
      }));
    } catch (error) {
      console.error('Error searching Google Places:', error);
      return [];
    }
  }
}