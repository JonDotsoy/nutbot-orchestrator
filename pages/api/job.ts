import { NextApiHandler, NextApiRequest, NextApiResponse } from "next";
import z from "zod";
import {
  consumeJob,
  reactiveJob,
  updateStatusJob,
} from "../../components/data/jobs";
import { zodToJsonSchema } from "zod-to-json-schema";
import { notFound } from "next/navigation";
import { isNotFoundError } from "next/dist/client/components/not-found";
import { Status } from "../../components/models/job.schema";

const CallSchema = z.union([
  z.object({
    consumeJob: z.object({
      workflowId: z.string(),
    }),
  }),
  z.object({
    reactiveJob: z.object({
      workflowId: z.string(),
      jobId: z.string(),
    }),
  }),
  z.object({
    updateStatusJob: z.object({
      workflowId: z.string(),
      jobId: z.string(),
      status: z.nativeEnum(Status),
    }),
  }),
]);

const jsonSchema = zodToJsonSchema(CallSchema, "CallSchema");

type HandlerCall = Record<string, NextApiHandler>;

const handlerList: HandlerCall = {
  async get(_req, res) {
    res.json(jsonSchema);
  },
  async post(req, res) {
    const payload = CallSchema.parse(req.body);

    if ("consumeJob" in payload) {
      return res.json(
        await consumeJob(
          payload.consumeJob.workflowId,
        ),
      );
    }

    if ("reactiveJob" in payload) {
      return res.json(
        await reactiveJob(
          payload.reactiveJob.workflowId,
          payload.reactiveJob.jobId,
        ),
      );
    }

    if ("updateStatusJob" in payload) {
      return res.json(
        await updateStatusJob(
          payload.updateStatusJob.workflowId,
          payload.updateStatusJob.jobId,
          payload.updateStatusJob.status,
        ),
      );
    }

    throw new Error(`Invalid call name`);
  },
};

export default async (req: NextApiRequest, res: NextApiResponse) => {
  const handler: NextApiHandler | null = Reflect.get(
    handlerList,
    req.method?.toLowerCase() ?? Symbol("none"),
  ) ?? null;

  if (!handler) return notFound();

  return handler(req, res);
};
