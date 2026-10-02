import { GlobalPricingConfig, ServiceConfig } from "../pricing/pricingTypes";

export interface PricingConfigRepository {
  getGlobalConfig(): GlobalPricingConfig;
  getService(serviceCode: string): ServiceConfig | undefined;
  listActiveServices(): ReadonlyArray<ServiceConfig>;
}
