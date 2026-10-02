import { z } from "zod";

const halfHourIncrement = (value: number) => Number.isInteger(value * 2);

export const quoteRequestSchema = z.object({
  service_code: z.string().trim().min(1),
  selected_hours: z.number().finite().min(1).max(24).refine(halfHourIncrement, {
    message: "selected_hours must use 0.5-hour increments"
  }),
  transport_required: z.boolean(),
  estimated_cab_fare: z.number().finite().nonnegative().optional(),
  nivraa_credit_discount_rupees: z.number().finite().nonnegative().default(0),
  price_override_rupees: z.number().finite().positive().optional(),
  override_reason: z.string().trim().min(3).max(500).optional()
}).strict().superRefine((value, ctx) => {
  if (value.transport_required && value.estimated_cab_fare === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["estimated_cab_fare"],
      message: "estimated_cab_fare is required when transport_required is true"
    });
  }
  if (value.price_override_rupees !== undefined && !value.override_reason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["override_reason"],
      message: "override_reason is required when price_override_rupees is supplied"
    });
  }
});

export type QuoteRequestBody = z.infer<typeof quoteRequestSchema>;
