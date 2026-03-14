import { z } from 'zod';

// Jordanian mobile: 07x-xxxx-xxxx or +9627xxxxxxxx
const jordanianPhoneRegex = /^(\+9627|007|07)\d{8}$/;

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'البريد الإلكتروني مطلوب')
    .email('يرجى إدخال بريد إلكتروني صحيح'),
  password: z.string().min(1, 'كلمة المرور مطلوبة'),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, 'الاسم يجب أن يكون على الأقل حرفين')
      .max(80, 'الاسم يجب ألا يتجاوز 80 حرفًا'),
    phone: z
      .string()
      .min(1, 'رقم الجوال مطلوب')
      .regex(jordanianPhoneRegex, 'يرجى إدخال رقم جوال أردني صحيح (مثال: 0791234567)'),
    email: z
      .string()
      .min(1, 'البريد الإلكتروني مطلوب')
      .email('يرجى إدخال بريد إلكتروني صحيح'),
    password: z
      .string()
      .min(8, 'كلمة المرور يجب أن تكون على الأقل 8 أحرف')
      .regex(
        /^(?=.*[a-zA-Z])(?=.*\d)/,
        'كلمة المرور يجب أن تحتوي على حرف ورقم على الأقل',
      ),
    confirmPassword: z.string().min(1, 'تأكيد كلمة المرور مطلوب'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'كلمات المرور غير متطابقة',
    path: ['confirmPassword'],
  });

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, 'البريد الإلكتروني مطلوب')
    .email('يرجى إدخال بريد إلكتروني صحيح'),
});

export const changePasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, 'كلمة المرور الجديدة يجب أن تكون على الأقل 8 أحرف')
      .regex(/^(?=.*[a-zA-Z])(?=.*\d)/, 'كلمة المرور يجب أن تحتوي على حرف ورقم على الأقل'),
    confirmPassword: z.string().min(1, 'تأكيد كلمة المرور مطلوب'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'كلمات المرور غير متطابقة',
    path: ['confirmPassword'],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
