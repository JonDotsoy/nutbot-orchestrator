'use client'
import useSWR from "swr"
import ms from "ms"
import { getWorkflow } from "../../../components/data/workflow"
import { consumeJob, createJob, listJobs, reactiveJob } from "../../../components/data/jobs"
import { inspect } from "util"
import { startTransition, useState } from "react"
import { Job } from "../../../components/models/job.schema"

interface Params {
  params: {
    workflowId: string
  }
  searchParams: {}
}

const CreatedAt = ({ date }: { date: Date }) => {
  const timeAgo = Math.min(date.getTime() - Date.now(), -1000)

  const m = (): [number, "year" | "years" | "quarter" | "quarters" | "month" | "months" | "week" | "weeks" | "day" | "days" | "hour" | "hours" | "minute" | "minutes" | "second" | "seconds"] => {
    if (-timeAgo < ms('1m')) return [-Math.floor(-timeAgo / ms('1s')), 'seconds']
    if (-timeAgo < ms('1h')) return [-Math.floor(-timeAgo / ms('1m')), 'minutes']
    if (-timeAgo < ms('1d')) return [-Math.floor(-timeAgo / ms('1h')), 'hours']
    return [-Math.floor(-timeAgo / ms('1d')), 'days']
  }

  return <>
    {new Intl.RelativeTimeFormat().format(...m())} ({date.toLocaleString(undefined, { dateStyle: 'full', timeStyle: 'full' })})
  </>
}

export default ({ params: { workflowId } }: Params) => {
  const { data: workflow, isLoading: isLoadingWorkflow } = useSWR(['getWorkflow', workflowId], ([, workflowId]) => getWorkflow(workflowId))
  const { data: jobs = [], mutate: mutateJobs } = useSWR(['listJobs', workflowId], ([, workflowId]) => listJobs(workflowId))
  const [consumed, setConsumed] = useState<null | Job>(null);

  if (isLoadingWorkflow) return <>Loading</>
  // if (!workflow) return notFound();

  // const jobs = await listJobs(workflowId)

  const createJobHandler = async () => {
    await createJob(workflowId)
    mutateJobs()
  }

  const consumeHandler = async () => {
    setConsumed(await consumeJob(workflowId));
    mutateJobs();
  }

  const resumenHandler = async (jobId: string) => {
    setConsumed(await reactiveJob(workflowId, jobId));
    mutateJobs();
  }


  return <>
    {workflowId}

    <div>
      <button type="button" onClick={createJobHandler} className="px-5 py-3 text-white duration-150 bg-indigo-600 rounded-lg hover:bg-indigo-700 active:shadow-lg">Create job</button>
      <button type="button" onClick={consumeHandler} className="px-5 py-3 text-white duration-150 bg-indigo-600 rounded-lg hover:bg-indigo-700 active:shadow-lg">Take</button>

      {/* <div>
        <h2>Last consume</h2>
        <pre><code>{inspect(consumed)}</code></pre>
      </div> */}

      <div>
        <table className="w-full table-auto">
          <thead className="bg-gray-50 text-gray-600 font-medium border-b">
            <tr>
              <th>id</th>
              <th>status</th>
              <th>Created At</th>
              <th>Ack</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {jobs.map(job => <tr key={job.id}>
              <td>{job.id}</td>
              <td>{job.status}</td>
              <td>
                <CreatedAt date={new Date(job.createdAt)} />
              </td>
              <td>{job.ack}</td>
              <td>
                <button onClick={() => resumenHandler(job.id)} className="px-3 py-1 text-white duration-150 bg-indigo-600 rounded-lg hover:bg-indigo-700 active:shadow-lg">Reactive</button>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  </>
}