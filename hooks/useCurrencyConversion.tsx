/**
 * Currency Conversion Hook for Mobile App
 * Handles USD to IQD conversion with live exchange rates
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { newApi } from '../api/api';

const CACHE_KEY = 'esimfly_mobile_currency_data';
const CACHE_EXPIRY = 10 * 60 * 1000; // 10 minutes

export function useCurrencyConversion() {
  const [userCurrency, setUserCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState(1320); // Default IQD exchange rate
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load cached currency data
  const loadFromCache = async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached);
        const cacheAge = Date.now() - data.timestamp;
        
        // Use cache if less than 10 minutes old
        if (cacheAge < CACHE_EXPIRY) {
          return {
            currency: data.currency,
            exchangeRate: data.exchangeRate
          };
        }
      }
    } catch (error) {
      console.log('Currency cache read error:', error);
    }
    return null;
  };

  // Save currency data to cache
  const saveToCache = async (currency, rate) => {
    try {
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
        currency,
        exchangeRate: rate,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.log('Currency cache write error:', error);
    }
  };

  // Fetch user's currency preference and exchange rate
  const fetchCurrencyData = async () => {
    try {
      // Try cache first for instant display
      const cachedData = await loadFromCache();
      if (cachedData) {
        setUserCurrency(cachedData.currency);
        setExchangeRate(cachedData.exchangeRate);
        setLoading(false);
      }

      // Fetch fresh data from the user endpoint which now includes currency
      const userResponse = await newApi.get('/user');
      
      if (userResponse.data) {
        const currency = userResponse.data.currency || 'USD';
        setUserCurrency(currency);
        
        // Only fetch exchange rate if user uses IQD
        if (currency === 'IQD') {
          try {
            // Fetch live exchange rate from main API
            const rateResponse = await newApi.get('/currency/live-rate');
            if (rateResponse.data?.success) {
              const rate = rateResponse.data.exchangeRate || 1320;
              setExchangeRate(rate);
              await saveToCache(currency, rate);
            }
          } catch (rateError) {
            console.log('Exchange rate fetch failed, using cached/default rate');
          }
        } else {
          setExchangeRate(1); // USD to USD = 1
          await saveToCache(currency, 1);
        }
        
        setLoading(false);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching currency data:', err);
      setError('Failed to load currency data');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrencyData();
  }, []);

  // Convert USD price to user's currency
  const convertPrice = useCallback((usdAmount) => {
    // Ensure usdAmount is a valid number
    const amount = typeof usdAmount === 'number' ? usdAmount : 
                   (usdAmount && !isNaN(parseFloat(usdAmount))) ? parseFloat(usdAmount) : 0;
    
    if (userCurrency === 'IQD') {
      return Math.round(amount * exchangeRate);
    }
    return amount;
  }, [userCurrency, exchangeRate]);

  // Format price for display (converts USD to user currency and formats)
  const formatPrice = useCallback((usdAmount) => {
    if (loading) {
      return 'Loading...';
    }
    
    // Ensure usdAmount is a valid number
    const amount = typeof usdAmount === 'number' ? usdAmount : 
                   (usdAmount && !isNaN(parseFloat(usdAmount))) ? parseFloat(usdAmount) : 0;
    
    if (userCurrency === 'IQD') {
      const iqdAmount = Math.round(amount * exchangeRate);
      return `${iqdAmount.toLocaleString('en-US')} IQD`;
    } else {
      return `$${amount.toFixed(2)}`;
    }
  }, [userCurrency, exchangeRate, loading]);

  // Format actual balance (already in correct currency)
  const formatActualBalance = useCallback((amount, currency) => {
    // Ensure amount is a valid number
    const validAmount = typeof amount === 'number' ? amount :
                        (amount && !isNaN(parseFloat(amount))) ? parseFloat(amount) : 0;

    if (currency === 'IQD') {
      return `${Math.round(validAmount).toLocaleString('en-US')} IQD`;
    } else {
      return `$${validAmount.toFixed(2)}`;
    }
  }, []);

  // Format price that's already in user's currency (no conversion needed)
  const formatPriceAlreadyConverted = useCallback((amount, currency) => {
    // Ensure amount is a valid number
    const validAmount = typeof amount === 'number' ? amount :
                        (amount && !isNaN(parseFloat(amount))) ? parseFloat(amount) : 0;

    if (currency === 'IQD') {
      return `${Math.round(validAmount).toLocaleString('en-US')} IQD`;
    } else {
      return `$${validAmount.toFixed(2)}`;
    }
  }, []);

  // Get currency symbol
  const getCurrencySymbol = useCallback(() => {
    return userCurrency === 'IQD' ? 'IQD' : '$';
  }, [userCurrency]);

  // Refresh currency data
  const refreshCurrency = useCallback(async () => {
    setLoading(true);
    await fetchCurrencyData();
  }, []);

  return {
    userCurrency,
    exchangeRate,
    loading,
    error,
    convertPrice,      // Convert USD amount to user currency (number)
    formatPrice,       // Convert and format USD amount for display (string)
    formatActualBalance, // Format actual balance amount (string)
    formatPriceAlreadyConverted, // Format price already in user's currency (no conversion)
    getCurrencySymbol,
    refreshCurrency
  };
}