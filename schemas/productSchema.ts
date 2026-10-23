import { z } from 'zod';

// Prices, sales and minimum quantities live per selling unit and are edited
// with UnitPricingEditor (validateUnitDrafts), not in this form schema.
export const productSchema = z.object({
  name_ar: z
    .string()
    .min(2, 'الاسم بالعربية مطلوب (حرفان على الأقل)')
    .max(120, 'الاسم يجب ألا يتجاوز 120 حرفًا'),
  name_en: z
    .string()
    .max(120, 'الاسم يجب ألا يتجاوز 120 حرفًا')
    .optional()
    .or(z.literal('')),
  brand_id: z
    .string()
    .uuid('يرجى اختيار ماركة صحيحة')
    .optional()
    .or(z.literal('')),
  section_id: z
    .string()
    .uuid('يرجى اختيار قسم صحيح')
    .optional()
    .or(z.literal('')),
  erp_code: z
    .string()
    .max(50, 'كود ERP يجب ألا يتجاوز 50 حرفًا')
    .optional()
    .or(z.literal('')),
  description_ar: z.string().max(2000, 'الوصف يجب ألا يتجاوز 2000 حرف').optional().or(z.literal('')),
  description_en: z.string().max(2000, 'الوصف يجب ألا يتجاوز 2000 حرف').optional().or(z.literal('')),
  category_id: z.string().uuid('يرجى اختيار فئة صحيحة'),
  stock_quantity: z
    .string()
    .refine((val) => !isNaN(parseInt(val)) && parseInt(val) >= 0, {
      message: 'الكمية يجب أن تكون رقمًا صحيحًا غير سالب',
    }),
  is_available: z.boolean(),
  is_featured: z.boolean(),
  weight: z
    .string()
    .optional()
    .refine((val) => !val || val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), {
      message: 'الوزن يجب أن يكون رقمًا موجبًا',
    }),
  weight_unit: z.string().max(10).optional().or(z.literal('')),
});

export type ProductFormValues = z.infer<typeof productSchema>;
