'use client'
import { startTransition } from "react"
import Link from "next/link"
import { createWorkflow, listWorkflows, updateNameWorkflow, deleteWorkflow } from "../components/data/workflow"
import useSWR from "swr"

export default () => {
    const { data: workflows = [], isLoading: isLoadingWorkflows, mutate } = useSWR("listWorkflows", () => listWorkflows())

    const handlerDeleteWorkflow = async (workflowId: string) => {
        await deleteWorkflow(workflowId)
        mutate()
    }

    return <>
        <button type="button" onClick={() => startTransition(() => { createWorkflow(); mutate(); })}>New workflow</button>

        <table>
            <thead>
                <tr>
                    <td>ID</td>
                    <td>Name</td>
                </tr>
            </thead>
            <tbody>
                {workflows.map(workflow =>
                    <tr key={`${workflow.id}`}>
                        <td>
                            <Link href={`/workflow/${workflow.id}`} className="font-mono">
                                {`${workflow.id}`}
                            </Link>
                        </td>
                        <td>
                            <form action={updateNameWorkflow}>
                                <input type="hidden" name="workflowId" defaultValue={workflow.id} />
                                <input type="text" name="name" defaultValue={workflow.name ?? ''} />
                            </form>
                        </td>
                        <td>
                            <button onClick={() => startTransition(() => { handlerDeleteWorkflow(workflow.id) })}>Delete</button>
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    </>
}
