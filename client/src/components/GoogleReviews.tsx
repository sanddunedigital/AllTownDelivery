import { useQuery } from "@tanstack/react-query";
import { Star, Clock, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Review {
  author_name: string;
  author_url?: string;
  profile_photo_url?: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
}

interface ReviewsData {
  reviews: Review[];
  rating: number;
  user_ratings_total: number;
  lastUpdated: string | null;
  placeId?: string;
}

const StarRating = ({ rating, className = "h-4 w-4" }: { rating: number; className?: string }) => {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${className} ${
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );
};

export function GoogleReviews() {
  const { data: reviewsData, isLoading, error } = useQuery<ReviewsData>({
    queryKey: ['/api/reviews'],
    refetchInterval: 1000 * 60 * 60, // Refresh every hour
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-4" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !reviewsData || reviewsData.reviews.length === 0) {
    return null; // Don't show anything if no reviews or error
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span>Customer Reviews</span>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Google Reviews
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {reviewsData.lastUpdated ? 
                `Updated ${new Date(reviewsData.lastUpdated).toLocaleDateString()}` :
                'No recent updates'
              }
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Overall Rating Summary */}
          <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{reviewsData.rating.toFixed(1)}</div>
              <StarRating rating={Math.round(reviewsData.rating)} className="h-5 w-5" />
              <div className="text-sm text-gray-600 mt-1">
                {reviewsData.user_ratings_total} reviews
              </div>
            </div>
          </div>

          {/* Individual Reviews */}
          <div className="space-y-4">
            {reviewsData.reviews.slice(0, 5).map((review, index) => (
              <div key={index} className="border-b border-gray-200 last:border-b-0 pb-4 last:pb-0">
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    {review.profile_photo_url ? (
                      <img
                        src={review.profile_photo_url}
                        alt={review.author_name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold">
                        {review.author_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Author and Rating */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {review.author_url ? (
                          <a
                            href={review.author_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-gray-900 hover:text-blue-600 flex items-center gap-1"
                          >
                            {review.author_name}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="font-semibold text-gray-900">
                            {review.author_name}
                          </span>
                        )}
                        <StarRating rating={review.rating} />
                      </div>
                      <span className="text-sm text-gray-500">
                        {review.relative_time_description}
                      </span>
                    </div>

                    {/* Review Text */}
                    <p className="text-gray-700 text-sm leading-relaxed">
                      {review.text}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Show more reviews link */}
          {reviewsData.reviews.length > 5 && (
            <div className="mt-4 text-center">
              <span className="text-sm text-gray-600">
                Showing 5 of {reviewsData.reviews.length} reviews
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default GoogleReviews;