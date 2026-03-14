import { z } from 'zod';

export const categorySchema = z.object({
  name_ar: z
    .string()
    .min(2, 'الاسم بالعربية مطلوب (حرفان على الأقل)')
    .max(80, 'الاسم يجب ألا يتجاوز 80 حرفًا'),
  name_en: z
    .string()
    .max(80, 'الاسم يجب ألا يتجاوز 80 حرفًا')
    .optional()
    .or(z.literal('')),
  description_ar: z.string().max(500, 'الوصف يجب ألا يتجاوز 500 حرف').optional().or(z.literal('')),
  description_en: z.string().max(500, 'الوصف يجب ألا يتجاوز 500 حرف').optional().or(z.literal('')),
  sort_order: z
    .string()
    .optional()
    .refine((val) => !val || val === '' || !isNaN(parseInt(val)), {
      message: 'ترتيب العرض يجب أن يكون رقمًا صحيحًا',
    }),
  is_active: z.boolean().default(true),
});

export type CategoryFormValues = z.infer<typeof categorySchema>;
