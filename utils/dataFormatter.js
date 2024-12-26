export const formatDataSize = (bytes: number, precision: number = 2): string => {
  const gigabytes = bytes / (1024 * 1024 * 1024);
  
  // If it's very close to a whole number (within 0.01), round it
  if (Math.abs(Math.round(gigabytes) - gigabytes) < 0.01) {
    return `${Math.round(gigabytes)} GB`;
  }
  
  // For values like 1.05, show one decimal place
  return `${gigabytes.toFixed(precision).replace(/\.?0+$/, '')} GB`;
}

// Function to parse formatted data size back to bytes
export const parseDataSize = (formatted: string): number => {
  const match = formatted.match(/^(\d+(?:\.\d+)?)\s*GB$/i);
  if (!match) return 0;
  
  const gigabytes = parseFloat(match[1]);
  return Math.round(gigabytes * 1024 * 1024 * 1024);
}

// Function to get consistent display format from either bytes or formatted string
export const getConsistentDataFormat = (data: number | string): string => {
  if (typeof data === 'number') {
    return formatDataSize(data);
  }
  
  // If it's already a formatted string, parse and reformat it
  const bytes = parseDataSize(data);
  return formatDataSize(bytes);
}