"use server";

import ms from "ms";
import * as YAML from "yaml";
import { ulid } from "ulid";
import { LocalDB } from "../integration/local.db";
import { Collection } from "../integration/db";
import { Job, JobDocument, JobSchema, Status } from "../models/job.schema";

const reject = (err: Error) => {
  throw err;
};

const localDB = new LocalDB();

const keyByWorkflowIdAndJobId = (workflowId: string, jobId: string) =>
  Collection.collection("job").collection(`workflow`).collection(workflowId)
    .collection(`job`).key(jobId);

const keyIndexByWorkflowId = (workflowId: string) =>
  Collection.collection("job").collection(`workflow`).collection(workflowId)
    .key(`index`);

const getIndexDocument = async (workflowId: string) => {
  const keyIndex = keyIndexByWorkflowId(workflowId);
  return await localDB.getItem(keyIndex) ?? new YAML.Document({ jobs: [] });
};

const setIndexDocument = async (
  workflowId: string,
  indexDocument: YAML.Document,
) => {
  const keyIndex = keyIndexByWorkflowId(workflowId);
  return await localDB.setItem(keyIndex, indexDocument);
};

const getJobDocument = async (workflowId: string, jobId: string) => {
  const key = keyByWorkflowIdAndJobId(workflowId, jobId);
  const doc = await localDB.getItem(key);
  return doc ? new JobDocument(doc) : null;
};

const setJobDocument = (
  workflowId: string,
  jobId: string,
  document: JobDocument,
) => {
  const key = keyByWorkflowIdAndJobId(workflowId, jobId);
  return localDB.setItem(key, document.toDocument());
};

const createJobDocument = async (
  workflowId: string,
  jobId: string,
  document: JobDocument,
) => {
  const indexDocument = await getIndexDocument(workflowId);
  indexDocument.addIn([`jobs`], jobId);
  await setJobDocument(workflowId, jobId, document);
  await setIndexDocument(workflowId, indexDocument);
};

const listJobDocuments = async (workflowId: string) => {
  const indexDocument = await getIndexDocument(workflowId);

  const jobs = indexDocument.getIn(["jobs"], true);

  if (!jobs) return [];

  const d: JobDocument[] = [];
  if (YAML.isSeq(jobs)) {
    for (const item of jobs.items) {
      if (YAML.isScalar(item) && typeof item.value === "string") {
        const doc = await getJobDocument(workflowId, item.value);
        if (doc) {
          d.push(doc);
        }
      }
    }
  }

  return d;
};

export const listJobs = async (workflowId: string) => {
  let res: Job[] = [];

  for (const document of await listJobDocuments(workflowId)) {
    res.push(document.toJS());
  }

  return res;
};

export const consumeJob = async (workflowId: string) => {
  for (const jobDocument of await listJobDocuments(workflowId)) {
    const jobId = jobDocument.id;
    const status = jobDocument.status;
    const ack = jobDocument.ack;
    const ackDate = ack ? new Date(ack) : null;
    const isPending = status === Status.pending;
    const timeAgo = ackDate ? Date.now() - ackDate.getTime() : null;
    const isCollected = timeAgo ? timeAgo <= ms("2m") : false;

    if (isPending && !isCollected) {
      const newAck = new Date().toISOString();
      jobDocument.ack = newAck;
      await setJobDocument(workflowId, jobId, jobDocument);
      return JobSchema.parse(jobDocument.toJS());
    }
  }

  return null;
};

export const reactiveJob = async (workflowId: string, jobId: string) => {
  const jobDocument = await getJobDocument(workflowId, jobId);

  if (jobDocument) {
    jobDocument.ack = new Date().toISOString();
    await setJobDocument(workflowId, jobId, jobDocument);
    return jobDocument.toJS();
  }

  return null;
};

export const updateStatusJob = async (
  workflowId: string,
  jobId: string,
  status: Status,
) => {
  const jobDocument = await getJobDocument(workflowId, jobId);

  if (jobDocument) {
    jobDocument.ack = new Date().toISOString();
    jobDocument.status = status;
    await setJobDocument(workflowId, jobId, jobDocument);
    return jobDocument.toJS();
  }

  return null;
};

export const createJob = async (workflowId: string) => {
  const jobId = ulid();
  const job = new JobDocument(new YAML.Document());

  job.id = jobId;
  job.status = Status.pending;
  job.workflowId = workflowId;
  job.createdAt = new Date().toISOString();

  await createJobDocument(workflowId, jobId, job);
};
