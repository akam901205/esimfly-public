/**
 * Provider detection utilities for eSIM packages
 */

export type ProviderType = 'airalo' | 'esimgo' | 'esimaccess';

/**
 * Detect provider based on package code and ID patterns
 */
export function detectProvider(packageCode: string, packageId: string): ProviderType {
  // Check packageCode first (most reliable)
  if (packageCode) {
    // Airalo packages always start with 'airalo_' in the database
    if (packageCode.startsWith('airalo_')) {
      return 'airalo';
    }
    
    // ESIMGo packages start with 'esim_'
    if (packageCode.startsWith('esim_')) {
      return 'esimgo';
    }
  }
  
  // Check package ID patterns as fallback
  if (packageId) {
    // Airalo topup packages have specific patterns
    if (packageId.includes('-topup') || 
        packageId.includes('-days-') ||
        packageId.includes('discoverplus') ||
        packageId.includes('discover+') ||
        packageId.match(/^[a-z]+-\d+days-\d+gb/i)) {
      return 'airalo';
    }
    
    // ESIMGo pattern
    if (packageId.startsWith('esim_')) {
      return 'esimgo';
    }
  }
  
  // Default to ESIMAccess
  return 'esimaccess';
}

/**
 * Determine if a package is a topup based on its ID
 */
export function isTopupPackage(packageId: string): boolean {
  return packageId && packageId.includes('-topup');
}