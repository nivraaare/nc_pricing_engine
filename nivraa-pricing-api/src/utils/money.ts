import Decimal from "decimal.js";

Decimal.set({
  precision: 28,
  rounding: Decimal.ROUND_HALF_UP,
  toExpNeg: -20,
  toExpPos: 40
});

export const D = (value: Decimal.Value): Decimal => new Decimal(value);

export const moneyNumber = (value: Decimal): number => Number(value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toFixed(2));
export const decimalNumber = (value: Decimal, places = 4): number => Number(value.toDecimalPlaces(places, Decimal.ROUND_HALF_UP).toString());
export const wholeFloor = (value: Decimal): number => value.floor().toNumber();
