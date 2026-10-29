---
name: portal-worklog
description: Log the work you do for the user into their portal as work points under their tasks, 2-3 tasks per session, each updated with notes as it moves, tagged doing, done, not done, blocked or waiting. Use in every session where the portal MCP server is connected and you do real work for the user (code, writing, research, fixes).
---

# Portal worklog

The user follows their progress in the portal. Everything there is a task,
and what you log is a work point under one of their tasks. Their worklog
page shows each task with your points under it, so keep it current.

## At the start

Call `get_context` once. It lists the user's projects, goals and open tasks
(`myTasks`), and their day (`todayTasks`): what is planned for today, still
pending from before, or worked on today. Use it to find the task for the
work you are about to do.

## While you work

Keep it simple: **2-3 tasks per session**, one per deliverable the user
would mention in a standup. Making a video is one task; its thumbnails and
upload pack is a second; uploading it is a third.

- When you start, call `log_work` with status `doing`. If the user already
  has a task for the work, name it in `point` (its `id` or title from
  `todayTasks` or `myTasks`). If not, give a short `text`: the portal makes
  a task for it, in the project its words fit. The user can move your points
  under another task later.
- As it moves, log on **the same task**: name it with `point` and say what
  happened in `note` ("v6 rendered, 3 notes fixed"). Never make a new task
  for a revision, version, round, retry or fix. Each point goes on the
  task's history, which shows how long it took from start to finish.
- When it ends, log it `done`, `not_done` (dropped or failed) or `blocked`.
  A done point finishes the task; a major task stays under way unless you
  set `completeTask`.
- When you need the user's permission, a decision or input, log `waiting`,
  then ask them. Change it once they answer.
- If `log_work` returns a `hint`, you made too many tasks today: log the
  next updates on existing ones. `tidy_points` merges tasks you made, once
  the user agrees.

## Writing points

- A new task's `text` is one short line naming the deliverable, in plain
  words the user's team would understand: "Fix Safari export button", not
  "edited utils.ts", and not "v4: new outro".
- Name `project` from `get_context` when you know it, or only `company` for
  company work on none of its projects. If you are not sure, leave them out;
  the portal places the task itself.
- Never log secrets, credentials, personal data or anything the user asked
  to keep private. Set `personal` for their private work.
- Skip trivial steps (reading a file, running a command, exporting,
  uploading to a tool). They go in a note, if anywhere.

## Tasks

- `find_tasks` finds a task by words in its title.
- `update_task_status`: move a task to `IN_PROGRESS` when you start it and
  `IN_REVIEW` when it is ready for the user to check. Mark it `DONE` only
  when the user agrees it is finished.
- `add_task` adds follow-up work the user asks you to track.
