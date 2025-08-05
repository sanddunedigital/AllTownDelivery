import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface AddressInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  id?: string;
}

interface ValidationResult {
  isValid: boolean;
  formattedAddress?: string;
  errorMessage?: string;
}

export function AddressInput({ 
  label, 
  value, 
  onChange, 
  placeholder, 
  required = false, 
  className,
  id 
}: AddressInputProps) {
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const validateAddress = async (address: string) => {
    if (!address.trim()) {
      setValidationStatus('idle');
      setValidationResult(null);
      return;
    }

    setValidationStatus('validating');
    
    try {
      const response = await fetch('/api/maps/validate-address', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      });

      const result = await response.json();
      
      if (result.isValid) {
        setValidationStatus('valid');
        setValidationResult(result);
        // Update with formatted address if available
        if (result.formattedAddress && result.formattedAddress !== address) {
          onChange(result.formattedAddress);
        }
      } else {
        setValidationStatus('invalid');
        setValidationResult(result);
      }
    } catch (error) {
      console.error('Address validation error:', error);
      setValidationStatus('invalid');
      setValidationResult({
        isValid: false,
        errorMessage: 'Unable to validate address'
      });
    }
  };

  const handleInputChange = (inputValue: string) => {
    onChange(inputValue);
    
    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    // Set new timer for validation
    const timer = setTimeout(() => {
      validateAddress(inputValue);
    }, 1000); // Validate after 1 second of no typing
    
    setDebounceTimer(timer);
  };

  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  const getStatusIcon = () => {
    switch (validationStatus) {
      case 'validating':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'valid':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'invalid':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = () => {
    switch (validationStatus) {
      case 'validating':
        return <Badge variant="secondary" className="text-xs">Validating...</Badge>;
      case 'valid':
        return <Badge variant="default" className="text-xs bg-green-100 text-green-800">Valid Address</Badge>;
      case 'invalid':
        return <Badge variant="destructive" className="text-xs">Invalid Address</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type="text"
          value={value}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          className={`pr-10 ${
            validationStatus === 'valid' ? 'border-green-300' :
            validationStatus === 'invalid' ? 'border-red-300' : ''
          }`}
        />
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {getStatusIcon()}
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div>
          {getStatusBadge()}
        </div>
        {validationResult?.errorMessage && validationStatus === 'invalid' && (
          <p className="text-xs text-red-600">{validationResult.errorMessage}</p>
        )}
      </div>
    </div>
  );
}