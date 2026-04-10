import z from "zod";

export const classifyNameSchema = z.object({
 name: z.string({
  error: "'name' is required as a query parameter."
 }).refine((val) => isNaN(Number(val)), {
  error: "'name' must not be a number"
 })
});