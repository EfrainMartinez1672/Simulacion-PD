import { z } from 'zod';
import { UserSummarySchema } from '../../users/dto/user.dto';

/** Esquema de validación y contrato de entrada para crear una solicitud. */
export const CreateRequestSchema = z.object({
  clientId: z.number().int().positive(),
  description: z.string().min(1).max(1040),
  advisor: z.string().min(1).max(240),
  status: z.string().default('pending'),
});

/** Contrato de respuesta de la solicitud con el cliente relacionado. */
export const ResponseRequestSchema = z.object({
  id: z.number().int().positive(),
  client: UserSummarySchema,
  description: z.string(),
  advisor: z.string(),
  status: z.string(),
  createdAt: z.date(),
  updateAt: z.date(),
});

/** Tipo inferido del mismo esquema para compartirlo con servicios y controladores. */
export type CreateRequestDto = z.infer<typeof CreateRequestSchema>;
export type ResponseRequestDto = z.infer<typeof ResponseRequestSchema>;
