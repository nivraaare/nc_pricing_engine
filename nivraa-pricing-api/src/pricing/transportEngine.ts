import Decimal from "decimal.js";
import { D } from "../utils/money";

export interface TransportResult {
  cabFare: Decimal;
  coordinationFee: Decimal;
  total: Decimal;
}

export const calculateTransport = (
  transportRequired: boolean,
  estimatedCabFare: number | undefined,
  transportCoordinationFee: string
): TransportResult => {
  if (!transportRequired) {
    return { cabFare: D(0), coordinationFee: D(0), total: D(0) };
  }

  const cabFare = D(estimatedCabFare ?? 0);
  const coordinationFee = D(transportCoordinationFee);
  return {
    cabFare,
    coordinationFee,
    total: cabFare.plus(coordinationFee)
  };
};
