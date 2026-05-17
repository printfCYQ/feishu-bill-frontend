import Decimal from 'decimal.js';

export function add(a: number, b: number): number {
  return new Decimal(a).plus(b).toNumber();
}

export function subtract(a: number, b: number): number {
  return new Decimal(a).minus(b).toNumber();
}

export function multiply(a: number, b: number): number {
  return new Decimal(a).times(b).toNumber();
}

export function divide(a: number, b: number): number {
  if (b === 0) return 0;
  return new Decimal(a).dividedBy(b).toNumber();
}

export function formatCurrency(amount: number): string {
  return new Decimal(amount).toFixed(2);
}

export function sum(numbers: number[]): number {
  return numbers.reduce((acc, num) => new Decimal(acc).plus(num).toNumber(), 0);
}