import { z } from "zod";

const password = z.string().min(8, "Password must be at least 8 characters");

export const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  email: z.email("Invalid email address"),
  password,
});

export const registerFormSchema = z
  .object({
    email: z.email("Invalid email address"),
    password,
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password,
});

export const resetPasswordFormSchema = z
  .object({
    password,
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const profileId = z.number({
  error: "Profile must be a number",
}).positive({
  error: "Number must be a positive value",
});

export const profileSchema = z
  .object({
    name: z.string().min(
      2,
      "Profile name must be etleast 2 characters",
    ).max(
      12,
      "Profile name cannot be more then 12 characters",
    ),
  });
