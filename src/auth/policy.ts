import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Mindestens 3 Zeichen")
  .max(64, "Höchstens 64 Zeichen")
  .regex(
    /^[a-z0-9._-]+$/,
    "Nur Buchstaben, Zahlen, Punkt, Unterstrich und Bindestrich",
  );

export const strongPasswordSchema = z
  .string()
  .min(12, "Mindestens 12 Zeichen")
  .max(128, "Höchstens 128 Zeichen")
  .regex(/[A-Za-zÄÖÜäöüß]/, "Mindestens ein Buchstabe")
  .regex(/[0-9]/, "Mindestens eine Zahl");
