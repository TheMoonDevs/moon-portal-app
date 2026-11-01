/*
 * The hiring skills that ship with the portal. A company can save its own
 * version of one (same name) in the Skills section, which then wins.
 */

export interface BuiltInSkill {
  /** The whole SKILL.md, frontmatter included. */
  body: string;
  /** How to get the most out of it, one tip per line. */
  tips: string;
}

export const BUILT_IN_SKILLS: BuiltInSkill[] = [
  {
    tips: 'Install the Portal connector first (Settings, then Claude). The skill drives the portal\'s hiring tools, so without the connector Claude can only talk about hiring, not do it.\nStart with the opening\'s name: "Screen the applicants for the HR intern opening." Claude pulls them, reads the screening requirements, opens their links and gives you a shortlist doc.\nWrite the opening\'s screening requirements first (Edit, then Details), or ask Claude to draft them with you. Every screening call is judged against them.\nNothing changes without your OK. Claude previews every email and stage move and waits for you to say yes.\nAsk for one step at a time when you want control: "Shortlist the top picks and reject the drops", "Send the task email to the shortlisted", "Give Asha two more days and remind her".\nFor interviews, say whose calendar to use: "Invite Ravi to an interview with the hiring lead\'s link." If you don\'t say, Claude asks.\nAfter you change how you like to hire (a new rule, a template you prefer), tell Claude to update the skill and save it here, so every hiring lead gets the change.',
    body: `---
name: "screen-applicants"
description: "Use when screening TheMoonDevs job applicants in the portal: shortlisting, rejecting, designing a take-home task and task page, sending task, reminder or interview emails, or extending a task deadline."
---

# Screen applicants for a TheMoonDevs opening

The hiring workflow Subhakar (founder, TheMoonDevs and Zone Studios) uses. It runs through the Portal MCP tools (\`mcp__Portal__*\`; load them with ToolSearch). Work in this order, and stop for approval where marked.

**Hard rule:** never change a stage or send an email without Subhakar's explicit OK for that exact action. Emails can't be unsent. Always preview with \`email_applicants\` \`dryRun: true\` first.

## Email sender and reply-to

- **Sender:** always the default, careers@reply-bots.com. Don't change it.
- **Reply-to, by default: the opening's hiring lead.** Task emails and anything personal from Subhakar or the lead reply to the hiring lead. Get the lead from \`get_job_opening\` and pass their email as \`replyTo\`.
- **Reply-to for HR emails: careers@themoondevs.com.** Rejections and other general HR emails don't go to the hiring lead. Pass \`replyTo: "careers@themoondevs.com"\`.
- State the sender and reply-to in every preview you show.

## 1. Pull the applicants

1. \`list_job_openings\` to find the opening (match the role name loosely, e.g. "AI visual artist" = "AI Concept Artist & Visual Designer (Intern)"). \`get_job_opening\` for the full description, notes, **screening requirements**, hiring lead (with their meeting link) and task.
   - If the opening has no screening requirements, ask Subhakar (or HR) what candidates must show, draft them from the job post and the preferences in step 2, and save them with \`update_job_opening\` \`screening\` once they agree.
2. \`list_applicants\` for the opening (limit 200). Use \`get_applicant\` for anyone whose answers are cut short.
3. Note each applicant's \`url\`. It opens them in the Hiring panel (\`https://portal.themoondevs.com/admin?tab=hiring&application=<id>\`).

## 2. Review them

Open every link they shared (portfolio, Behance, GitHub, YouTube, sites). Instagram, Drive, Canva and LinkedIn usually block automated access: judge those people on their answers and say so. Flag any link that contradicts what the applicant claimed.

Judge every applicant against the opening's **screening requirements** first (\`list_applicants\` returns them), and name the requirement that decided each call. Then apply Subhakar's general preferences:
- **Favour:** wide, hands-on experience; people who actively build or create with AI tools; self-starters who make things without being asked; unconventional backgrounds; answers in their own words.
- **Avoid:** corporate-heavy or agency-heavy experience. "It is of no use in our company."
- **Also keep:** people who sound genuine (honest, personal, self-aware answers) even if their work is thin.

## 3. Shortlist doc

Make a doc (Claude Docs, or an Artifact page) titled \`<Role>: applicant shortlist\` with four tiers:
1. **Top picks**
2. **Sound genuine**
3. **Maybes**
4. **Drop**

Every name gets an **Open in portal** link and one or two lines on why. Say which links you couldn't open. In the reply, list the top picks and sound-genuine names as portal links, and say no stages have changed.

## 4. Move stages and reject (after OK)

Typical ask: shortlist the top picks and sound genuine, reject the dropped. Subhakar often checks the maybes himself and tells you who stays.

- \`move_applicants\` to \`SHORTLISTED\` for the keepers.
- Rejection email via \`email_applicants\` with \`moveTo: REJECTED\` and \`replyTo: "careers@themoondevs.com"\`. Preview first (dryRun) with a decision card. Wording:

> Subject: Your application for {{role}} at TheMoonDevs
>
> Hi {{firstName}},
>
> Thank you for applying for the {{role}} role at TheMoonDevs and for taking the time to share your work with us. We've decided not to move forward with your application this time. We'll keep your details on file and will consider you for future openings.
>
> Thanks again, and we wish you all the best.
>
> HR, TheMoonDevs

If people are moved to Rejected without the email (e.g. maybes he rejects later), ask whether to send them the same email.

## 5. Design the screening task

If the opening has no task yet (\`get_job_opening\`), ideate with Subhakar before building anything. Principles from earlier rounds:
- It must be **AI-related** and test how fast they adapt to AI, plus **creativity**, because "everything works differently" here. Test the core skill of the role (e.g. talent-spotting for HR).
- Don't ask for too much before hiring: about 3 to 4 hours, due in about 4 days. It is a small entry-level test, nothing more.
- Ask for their thinking or ideology, not their prompts.
- Be precise about which AI is allowed (e.g. the artist poster banned AI image generation but allowed Claude + Remotion through code).
- Offer an optional "go further, there are no instructions" part.
- Give 3 or 4 ideas with a recommendation, then let him mix them.

Past tasks, for reference:
- **AI Concept Artist:** a girl chases the last train across flooded Mumbai at 2 AM (synthwave, anime film meets city pop). Beat the placeholder title "Neon Monsoon", a 6 to 8 frame storyboard with a consistent character, a hand-made or code-built 4:5 hero poster, and a few lines on their thinking.
- **HR & Admin:** remake one of our job posts with AI in any format except text, then use it, plus AI, to spot one real under-the-radar talent and get back to us.

Set it on the opening with \`update_job_opening\` \`task\` (brief, deliverables, effort, dueDays, submission questions). Name and email aren't asked; the link knows them. Set \`hiringLead\` if it's missing, since task email replies go to them.

## 6. The candidate page (inspirational first, task second)

Each candidate's \`{{taskLink}}\` opens a private page. **It is not a task page. It is an inspirational page.** Its main job is to show the candidate who they're joining, why it matters, and the full scope of what they'd do in the role. The task is only a small entry-level test at the end, followed by the submission form. Don't let the task take over the page.

- **Who you're joining:** the company story (\`/mnt/project-files/policies/company-policies-summary.md\`): the three dreams, "The How matters more than the What & the Why", the 8 principles, the studio and what we're building, the team with an empty "Joining soon" card in their name, and the founder. Use Subhakar's lines word for word.
- **Why it matters:** why this role is important here and what they'd shape.
- **The full scope of the role:** everything they'd really do, taken from the job description, not just the task's theme. For example, Social & PR isn't only song releases; it runs from community management to PR for the whole studio.
- **What awaits:** the growth path (e.g. the 3-month path to full-time).
- **For HR-type roles:** say that most of our hiring runs through AI interaction and creative hiring mechanisms, which is why they're tested this way.
- **Then the task:** framed as a short entry-level test, then the form.

The \`page\` field on the task picks the designed intro (check \`update_job_opening\` for the ones that exist, e.g. \`concept-artist\`). A new role needs its own page built in the \`TheMoonDevs/moon-portal-app\` repo (\`portal/lib/hiring/taskPages/\`, the \`/task/[token]\` route).

**Who builds it.** First check whether you can push to the repo (it's attached to the session and git push works). If you can, build it and open a PR on the designated branch. Often the hiring manager has no git access and can't build pages. Then don't build it: write a ready-to-share build prompt for the devs instead, save it to \`/mnt/project-files/hiring/<role-slug>-task-page/build-prompt.md\`, and attach it. Model it on \`/mnt/project-files/hiring/artist-task-page/build-prompt.md\`: a line saying to paste it into Claude Code from the repo root, the opening id and company, files to read first, data and route changes if any are needed, every scene with its final wording (founder lines in quotes, word for word), the task brief and form fields, which images to copy and where, the design bar below, and a "Done when" checklist. Put any images it needs in the same folder.

**Design bar: never bland.** Subhakar rejected a plain new page as "so bland". Before designing a new one, study the existing pages in the repo, the AI artist page ("sketchbook" style) and the HR page ("night radar" style), and take inspiration from them: a strong visual concept tied to the role, a dark cinematic look, big type, one scene per screen, scroll-triggered motion, and the candidate greeted by first name. Each new page must match their richness and still feel different from them, with its own concept, palette and motion. A page that is just text on a background is not done. Check it at 375px wide and on desktop, with \`prefers-reduced-motion\` respected, and share screenshots before calling it ready. Spell this bar out in any build prompt too.

Preview at \`https://portal.themoondevs.com/task/preview/<openingId>?name=<FirstName>\` (logged in).

## 7. Task email (after OK)

Only to the shortlisted. \`email_applicants\` with \`moveTo: TASK\` and \`replyTo\` set to the hiring lead's email, \`dryRun: true\` first, then a decision card. Use this template word for word, changing only the role name:

> Subject: {{firstName}}, I saw your work
>
> Hi {{firstName}},
>
> I'm Subhakar, founder of TheMoonDevs and Zone Studios, and I'm personally hiring for our <Role> role.
>
> I went through your application and had a look at your work.
>
> I'm interested. If you are too, the next step is a short creative challenge. It's the only one we'll ask for, and it's built to show us how you think, not how much you can grind out.
>
> Everything is here, along with what working with us actually looks like: {{taskLink}}
>
> This link is only for you. We ask everyone we're serious about to do this, because it quickly separates people who want this role from people who are applying everywhere. If it's not for you, no hard feelings.
>
> If it is, I can't wait to see what you make.
>
> Subhakar
> Founder, TheMoonDevs & Zone Studios

Keep the same neutral line for everyone. Subhakar rejected per-person lines about their work as sounding AI-written, even short ones. Don't put task details in the email; they live on the page. Fix lowercase names in the preview (e.g. "rathiksha" → "Rathiksha").

## 8. Deadlines, reminders and resends (after OK)

- **More time for one person:** \`extend_task_deadline\` with their id and \`dueAt\` (YYYY-MM-DD) or \`days\`. Only they get the new date, and nobody is emailed.
- **Reminder:** \`email_applicants\` with the "Task reminder" template, which fills in \`{{taskLink}}\` and \`{{taskDue}}\` (the new date after an extension). Dry run first, then a decision card.
- **Resend an email word for word** (bounced, or they never saw it): \`resend_applicant_email\`, dry run first.

## 9. Interview email (after OK)

- Interviews are booked through a meeting link. Before the dry run, ask Subhakar whose link to use: the hiring lead's (from \`get_hiring_lead\`), his own, or someone else's. Pass the answer as \`meetingLinkOf\` (\`lead\`, \`me\`, or a member's name or email). Without it, \`email_applicants\` returns the choices and sends nothing.
- To switch or assign the lead first, use \`set_hiring_lead\`.
- Use the "Interview" template with \`moveTo: INTERVIEW\`, and show the link in the preview.

## 10. Report

After each send, confirm how many went, any failures, and the stage counts for the opening (Shortlisted, Task, Rejected, still Applied). Submissions show on the applicant in the Hiring tab with a "Task submitted" badge.
`,
  },
];
