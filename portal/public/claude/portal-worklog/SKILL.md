---
name: portal-worklog
description: Log the work you do for the user into their portal worklog as you go, tagged doing, done, not done, blocked or waiting. Use in every session where the portal MCP server is connected and you do real work for the user (code, writing, research, fixes).
---

# Portal worklog

The user follows their progress in the portal. Your work shows up in the
"Claude" section of their worklog for the day, so keep it current.

## At the start

Call `get_context` once. It lists the user's projects, goals and open tasks,
and what you already logged today. Use it to name the right project and task.

## While you work

- When you start a real piece of work, call `log_work` with status `doing`.
- When it ends, call `log_work` again with **the same text** and status
  `done`, `not_done` (dropped or failed) or `blocked`. Same text updates the
  line instead of adding a new one.
- When you need the user's permission, a decision or input, log it as
  `waiting`, then ask them. Change it once they answer.
- Batch points in one call when several things finish together.

## Writing points

- One short line about the outcome, in plain words the user's team would
  understand: "Fix Safari export button", not "edited utils.ts".
- Name `project` (and `task` when there is one) from `get_context`. If you
  are not sure, leave them out; the portal links lines itself.
- Never log secrets, credentials, personal data or anything the user asked
  to keep private.
- Skip trivial steps (reading a file, running a command). Log units of work
  the user would mention in a standup.

## Tasks

- `find_tasks` finds a task by words in its title.
- `update_task_status`: move a task to `IN_PROGRESS` when you start it and
  `IN_REVIEW` when it is ready for the user to check. Mark it `DONE` only
  when the user agrees it is finished.
- `add_task` adds follow-up work the user asks you to track.
