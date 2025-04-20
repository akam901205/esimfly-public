export const colors = (() => {
  const base = {
    stone: {
      50: '#ffffff',
      100: '#fafafa',  
      200: '#f3f4f6',  
      300: '#e5e7eb',  
      400: '#9ca3af',  
      500: '#6b7280',  
      600: '#4b5563',  
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    slate: {
      // Modern indigo-violet gradient
      100: '#f5f3ff',  // Softest violet
      200: '#ede9fe',  // Soft violet
      300: '#ddd6fe',  // Light violet
      400: '#818cf8',  // Bright indigo
      500: '#6366f1',  // Vibrant indigo
      600: '#4f46e5',  // Rich indigo
      700: '#4338ca',  // Deep indigo
      800: '#3730a3',  // Dark indigo
      900: '#312e81',  // Deepest indigo
    },
    primary: {
      light: '#818cf8',    // Bright indigo
      DEFAULT: '#4f46e5',  // Rich indigo
      dark: '#3730a3',     // Dark indigo
    }
  };
  
  return {
    ...base,
    accent: {
      DEFAULT: base.slate[500]  // Vibrant indigo
    },
    background: {
      primary: '#ffffff',
      secondary: '#fafafa',
      tertiary: '#f3f4f6',
      light: '#e5e7eb',
      headerIcon: base.slate[100],     
      redeemButton: base.slate[100],   
    },
    text: {
      primary: '#1f2937',
      secondary: '#4b5563',
      tertiary: '#6b7280',
      iconHeader: base.slate[600],     
      redeemText: base.slate[700],     
    },
    border: {
      light: '#e5e7eb',
      default: '#d1d5db',
      dark: '#9ca3af',
      header: base.slate[200],         
      redeemButton: base.slate[300],   
    },
    icon: {                            
      header: base.slate[600],
      inactive: base.slate[400],
      active: base.slate[800],
    }
  };
})();

export type Colors = typeof colors;