// ESim status and color constants

export const ESIM_STATUS = {
  NEW: 'New',
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  EXPIRING: 'Expiring',
  RELEASED: 'RELEASED',
  NOT_ACTIVE: 'NOT_ACTIVE',
  IN_USE: 'In_use',
  ONBOARD: 'onboard',
  GOT_RESOURCE: 'GOT_RESOURCE'
} as const;

export const getStatusColor = (status: string): string => {
  const upperStatus = status.toUpperCase();
  
  switch (upperStatus) {
    case 'NEW':
    case 'NOT_ACTIVE':
    case 'ONBOARD':
    case 'GOT_RESOURCE':
      return '#2196F3'; // Blue
    case 'ACTIVE':
    case 'IN_USE':
      return '#4CAF50'; // Green
    case 'EXPIRING':
      return '#FF9800'; // Orange
    case 'EXPIRED':
      return '#F44336'; // Red
    case 'RELEASED':
      return '#9E9E9E'; // Gray
    default:
      return '#757575'; // Default gray
  }
};

export const getStatusText = (status: string): string => {
  const upperStatus = status.toUpperCase();
  
  switch (upperStatus) {
    case 'NEW':
    case 'NOT_ACTIVE':
    case 'ONBOARD':
    case 'GOT_RESOURCE':
      return 'New';
    case 'ACTIVE':
    case 'IN_USE':
      return 'Active';
    case 'EXPIRING':
      return 'Expiring';
    case 'EXPIRED':
      return 'Expired';
    case 'RELEASED':
      return 'Released';
    default:
      return status;
  }
};