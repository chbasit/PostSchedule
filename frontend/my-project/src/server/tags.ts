import "server-only";
import { z } from "zod";

export const tagBody = z.object({
  name: z.string().trim().min(1).max(40),
  color: z.enum(["blue", "violet", "green", "amber", "rose", "peach"]),
});
