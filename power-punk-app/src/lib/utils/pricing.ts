import { CostCurve } from '@/types';

export function calculateUnitPrice(
  basePrice: number,
  currentUnits: number,
  costCurve?: CostCurve
): number {
  if (!costCurve) {
    return basePrice;
  }

  const unitsAboveThreshold = Math.max(0, currentUnits - costCurve.discountThreshold);
  const discountMultiplier = 1 - (costCurve.discountPercentage / 100);
  
  // Apply discount based on units above threshold
  if (unitsAboveThreshold > 0) {
    const discountFactor = Math.pow(discountMultiplier, unitsAboveThreshold / 10);
    return basePrice * discountFactor;
  }

  return basePrice;
}

export function calculateTotalCost(
  units: number,
  basePrice: number,
  currentUnits: number,
  costCurve?: CostCurve
): number {
  let totalCost = 0;
  
  for (let i = 0; i < units; i++) {
    const priceForUnit = calculateUnitPrice(
      basePrice,
      currentUnits + i,
      costCurve
    );
    totalCost += priceForUnit;
  }

  return totalCost;
}

export function calculateSavings(
  units: number,
  basePrice: number,
  currentUnits: number,
  costCurve?: CostCurve
): number {
  const withDiscount = calculateTotalCost(units, basePrice, currentUnits, costCurve);
  const withoutDiscount = units * basePrice;
  
  return withoutDiscount - withDiscount;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatUnits(units: number): string {
  return new Intl.NumberFormat('en-US').format(units);
}