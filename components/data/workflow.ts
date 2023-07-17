"use server";

import * as YAML from "yaml";
import { ulid } from "ulid";
import { LocalDB } from "../integration/local.db";
import { Collection } from "../integration/db";
import { Workflow, WorkflowSchema } from "../models/workflow.schema";

const localDB = new LocalDB();

const workflowCollection = Collection.collection(`workflow`);
const indexKey = workflowCollection.key(`index`);

const getIndexDocument = async () => {
  return await localDB.getItem(indexKey) ??
    new YAML.Document();
};

const setIndexDocument = async (indexDocument: YAML.Document) => {
  await localDB.setItem(indexKey, indexDocument);
};

const getWorkflowDocument = async (documentId: string) => {
  return await localDB.getItem(workflowCollection.key(documentId)) ?? null;
};

const getWorkflowDocumentOrCreate = async (documentId: string) => {
  return await getWorkflowDocument(documentId) ??
    new YAML.Document();
};

const deleteWorkflowDocument = async (documentId: string) => {
  return await localDB.deleteItem(workflowCollection.key(documentId));
};

const setWorkflowDocument = async (
  documentId: string,
  doc: YAML.Document,
) => {
  await localDB.setItem(workflowCollection.key(documentId), doc);
};

export const listWorkflows = async (): Promise<Workflow[]> => {
  const indexDocument = await getIndexDocument();

  const items = indexDocument.getIn([`items`]);

  const workflows: Workflow[] = [];
  if (YAML.isSeq(items)) {
    for (const item of items.items) {
      if (YAML.isScalar(item)) {
        const workflowDocument = await getWorkflowDocumentOrCreate(
          item.value!.toString(),
        );

        workflows.push(
          WorkflowSchema.parse(
            workflowDocument.toJS(),
          ),
        );
      }
    }
  }

  await setIndexDocument(indexDocument);

  return workflows;
};

export const getWorkflow = async (
  workflowId: string,
): Promise<Workflow | null> => {
  const workflow = await getWorkflowDocument(workflowId);

  if (!workflow) return null;

  return WorkflowSchema.parse(workflow?.toJS());
};

export const updateWorkflow = async (
  workflowId: string,
  mutations?: [string[], any][],
) => {
  if (mutations) {
    const workflowDocument = await getWorkflowDocumentOrCreate(workflowId);
    for (const [path, value] of mutations) {
      workflowDocument.setIn(path, value);
    }
    const updatedAt = new YAML.Scalar(new Date().toJSON());
    workflowDocument.setIn(["updatedAt"], updatedAt);
    await setWorkflowDocument(workflowId, workflowDocument);
  }
};

export const updateNameWorkflow = async (args: FormData) => {
  const d = args.get("workflowId")!;
  await updateWorkflow(d.toString(), [[["name"], args.get("name")!.toString()]]);
};

export const createWorkflow = async () => {
  const indexDocument = await getIndexDocument();
  const workflowId = ulid();
  const workflowDocument = await getWorkflowDocumentOrCreate(workflowId);

  workflowDocument.setIn(["id"], workflowId);
  indexDocument.addIn(["items"], workflowId);

  await setWorkflowDocument(workflowId, workflowDocument);
  await setIndexDocument(indexDocument);
};

export const deleteWorkflow = async (workflowId: string) => {
  const indexDocument = await getIndexDocument();

  const items = indexDocument.getIn(["items"]);

  if (YAML.isSeq(items)) {
    for (const [index, item] of Object.entries(items.items)) {
      if (YAML.isScalar(item) && item.value === workflowId) {
        await deleteWorkflowDocument(workflowId);
        indexDocument.deleteIn(["items", index]);
        await setIndexDocument(indexDocument);
        return true;
      }
    }
  }

  return false;

  // indexDocument.addIn(["items"], workflowId);

  // await deleteWorkflowDocument(workflowId);
  //
};
