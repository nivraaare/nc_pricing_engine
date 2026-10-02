import { globalPricingConfig } from "../config/globalPricingConfig";
import { serviceByCode, serviceMaster } from "../config/serviceMaster";
import { PricingConfigRepository } from "./PricingConfigRepository";
import { GlobalPricingConfig, ServiceConfig } from "../pricing/pricingTypes";

export class InMemoryPricingConfigRepository implements PricingConfigRepository {
  getGlobalConfig(): GlobalPricingConfig {
    return globalPricingConfig;
  }

  getService(serviceCode: string): ServiceConfig | undefined {
    return serviceByCode.get(serviceCode);
  }

  listActiveServices(): ReadonlyArray<ServiceConfig> {
    return serviceMaster.filter((service) => service.active);
  }
}
