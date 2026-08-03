export const CURRENCIES = [
  'USD', 'GBP', 'CAD', 'AUD', 'NZD', 'EUR', 'TRY', 'PLN', 'CZK', 'CHF', 
  'DKK', 'HUF', 'SEK', 'NOK', 'CNY', 'JPY', 'THB', 'VND', 'KRW', 'INR', 
  'MXN', 'BRL', 'ARS'
].sort();

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$', GBP: '£', CAD: '$', AUD: '$', NZD: '$', EUR: '€', 
  TRY: '₺', PLN: 'zł', CZK: 'Kč', CHF: 'CHF', DKK: 'kr', HUF: 'Ft', 
  SEK: 'kr', NOK: 'kr', CNY: '¥', JPY: '¥', THB: '฿', VND: '₫', 
  KRW: '₩', INR: '₹', MXN: '$', BRL: 'R$', ARS: '$'
};

export const getCurrencySymbol = (currencyCode: string): string => {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode;
};
