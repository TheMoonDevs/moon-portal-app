---
name: portal-worklog
description: Log the work you do for the user into their portal worklog as 2-3 points per session, each updated with notes as it moves, tagged doing, done, not done, blocked or waiting. Use in every session where the portal MCP server is connected and you do real work for the user (code, writing, research, fixes).
---

# Portal worklog

The user follows their progress in the portal. Your work shows up in the
"Claude" section of their worklog for the day, so keep it current.

## At the start

Call `get_context` once. It lists the user's projects, goals and open tasks,
and what you already logged today. Use it to name the right project and task.

## While you work

Keep it simple: **2-3 points per session**, one per deliverable the user
would mention in a standup. Making a video is one point; its thumbnails and
upload pack is a second; uploading it is a third.

- When you start a deliverable, call `log_work` with status `doing`.
- As it moves, update **the same point**: name it with `point` (its `key`
  from `loggedToday`, or its text) and say what happened in `note`
  ("v6 rendered, 3 notes fixed"). Never add a new point for a revision,
  version, round, retry or fix. Each update goes on the point's timeline,
  which shows how long it took from start to finish.
- When it ends, log it `done`, `not_done` (dropped or failed) or `blocked`.
- When you need the user's permission, a decision or input, log the point
  as `waiting`, then ask them. Change it once they answer.
- If the user already typed a line for the same work (`typedToday` in
  `get_context`), set `typedLine` to its text so both count as one point.
- If `log_work` returns a `hint`, the day has too many points: fold the next
  updates into existing points.

## Writing points

- One short line naming the deliverable, in plain words the user's team
  would understand: "Fix Safari export button", not "edited utils.ts", and
  not "v4: new outro".
- Name `project` (and `task` when there is one) from `get_context`. If you
  are not sure, leave them out; the portal links lines itself.
- Never log secrets, credentials, personal data or anything the user asked
  to keep private.
- Skip trivial steps (reading a file, running a command, exporting,
  uploading to a tool). They go in a note, if anywhere.

## Tasks

- `find_tasks` finds a task by words in its title.
- `update_task_status`: move a task to `IN_PROGRESS` when you start it and
  `IN_REVIEW` when it is ready for the user to check. Mark it `DONE` only
  when the user agrees it is finished.
- `add_task` adds follow-up work the user asks you to track.
