---
name: portal-hiring
description: Run hiring in the user's portal - create job openings with their application forms, review and shortlist applicants, move them through stages and email them (rejections, tasks, interviews, offers). Use when the user talks about hiring, a job opening, candidates or applicants and the portal MCP server is connected.
---

# Portal hiring

The portal holds the user's job openings, the people who applied and every
email sent to them. HR follows the same data live in the portal's Hiring
tab, so anything you change shows up there.

## Openings and forms

- `list_job_openings` shows each opening with applicant counts per stage and
  its apply link. `get_job_opening` adds the description and the form.
- To create one, draft the title, description and questions with the user
  first, then call `create_job_opening`. Name and email are always asked, so
  don't add them. Use FILE for a resume, SELECT or MULTI_SELECT with options
  for fixed choices, URL for LinkedIn or portfolio links.
- New openings are drafts. Set `publish` (or `update_job_opening` with status
  OPEN) only when the user wants it live, then give them the apply link.
- `update_job_opening` with `questions` replaces the whole form: pass every
  question to keep, with its `id`, or answers lose their question.
- CLOSED stops new applications; the applicants stay.

## Reviewing applicants

- `list_applicants` takes a stage filter and returns answers, shortened.
  `get_applicant` has the full answers, notes, history and emails.
- When asked to shortlist, compare answers with what the opening asks for,
  and give the user a short ranked list with a reason for each before
  moving anyone. Say what you couldn't judge (for example a resume file,
  which you can't open; give its link instead).
- `move_applicants` moves people between stages: APPLIED, SHORTLISTED, TASK,
  INTERVIEW, OFFER, HIRED, REJECTED.
- `add_applicant_note` keeps your summary or the user's call notes with the
  applicant. Notes are private to the hiring team.

## Emailing applicants

Emails can't be unsent, so always:

1. Pick a template with `list_email_templates` (rejection, task, interview,
   offer, or one the company saved) or write a subject and body. Fill in
   every `[square bracket]` note with real details from the user.
2. Call `email_applicants` with `dryRun: true`. Show the user who it goes to
   (how many, and names when there are few), the subject and one preview.
3. Send with `dryRun: false` only after the user says yes to that preview.
4. Report what was sent, skipped or failed.

Placeholders `{{firstName}}`, `{{name}}`, `{{role}}`, `{{company}}` and
`{{sender}}` are filled in per person. A template suggests a stage to move
people to (rejection → REJECTED); set `moveTo` to `NONE` to leave them.
Replies go to the user's own email unless they give another address.

## Care with candidate data

Applicants' answers, emails and notes are personal data. Use them only for
the hiring task at hand, and don't copy them anywhere else.
