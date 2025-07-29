import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  
  const { updatePassword } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  useEffect(() => {
    const initializeRecovery = async () => {
      try {
        // Check if we have the necessary URL fragments for password reset
        const hash = window.location.hash;
        console.log('Hash found:', hash);
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');
        const expiresAt = params.get('expires_at');
        
        console.log('Parsed tokens:', { accessToken: !!accessToken, refreshToken: !!refreshToken, type, expiresAt });
        
        if (accessToken && refreshToken && type === 'recovery') {
          // Set the session using the tokens from the URL
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (error) {
            console.error('Session recovery error:', error);
            setIsValidToken(false);
            toast({
              title: "Error",
              description: "Invalid or expired reset link. Please request a new password reset.",
              variant: "destructive",
            });
          } else {
            setIsValidToken(true);
            toast({
              title: "Reset Link Verified",
              description: "You can now set your new password.",
            });
          }
        } else {
          setIsValidToken(false);
        }
      } catch (error) {
        console.error('Recovery initialization error:', error);
        setIsValidToken(false);
        toast({
          title: "Error",
          description: "Failed to process reset link. Please try again.",
          variant: "destructive",
        });
      }
    };

    initializeRecovery();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords don't match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Use Supabase directly to update password during recovery
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setPasswordUpdated(true);
        toast({
          title: "Success",
          description: "Password updated successfully! You can now sign in with your new password.",
        });
        
        // Sign out to clear the recovery session
        await supabase.auth.signOut();
        
        // Redirect to home page after 3 seconds
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (isValidToken === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (isValidToken === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-red-500 rounded-full flex items-center justify-center mb-4">
                <XCircle className="h-6 w-6 text-white" />
              </div>
              <CardTitle>Reset Link Expired</CardTitle>
              <CardDescription>
                This password reset link has expired or is invalid. Please request a new one.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Password reset links expire after 1 hour for security. 
                Go to the sign-in page and click "Forgot your password?" to get a new link.
              </p>
              <div className="space-y-2">
                <Button onClick={() => navigate('/profile')} className="w-full">
                  Go to Sign In Page
                </Button>
                <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                  Go to Home Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (passwordUpdated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <CardTitle>Password Updated</CardTitle>
              <CardDescription>
                Your password has been successfully updated. You'll be redirected to the home page shortly.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => navigate('/')} className="w-full">
                Go to Home Page Now
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Set New Password</CardTitle>
            <CardDescription className="text-center">
              Enter your new password below
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}