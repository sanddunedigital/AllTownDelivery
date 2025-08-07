import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, MapPin, ExternalLink } from "lucide-react";

interface PlaceSearchResult {
  place_id: string;
  name: string;
  formatted_address: string;
}

interface PlaceIdFinderProps {
  onPlaceIdFound: (placeId: string) => void;
}

export function PlaceIdFinder({ onPlaceIdFound }: PlaceIdFinderProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<PlaceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [urlPlaceId, setUrlPlaceId] = useState("");

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch("/api/admin/google-places/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery }),
      });
      
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const extractPlaceIdFromUrl = (url: string): string | null => {
    try {
      // Handle Google Maps URLs - extract the hex-based ID and convert it
      const hexMatch = url.match(/0x[a-f0-9]+:0x([a-f0-9]+)/i);
      if (hexMatch) {
        // Convert hex ID to ChIJ format using a conversion service or return the hex for now
        // For now, we'll try the hex ID directly with the Google API
        return hexMatch[0];
      }
      
      // Look for existing ChIJ format Place IDs
      const placeIdMatch = url.match(/place_id=([^&]+)/);
      if (placeIdMatch) {
        return decodeURIComponent(placeIdMatch[1]);
      }
      
      // Look for Place IDs in the URL path
      const pathMatch = url.match(/place\/([^\/\?]+)/);
      if (pathMatch && pathMatch[1].startsWith('ChIJ')) {
        return decodeURIComponent(pathMatch[1]);
      }
      
      return null;
    } catch {
      return null;
    }
  };

  const handleUrlExtraction = () => {
    const placeId = extractPlaceIdFromUrl(urlPlaceId);
    if (placeId) {
      onPlaceIdFound(placeId);
    }
  };

  const testPlaceId = async (placeId: string) => {
    if (!placeId.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch("/api/admin/google-places/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId }),
      });
      
      const data = await response.json();
      if (data.success) {
        setSearchResults([{
          place_id: placeId,
          name: data.name || "Business Found",
          formatted_address: data.address || "Address not available"
        }]);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error("Test error:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Search className="w-5 h-5" />
          Place ID Finder
        </CardTitle>
        <CardDescription>
          Can't find your Place ID? Use these tools to locate it for your business.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* URL Extraction Method */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Method 1: Extract from Google Maps URL</Label>
          <p className="text-sm text-muted-foreground">
            Go to Google Maps, search for your business, copy the URL from your browser, and paste it below:
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Paste your Google Maps URL here..."
              value={urlPlaceId}
              onChange={(e) => setUrlPlaceId(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={handleUrlExtraction}
              disabled={!urlPlaceId.trim()}
              variant="outline"
            >
              Extract ID
            </Button>
          </div>
          {urlPlaceId && extractPlaceIdFromUrl(urlPlaceId) && (
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <p className="text-sm text-green-800">
                Found Place ID: <code className="bg-white px-1 rounded">{extractPlaceIdFromUrl(urlPlaceId)}</code>
              </p>
            </div>
          )}
        </div>

        {/* Search Method */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Method 2: Search for your business</Label>
          <p className="text-sm text-muted-foreground">
            Try different variations of your business name, with or without location:
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Search: Sara's Quickie, Oskaloosa delivery, etc..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button 
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
            >
              {isSearching ? "Searching..." : "Search"}
            </Button>
          </div>
          
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Search Results:</Label>
              {searchResults.map((result) => (
                <div
                  key={result.place_id}
                  className="flex items-center justify-between p-3 border rounded hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">{result.name}</span>
                    </div>
                    <p className="text-sm text-gray-600">{result.formatted_address}</p>
                    <p className="text-xs text-gray-500 font-mono">{result.place_id}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => onPlaceIdFound(result.place_id)}
                  >
                    Use This ID
                  </Button>
                </div>
              ))}
            </div>
          )}
          
          {searchResults.length === 0 && searchQuery && !isSearching && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-sm text-yellow-800">
                No results found. Try different search terms or check if your business is listed on Google Business Profile.
              </p>
            </div>
          )}
        </div>

        {/* Manual Instructions */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded">
          <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            Alternative: Use Google's Official Place ID Finder
          </h4>
          <p className="text-sm text-blue-800 mb-2">
            If the above methods don't work, you can use Google's official tool:
          </p>
          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>Go to <a href="https://developers.google.com/maps/documentation/places/web-service/place-id" target="_blank" className="underline">Google's Place ID Finder</a></li>
            <li>Search for your business name and location</li>
            <li>Copy the Place ID that starts with "ChIJ..."</li>
            <li>Paste it in the Place ID field above</li>
          </ol>
        </div>

        {/* Test Place ID */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Method 3: Test Your Place ID</Label>
          <p className="text-sm text-muted-foreground">
            If you have a Place ID but want to verify it works with your current API:
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Enter Place ID to test (ChIJ... format)"
              value={urlPlaceId}
              onChange={(e) => setUrlPlaceId(e.target.value)}
              className="flex-1"
            />
            <Button 
              onClick={() => testPlaceId(urlPlaceId)}
              disabled={!urlPlaceId.trim() || isSearching}
              variant="outline"
            >
              {isSearching ? "Testing..." : "Test ID"}
            </Button>
          </div>
        </div>

        {/* No Reviews Explanation */}
        <div className="p-4 bg-gray-50 border rounded">
          <h4 className="font-medium text-gray-900 mb-2">Don't have a Google Business Profile?</h4>
          <p className="text-sm text-gray-700 mb-2">
            If you can't find your Place ID, your business might not be listed on Google Business Profile yet.
          </p>
          <p className="text-sm text-gray-700 mb-3">
            You'll need to create a Google Business Profile first to get reviews and a Place ID. 
            Visit <a href="https://business.google.com" target="_blank" className="text-blue-600 underline">business.google.com</a> to get started.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded mt-3">
            <p className="text-sm text-yellow-800">
              <strong>Based on your Google Maps URL:</strong> Your business appears to exist on Google Maps but may not have a Google Business Profile set up yet. 
              This means you have location data but no reviews to display. Setting up a Google Business Profile will enable customer reviews.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}