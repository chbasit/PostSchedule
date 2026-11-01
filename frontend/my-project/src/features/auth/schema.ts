import { z } from "zod";

// Error messages are translation keys under "validation" so forms stay translatable.
// The backend validates the same shapes (CLAUDE.md rule 4).

const email = z.string().trim().min(1, "required").max(254, "tooLong").pipe(z.email("email"));

export const PASSWORD_MIN = 10;

export const passwordRules = {
  length: (v: string) => v.length >= PASSWORD_MIN,
  letter: (v: string) => /\p{L}/u.test(v),
  number: (v: string) => /\d/.test(v),
};

const password = z
  .string()
  .max(200, "tooLong")
  .refine(passwordRules.length, "passwordLength")
  .refine((v) => passwordRules.letter(v) && passwordRules.number(v), "passwordMix");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "required"),
});

export const signUpSchema = z.object({
  displayName: z.string().trim().min(1, "required").max(80, "tooLong"),
  email,
  password,
});

export const forgotSchema = z.object({ email });

// The emailed code: 6 to 10 digits; spaces and dashes from pasting are dropped.
const code = z
  .string()
  .transform((v) => v.replace(/[\s-]/g, ""))
  .pipe(z.string().min(1, "required").regex(/^\d{6,10}$/, "code"));

export const verifySchema = z.object({ code });

export const resetSchema = z.object({ code, password });

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
export type VerifyInput = z.input<typeof verifySchema>;
export type VerifyValues = z.output<typeof verifySchema>;
export type ResetInput = z.input<typeof resetSchema>;
export type ResetValues = z.output<typeof resetSchema>;
