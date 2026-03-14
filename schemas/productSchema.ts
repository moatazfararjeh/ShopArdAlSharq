import { z } from 'zod';

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
  description_ar: z.string().max(2000, 'الوصف يجب ألا يتجاوز 2000 حرف').optional().or(z.literal('')),
  description_en: z.string().max(2000, 'الوصف يجب ألا يتجاوز 2000 حرف').optional().or(z.literal('')),
  price: z
    .string()
    .refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
      message: 'السعر يجب أن يكون رقمًا موجبًا',
    }),
  discount_price: z
    .string()
    .optional()
    .refine((val) => !val || val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0), {
      message: 'سعر الخصم يجب أن يكون رقمًا غير سالب',
    }),
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
  unit_type: z.enum(['piece', 'kg', 'carton']).optional(),
  price_per_piece: z
    .string()
    .optional()
    .refine((val) => !val || val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), {
      message: 'سعر الحبة يجب أن يكون رقمًا موجبًا',
    }),
  price_per_carton: z
    .string()
    .optional()
    .refine((val) => !val || val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), {
      message: 'سعر الكرتون يجب أن يكون رقمًا موجبًا',
    }),
  price_per_kg: z
    .string()
    .optional()
    .refine((val) => !val || val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) > 0), {
      message: 'سعر الكيلو يجب أن يكون رقمًا موجبًا',
    }),
  pieces_per_carton: z
    .string()
    .optional()
    .refine((val) => !val || val === '' || (!isNaN(parseInt(val)) && parseInt(val) > 0), {
      message: 'عدد الحبات في الكرتون يجب أن يكون رقمًا موجبًا',
    }),
}).refine(
  (data) => {
    if (!data.discount_price || data.discount_price === '') return true;
    return parseFloat(data.discount_price) < parseFloat(data.price);
  },
  {
    message: 'سعر الخصم يجب أن يكون أقل من السعر الأصلي',
    path: ['discount_price'],
  },
);

export type ProductFormValues = z.infer<typeof productSchema>;
