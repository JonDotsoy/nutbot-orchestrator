import { z } from "zod";

export const WorkflowSchema = z.object({
  id: z.string(),
  name: z.optional(z.string()),
  updatedAt: z.optional(z.string().datetime()),
});

export type Workflow = z.infer<typeof WorkflowSchema>;
