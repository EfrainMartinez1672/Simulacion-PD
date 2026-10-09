import { z } from 'zod';

/** Valida la forma breve de usuario cuando se expone en contratos auxiliares. */
export const UserSummarySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  role: z.string(),
});
