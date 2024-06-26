import { z } from 'zod';

export const idSchema = z.string().length(12, 'id must be 12 characters long');
