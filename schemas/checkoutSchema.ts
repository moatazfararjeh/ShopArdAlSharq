import { z } from 'zod';

// Jordanian mobile: exactly 10 digits starting with 07
const jordanianPhoneRegex = /^07\d{8}$/;

export const addressSchema = z.object({
  label: z
    .string({ error: 'تسمية العنوان مطلوبة' })
    .min(1, 'تسمية العنوان مطلوبة')
    .max(50, 'التسمية يجب ألا تتجاوز 50 حرفًا'),
  recipient_name: z
    .string({ error: 'اسم المستلم مطلوب' })
    .min(2, 'اسم المستلم مطلوب')
    .max(80, 'الاسم يجب ألا يتجاوز 80 حرفًا'),
  phone: z
    .string({ error: 'رقم الجوال مطلوب' })
    .min(1, 'رقم الجوال مطلوب')
    .regex(jordanianPhoneRegex, 'يرجى إدخال رقم جوال أردني صحيح (مثال: 0791234567)'),
  city: z.enum(['عمان', 'الزرقاء'], { error: 'يرجى اختيار المدينة' }),
  district: z
    .string({ error: 'الحي مطلوب' })
    .min(1, 'الحي مطلوب')
    .max(80, 'الحي يجب ألا يتجاوز 80 حرفًا'),
  street: z
    .string({ error: 'الشارع مطلوب' })
    .min(1, 'الشارع مطلوب')
    .max(150, 'الشارع يجب ألا يتجاوز 150 حرفًا'),
  building_number: z.string().max(20).optional(),
  floor_number: z.string().max(10).optional(),
  apartment_number: z.string().max(10).optional(),
  notes: z.string().max(200, 'الملاحظات يجب ألا تتجاوز 200 حرف').optional(),
  is_default: z.boolean(),
});

export const checkoutSchema = z.object({
  address_id: z.string().uuid('يرجى اختيار عنوان التوصيل').or(z.literal('new')),
  new_address: addressSchema.optional(),
  payment_method: z.enum(['cash_on_delivery', 'online'], {
    error: 'يرجى اختيار طريقة الدفع',
  }),
  notes: z.string().max(200, 'الملاحظات يجب ألا تتجاوز 200 حرف').optional().or(z.literal('')),
}).refine(
  (data) => {
    if (data.address_id === 'new') return !!data.new_address;
    return true;
  },
  {
    message: 'يرجى إدخال بيانات العنوان الجديد',
    path: ['new_address'],
  },
);

export type AddressFormValues = z.infer<typeof addressSchema>;
export type CheckoutFormValues = z.infer<typeof checkoutSchema>;
