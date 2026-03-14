import { z } from 'zod';

// Jordanian mobile: 07x-xxxx-xxxx or +9627xxxxxxxx (10 digits starting with 07, or +9627)
const jordanianPhoneRegex = /^(\+9627|007|07)\d{8}$/;

export const addressSchema = z.object({
  label: z
    .string()
    .min(1, 'تسمية العنوان مطلوبة')
    .max(50, 'التسمية يجب ألا تتجاوز 50 حرفًا'),
  recipient_name: z
    .string()
    .min(2, 'اسم المستلم مطلوب')
    .max(80, 'الاسم يجب ألا يتجاوز 80 حرفًا'),
  phone: z
    .string()
    .min(1, 'رقم الجوال مطلوب')
    .regex(jordanianPhoneRegex, 'يرجى إدخال رقم جوال أردني صحيح (مثال: 0791234567)'),
  city: z.string().min(1, 'المدينة مطلوبة').max(80, 'المدينة يجب ألا تتجاوز 80 حرفًا'),
  district: z.string().max(80, 'الحي يجب ألا يتجاوز 80 حرفًا').optional().or(z.literal('')),
  street: z.string().max(150, 'الشارع يجب ألا يتجاوز 150 حرفًا').optional().or(z.literal('')),
  building_number: z
    .string()
    .max(20, 'رقم المبنى يجب ألا يتجاوز 20 حرفًا')
    .optional()
    .or(z.literal('')),
  floor_number: z
    .string()
    .max(10, 'رقم الدور يجب ألا يتجاوز 10 أحرف')
    .optional()
    .or(z.literal('')),
  apartment_number: z
    .string()
    .max(10, 'رقم الشقة يجب ألا يتجاوز 10 أحرف')
    .optional()
    .or(z.literal('')),
  notes: z.string().max(200, 'الملاحظات يجب ألا تتجاوز 200 حرف').optional().or(z.literal('')),
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
