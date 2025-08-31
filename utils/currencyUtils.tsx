/**
 * Currency utilities for formatting and displaying different currencies
 */

export type SupportedCurrency = 'USD' | 'IQD';

export interface CurrencyInfo {
  symbol: string;
  name: string;
  code: string;
  decimalPlaces: number;
  symbolPosition: 'before' | 'after';
}

export const CURRENCY_CONFIG: Record<SupportedCurrency, CurrencyInfo> = {
  USD: {
    symbol: '$',
    name: 'US Dollar',
    code: 'USD',
    decimalPlaces: 2,
    symbolPosition: 'before'
  },
  IQD: {
    symbol: 'IQD',
    name: 'Iraqi Dinar',
    code: 'IQD',
    decimalPlaces: 0,
    symbolPosition: 'after'
  }
};

/**
 * Format currency amount with proper symbol and decimal places
 */
export const formatCurrency = (
  amount: number, 
  currency: SupportedCurrency = 'USD',
  showCode: boolean = false
): string => {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD;
  
  const formattedAmount = amount.toLocaleString('en-US', {
    minimumFractionDigits: config.decimalPlaces,
    maximumFractionDigits: config.decimalPlaces
  });

  if (config.symbolPosition === 'before') {
    const formatted = `${config.symbol}${formattedAmount}`;
    return showCode ? `${formatted} ${config.code}` : formatted;
  } else {
    const formatted = `${formattedAmount} ${config.symbol}`;
    return showCode ? `${formatted} (${config.code})` : formatted;
  }
};

/**
 * Get currency symbol for a given currency code
 */
export const getCurrencySymbol = (currency: SupportedCurrency = 'USD'): string => {
  return CURRENCY_CONFIG[currency]?.symbol || '$';
};

/**
 * Get currency name for a given currency code
 */
export const getCurrencyName = (currency: SupportedCurrency = 'USD'): string => {
  return CURRENCY_CONFIG[currency]?.name || 'US Dollar';
};

/**
 * Check if currency should show decimal places
 */
export const shouldShowDecimals = (currency: SupportedCurrency = 'USD'): boolean => {
  return CURRENCY_CONFIG[currency]?.decimalPlaces > 0;
};

/**
 * Format balance for display in UI
 */
export const formatBalance = (
  balance: number, 
  currency: SupportedCurrency = 'USD',
  compact: boolean = false
): string => {
  if (compact && balance >= 1000) {
    const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD;
    let formattedAmount: string;
    
    if (balance >= 1000000) {
      formattedAmount = `${(balance / 1000000).toFixed(1)}M`;
    } else if (balance >= 1000) {
      formattedAmount = `${(balance / 1000).toFixed(1)}K`;
    } else {
      formattedAmount = balance.toFixed(config.decimalPlaces);
    }
    
    return config.symbolPosition === 'before' 
      ? `${config.symbol}${formattedAmount}`
      : `${formattedAmount} ${config.symbol}`;
  }
  
  return formatCurrency(balance, currency);
};

/**
 * Parse currency string back to number
 */
export const parseCurrencyString = (currencyString: string): number => {
  // Remove all non-numeric characters except decimal point and minus sign
  const numericString = currencyString.replace(/[^\d.-]/g, '');
  return parseFloat(numericString) || 0;
};

/**
 * Convert currency display for different locales (future enhancement)
 */
export const formatCurrencyForLocale = (
  amount: number,
  currency: SupportedCurrency = 'USD',
  locale: string = 'en-US'
): string => {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD;
  
  // For Arabic locales, use Arabic numerals for IQD
  if (currency === 'IQD' && (locale === 'ar' || locale.startsWith('ar-'))) {
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    const formattedAmount = amount.toFixed(config.decimalPlaces);
    const arabicAmount = formattedAmount.replace(/\d/g, (digit) => arabicNumerals[parseInt(digit)]);
    return `${arabicAmount} ${config.symbol}`;
  }
  
  return formatCurrency(amount, currency);
};