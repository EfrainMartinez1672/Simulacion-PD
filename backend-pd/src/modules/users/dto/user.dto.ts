import { z } from 'zod';

export const UserSummarySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  role: z.string(),
});