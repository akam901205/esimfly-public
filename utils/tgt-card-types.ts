/**
 * TGT Card Type Utilities for Mobile App
 *
 * Card types are embedded in the productCode string
 * Format: A-001-ES-AU-{CARD_TYPE}-1D/60D-5GB
 */

/**
 * Card types that require data depletion before renewal
 */
const DEPLETION_REQUIRED_CARD_TYPES = ['T1', 'eC1', 'eO1', 'Asia-eP1', 'eP1', 'eP2'];

/**
 * Card type that supports refueling/add-on packages (C4)
 */
const REFUELING_SUPPORTED_CARD_TYPE = 'C4';

/**
 * Extract card type from TGT product code
 *
 * @param productCode - TGT product code
 * @returns Card type string or null
 */
export function extractCardType(productCode: string): string | null {
  if (!productCode) return null;

  const parts = productCode.split('-');
  const esIndex = parts.findIndex(part => part === 'ES');

  if (esIndex === -1 || esIndex + 2 >= parts.length) {
    return null;
  }

  const cardTypeSegment = parts[esIndex + 2];
  const match = cardTypeSegment.match(/^([A-Za-z]+\d*)/);

  return match ? match[1] : null;
}

/**
 * Check if card type requires data depletion before renewal
 */
export function requiresDepletionForRenewal(productCode: string): boolean {
  const cardType = extractCardType(productCode);
  if (!cardType) return false;
  return DEPLETION_REQUIRED_CARD_TYPES.includes(cardType);
}

/**
 * Check if eSIM can be topped up (mobile app version)
 */
export function canTopupMobile(
  productCode: string,
  orderStatus: string,
  isUnlimited: boolean,
  provider: string
): {
  canTopup: boolean;
  reason?: string;
  cardType?: string;
} {
  // Check if unlimited - unlimited packages cannot be topped up
  if (isUnlimited) {
    return {
      canTopup: false,
      reason: 'This eSIM has unlimited data and cannot be topped up. Unlimited packages provide continuous data access for the duration of the plan.'
    };
  }

  // Only check card types for TGT provider
  if (provider !== 'tgt') {
    return { canTopup: true };
  }

  const cardType = extractCardType(productCode);

  if (!cardType) {
    return { canTopup: true };
  }

  // Check if card requires depletion first
  if (requiresDepletionForRenewal(productCode)) {
    const upperStatus = orderStatus.toUpperCase();

    if (upperStatus !== 'USED' && upperStatus !== 'EXPIRED' && upperStatus !== 'DEPLETED') {
      return {
        canTopup: false,
        reason: `This ${cardType} card type requires all data to be used or the plan to expire before renewal. Current status: ${orderStatus}`,
        cardType
      };
    }
  }

  // Check if card is not yet activated
  const upperStatus = orderStatus.toUpperCase();
  if (upperStatus === 'NOTACTIVE' || upperStatus === 'NOT_ACTIVE' || upperStatus === 'NEW') {
    return {
      canTopup: false,
      reason: 'This eSIM must be activated before it can be topped up',
      cardType
    };
  }

  return {
    canTopup: true,
    cardType
  };
}
