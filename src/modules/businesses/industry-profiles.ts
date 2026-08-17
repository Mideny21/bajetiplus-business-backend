import { BusinessType } from '@prisma/client';

export interface IndustryProfile {
  id: string;
  name: string;
  recommendedBusinessType: BusinessType;
  recommendedFeatures: string[];
}

export const INDUSTRY_PROFILES: IndustryProfile[] = [
  [
    'clothing-fashion',
    'Clothing & Fashion',
    BusinessType.PRODUCT,
    ['products', 'inventory', 'variants', 'sales', 'purchases'],
  ],
  [
    'pharmacy-medicines',
    'Pharmacy & Medicines',
    BusinessType.PRODUCT,
    ['products', 'inventory', 'sales', 'purchases'],
  ],
  [
    'grocery-retail',
    'Grocery / Retail',
    BusinessType.PRODUCT,
    ['products', 'inventory', 'sales', 'purchases'],
  ],
  [
    'hardware-construction',
    'Hardware & Construction',
    BusinessType.PRODUCT,
    ['products', 'inventory', 'sales', 'purchases'],
  ],
  [
    'electronics',
    'Electronics',
    BusinessType.PRODUCT,
    ['products', 'inventory', 'variants', 'sales', 'purchases'],
  ],
  [
    'spare-parts-machinery',
    'Spare Parts & Machinery',
    BusinessType.PRODUCT,
    ['products', 'inventory', 'sales', 'purchases'],
  ],
  [
    'beauty-cosmetics',
    'Beauty & Cosmetics',
    BusinessType.PRODUCT,
    ['products', 'inventory', 'sales', 'purchases'],
  ],
  [
    'salon-barber-nails',
    'Salon / Barber / Nails',
    BusinessType.SERVICE,
    ['services', 'customers', 'sales', 'expenses'],
  ],
  [
    'repair-maintenance',
    'Repair & Maintenance',
    BusinessType.HYBRID,
    ['services', 'products', 'inventory', 'customers', 'sales'],
  ],
  [
    'professional-services',
    'Professional Services',
    BusinessType.SERVICE,
    ['services', 'customers', 'sales', 'expenses'],
  ],
  [
    'wholesale-distribution',
    'Wholesale / Distribution',
    BusinessType.PRODUCT,
    ['products', 'inventory', 'sales', 'purchases', 'suppliers'],
  ],
  [
    'jewellery',
    'Jewellery',
    BusinessType.PRODUCT,
    ['products', 'inventory', 'variants', 'sales', 'purchases'],
  ],
  [
    'other',
    'Other',
    BusinessType.HYBRID,
    ['products', 'services', 'sales', 'expenses'],
  ],
].map(([id, name, recommendedBusinessType, recommendedFeatures]) => ({
  id: id as string,
  name: name as string,
  recommendedBusinessType: recommendedBusinessType as BusinessType,
  recommendedFeatures: recommendedFeatures as string[],
}));

export function findIndustryProfile(id: string): IndustryProfile | undefined {
  return INDUSTRY_PROFILES.find((profile) => profile.id === id);
}
