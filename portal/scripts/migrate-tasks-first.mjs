/**
 * Moves every person's worklogs to tasks first: each line they wrote becomes
 * a task (or joins the task it was already linked to), and what happened to
 * it (its timeline, and the assistant's lines about it) becomes work points
 * under that task. Nothing is deleted: each worklog keeps its markdown, links
 * and timeline as they were under `beforeTasks`, and is then marked
 * `tasksFirst` so the portal writes it from the tasks from now on.
 *
 * - A line linked to a task joins that task; the task itself is not changed.
 * - A line carried over to a later day (➡️) is one task across those days.
 * - Other lines become new tasks, planned for their day. A line with no
 *   status on a past day was a log of what was done, so it is done. Lines
 *   marked doing, blocked, waiting or not done from the last 14 days stay
 *   open (pending); older ones are archived, and can be brought back from
 *   Your tasks.
 * - Escaped spaces (&#x20;) in titles are put back as spaces.
 * - The assistant's lines go under the task of the line they were about
 *   (picked by the person, linked as the same work, or on the same task);
 *   otherwise they get a task of their own, made by Claude.
 *
 * Safe to run again: a worklog already marked `tasksFirst` is skipped, and
 * every task and work point it makes is tagged `migratedFrom`.
 *
 *   node scripts/migrate-tasks-first.mjs                 # report only, writes nothing
 *   node scripts/migrate-tasks-first.mjs --user <id>     # one person
 *   node scripts/migrate-tasks-first.mjs --verbose       # every line
 *   node scripts/migrate-tasks-first.mjs --apply         # does it
 *
 * Reads DATABASE_URL from the environment or portal/.env.
 */
import 'dotenv/config';

import { MongoClient, ObjectId } from 'mongodb';

/* ------------------------------ line helpers ----------------------------- */
// The same as lib/worklogs/lines.ts and lib/worklogs/timeline.ts.

const PRIVATE_LINE = /^\s*(\*\s*)?p:/i;
const CLAUDE_SECTION_ID = 'claude';
const STATUS_BY_EMOJI = {
  '🟡': 'doing',
  '✅': 'done',
  '❌': 'not_done',
  '🔴': 'blocked',
  '❓': 'waiting',
};

const hash = (s) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

export const normalizeLine = (line) =>
  line
    .replace(PRIVATE_LINE, '')
    .replace(/^\s*[*\-+]\s*/, '')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, ' ')
    .replace(/[`*_~>#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const lineKey = (line) => hash(normalizeLine(line).toLowerCase());

const bare = (line) =>
  line
    .replace(PRIVATE_LINE, '')
    .replace(/^\s*[*\-+]\s*/, '')
    .trimStart();

const statusOf = (line) => {
  const words = bare(line);
  const emoji = Object.keys(STATUS_BY_EMOJI).find((e) => words.startsWith(e));
  return emoji ? STATUS_BY_EMOJI[emoji] : null;
};

const setAsideOf = (line) => {
  const words = bare(line);
  if (words.startsWith('➡')) return 'moved';
  if (words.startsWith('🗄')) return 'archived';
  return null;
};

/** Every line of a day, as sectionLines in lib/worklogs/timeline.ts. */
export function sectionLines(works) {
  if (!Array.isArray(works)) return [];
  const out = [];
  const seen = new Set();
  for (const work of works) {
    const content = typeof work?.content === 'string' ? work.content : '';
    for (const raw of content.split('\n')) {
      const text = normalizeLine(raw);
      if (text.replace(/[^\p{L}\p{N}]/gu, '').length < 3) continue;
      const key = lineKey(raw);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        key,
        text,
        status: statusOf(raw),
        isPrivate: PRIVATE_LINE.test(raw),
        claude: work?.link_id === CLAUDE_SECTION_ID,
        setAside: setAsideOf(raw),
        section: work?.link_id ?? null,
      });
    }
  }
  return out;
}

/* --------------------------------- plan ---------------------------------- */

const PERSONAL = 'personal';
const OPEN = ['TODO', 'IN_PROGRESS', 'IN_REVIEW'];
const KEEP_OPEN_DAYS = 14;

const addDays = (day, n) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Words as a title: spaces a markdown editor escaped (&#x20;) put back. */
const cleanTitle = (text) =>
  text
    .replace(/&\s*#?\s*x20;|&nbsp;|&\s*#?\s*160;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

const isoOf = (value) => (value ? new Date(value).toISOString() : null);

const isPersonalLink = (link) =>
  !!link && (link.isPrivate || link.companyId === PERSONAL);

/** Where a new task goes, from its line and link. */
function placeOf(line, link) {
  if (line.isPrivate || isPersonalLink(link))
    return { companyId: PERSONAL, projectId: null, placedBy: 'personal' };
  if (link?.companyId && link.source !== 'none')
    return {
      companyId: link.companyId,
      projectId: link.projectId ?? null,
      placedBy: link.source === 'user' ? 'user' : 'auto',
    };
  return { companyId: null, projectId: null, placedBy: null };
}

/**
 * A task's status and flag from its line's last status. A line with no
 * status on a day already past was a log of what was done that day (most
 * worklogs were written that way), so it is done; only lines marked doing,
 * blocked, waiting or not done stay open, and only from the last 14 days.
 */
function statusFields(status, setAside, { keepOpen, past, doneAt, startedAt }) {
  if (setAside === 'archived') return { status: 'ARCHIVED', flag: null };
  if (status === 'done' || (!status && past && setAside !== 'moved'))
    return { status: 'DONE', flag: null, completedAt: doneAt };
  if (!keepOpen) return { status: 'ARCHIVED', flag: null };
  if (status === 'doing' || status === 'blocked' || status === 'waiting')
    return {
      status: 'IN_PROGRESS',
      flag: status === 'doing' ? null : status,
      startedAt,
    };
  return { status: 'TODO', flag: null };
}

/**
 * What one person's worklogs become, without touching anything: the tasks
 * to make, the work points to add, and the worklogs to mark. `logs` are the
 * latest copy of each day, oldest first; `tasks` the existing tasks their
 * links point to, by id; `fromLine` their tasks made from lines, by key;
 * `migrated` tasks made by an earlier run, by line key.
 */
export function planUser({ userId, logs, tasks, fromLine, migrated, today }) {
  const newTasks = [];
  const points = [];
  const marks = [];
  const notes = { mismatched: 0, carried: 0, claudeOwn: 0, claudeUnder: 0 };
  // The task a line key is on so far, for lines carried to a later day.
  const carried = new Map(migrated);
  const seenEvents = new Map(); // taskRef -> Set of event ids

  const ref = (task) => task.id ?? task.tempId;
  const pushPoint = (task, p) => {
    const id = `${p.at}|${p.status ?? ''}|${p.text ?? ''}|${p.by}`;
    const seen = seenEvents.get(ref(task)) ?? new Set();
    if (seen.has(id)) return;
    seen.add(id);
    seenEvents.set(ref(task), seen);
    points.push({ task: ref(task), ...p });
  };

  for (const log of logs) {
    if (log.tasksFirst) continue;
    const date = log.date;
    const worklogId = String(log._id);
    const links = new Map((log.links ?? []).map((l) => [l.key, l]));
    const timeline = (log.timeline ?? [])
      .slice()
      .sort((a, b) => String(a.at).localeCompare(String(b.at)));
    const eventsOf = (key) => timeline.filter((e) => e.key === key);
    const lines = sectionLines(log.works);
    const dayAt =
      isoOf(log.updatedAt) ?? isoOf(log.createdAt) ?? `${date}T12:00:00.000Z`;
    const keepOpen = date >= addDays(today, -KEEP_OPEN_DAYS);
    const past = date < today;
    const lineTask = new Map(); // key -> task, for this day

    const makeTask = (line, link, madeBy) => {
      const events = eventsOf(line.key);
      const first = events[0]?.at ?? isoOf(log.createdAt) ?? dayAt;
      const doneAt =
        events.filter((e) => e.status === 'done').at(-1)?.at ?? dayAt;
      const startedAt = events.find((e) => e.status === 'doing')?.at ?? first;
      const task = {
        tempId: `new:${userId}:${worklogId}:${line.key}`,
        title: cleanTitle(line.text).slice(0, 200),
        ...placeOf(line, link),
        ...statusFields(line.status, line.setAside, {
          keepOpen,
          past,
          doneAt,
          startedAt,
        }),
        size: 'MINOR',
        assigneeIds: [userId],
        ownerId: userId,
        createdById: userId,
        madeBy,
        forDate: date,
        createdAt: first,
        updatedAt: dayAt,
        migratedFrom: { worklogId, key: line.key },
      };
      task.completedByIds = task.status === 'DONE' ? [userId] : [];
      newTasks.push(task);
      return task;
    };

    // The person's own lines first, so the assistant's can go under them.
    for (const line of lines.filter((l) => !l.claude)) {
      const link = links.get(line.key);
      let task =
        (link?.taskId && tasks.get(link.taskId)) ||
        carried.get(line.key) ||
        fromLine.get(line.key) ||
        null;
      if (task && carried.get(line.key) === task) notes.carried += 1;
      const existing = !!task;
      if (!task) task = makeTask(line, link, 'person');
      else if (task.id && !task.migratedFrom) {
        // Linked to a task already: it stays as it is.
        const open = OPEN.includes(task.status);
        if (open === (line.status === 'done')) notes.mismatched += 1;
      } else if (task.tempId || task.migratedFrom) {
        // Carried on: the newer day's status is the task's now.
        const doneAt =
          eventsOf(line.key)
            .filter((e) => e.status === 'done')
            .at(-1)?.at ?? dayAt;
        Object.assign(
          task,
          statusFields(line.status, line.setAside, {
            keepOpen,
            past,
            doneAt,
            startedAt: task.startedAt ?? dayAt,
          }),
          { updatedAt: dayAt },
        );
        task.completedByIds = task.status === 'DONE' ? [userId] : [];
        if (task.id) task.changed = true;
      }
      lineTask.set(line.key, task);
      // A line moved on stays one task on the next day.
      if (line.setAside === 'moved') carried.set(line.key, task);
      else if (OPEN.includes(task.status)) carried.set(line.key, task);
      else carried.delete(line.key);

      const events = eventsOf(line.key);
      const isPrivate =
        !task.projectId && (!task.companyId || task.companyId === PERSONAL);
      for (const e of events)
        pushPoint(task, {
          userId,
          date,
          text: (e.note ?? '').slice(0, 500),
          status: e.status ?? null,
          by: e.by === 'claude' ? 'claude' : 'person',
          at: e.at,
          isPrivate,
          migratedFrom: { worklogId, key: line.key },
        });
      // Worked on this day with no history: one point says so.
      if (!events.length && (existing || line.status))
        pushPoint(task, {
          userId,
          date,
          text: line.status ? '' : 'On the day’s worklog',
          status: line.setAside ? null : line.status,
          by: 'person',
          at: dayAt,
          isPrivate,
          migratedFrom: { worklogId, key: line.key },
        });
    }

    // The assistant's lines: under the person's line they were about, or
    // a task of their own.
    for (const line of lines.filter((l) => l.claude)) {
      const link = links.get(line.key);
      const typed = lines.find(
        (l) => !l.claude && links.get(l.key)?.sameAs === line.key,
      );
      const onTask = link?.taskId
        ? lines.find(
            (l) => !l.claude && links.get(l.key)?.taskId === link.taskId,
          )
        : undefined;
      const parentKey = link?.parentKey ?? typed?.key ?? onTask?.key ?? null;
      let task =
        (parentKey && lineTask.get(parentKey)) ||
        (link?.taskId && tasks.get(link.taskId)) ||
        carried.get(line.key) ||
        null;
      const own = !task;
      if (own) {
        task = makeTask(line, link, 'claude');
        notes.claudeOwn += 1;
      } else notes.claudeUnder += 1;
      if (line.setAside === 'moved' || OPEN.includes(task.status))
        carried.set(line.key, task);
      const isPrivate =
        !task.projectId && (!task.companyId || task.companyId === PERSONAL);
      const events = eventsOf(line.key);
      const sameWords =
        line.text.toLowerCase() === String(task.title).toLowerCase();
      if (!events.length)
        pushPoint(task, {
          userId,
          date,
          text: own || sameWords ? '' : line.text,
          status: line.setAside ? null : line.status,
          by: 'claude',
          at: dayAt,
          isPrivate,
          migratedFrom: { worklogId, key: line.key },
        });
      events.forEach((e, i) =>
        pushPoint(task, {
          userId,
          date,
          // The line's words go with its first point when it joins
          // another task, so they are not lost.
          text: (
            e.note || (i === 0 && !own && !sameWords ? line.text : '')
          ).slice(0, 500),
          status: e.status ?? null,
          by: 'claude',
          at: e.at,
          isPrivate,
          migratedFrom: { worklogId, key: line.key },
        }),
      );
    }
    marks.push({ worklogId, date, lines: lines.length });
  }
  return { newTasks, points, marks, notes };
}

/* ---------------------------------- run ---------------------------------- */

const chunks = (items, size = 1000) => {
  const out = [];
  for (let i = 0; i < items.length; i += size)
    out.push(items.slice(i, i + size));
  return out;
};

const main = async () => {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const verbose = args.includes('--verbose');
  const onlyUser = args.includes('--user')
    ? args[args.indexOf('--user') + 1]
    : null;
  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
  }
  const client = new MongoClient(url);
  await client.connect();
  const db = client.db();
  const Logs = db.collection('WorkLogs');
  const Tasks = db.collection('Task');
  const Points = db.collection('WorkPoint');
  const today = new Date().toISOString().slice(0, 10);

  // Worklogs keep userId as an ObjectId.
  const userIds = onlyUser
    ? [ObjectId.isValid(onlyUser) ? new ObjectId(onlyUser) : onlyUser]
    : await Logs.distinct('userId', { logType: 'dayLog' });
  const totals = {
    people: 0,
    logs: 0,
    linked: 0,
    tasks: 0,
    open: 0,
    done: 0,
    archived: 0,
    claudeTasks: 0,
    points: 0,
    mismatched: 0,
  };
  const rows = [];

  for (const userId of userIds.filter(Boolean)) {
    const all = await Logs.find({ userId, logType: 'dayLog' })
      .sort({ date: 1 })
      .toArray();
    // Only the latest copy of each day counts, as on every screen.
    const byDate = new Map();
    for (const log of all) {
      if (!log.date) continue;
      const seen = byDate.get(log.date);
      if (!seen || new Date(log.updatedAt) > new Date(seen.updatedAt))
        byDate.set(log.date, log);
    }
    const logs = Array.from(byDate.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    if (!logs.some((l) => !l.tasksFirst)) continue;

    const taskIds = new Set();
    for (const log of logs)
      for (const l of log.links ?? []) if (l.taskId) taskIds.add(l.taskId);
    const ids = Array.from(taskIds)
      .filter((id) => /^[a-f0-9]{24}$/i.test(id))
      .map((id) => new ObjectId(id));
    const tasks = new Map(
      (ids.length ? await Tasks.find({ _id: { $in: ids } }).toArray() : []).map(
        (t) => [String(t._id), { ...t, id: String(t._id) }],
      ),
    );
    const fromLine = new Map(
      (
        await Tasks.find({
          assigneeIds: userId,
          fromLine: { $type: 'string' },
        }).toArray()
      ).map((t) => [t.fromLine, { ...t, id: String(t._id) }]),
    );
    const migrated = new Map(
      (
        await Tasks.find({
          ownerId: userId,
          'migratedFrom.key': { $type: 'string' },
          status: { $in: OPEN },
        }).toArray()
      ).map((t) => [t.migratedFrom.key, { ...t, id: String(t._id) }]),
    );

    const plan = planUser({ userId, logs, tasks, fromLine, migrated, today });
    const linkedCount = new Set(
      plan.points.filter((p) => !p.task.startsWith('new:')).map((p) => p.task),
    ).size;
    const row = {
      userId,
      logs: plan.marks.length,
      linked: linkedCount,
      tasks: plan.newTasks.length,
      open: plan.newTasks.filter((t) => OPEN.includes(t.status)).length,
      done: plan.newTasks.filter((t) => t.status === 'DONE').length,
      archived: plan.newTasks.filter((t) => t.status === 'ARCHIVED').length,
      claudeTasks: plan.newTasks.filter((t) => t.madeBy === 'claude').length,
      points: plan.points.length,
      mismatched: plan.notes.mismatched,
    };
    rows.push(row);
    totals.people += 1;
    for (const k of Object.keys(row))
      if (typeof row[k] === 'number') totals[k] += row[k];

    if (verbose)
      for (const t of plan.newTasks)
        console.log(
          `    ${userId} ${t.forDate} [${t.status}${t.flag ? `/${t.flag}` : ''}] ${t.madeBy === 'claude' ? '(claude) ' : ''}${t.title}  → ${t.projectId ?? t.companyId ?? 'unplaced'}`,
        );

    if (!apply) continue;
    // Writes go in batches per person: one read of what an earlier run
    // already wrote, then a few big writes, instead of a round trip a row.
    // Tasks first, so points can point at them.
    const realId = new Map();
    const madeBefore = new Map(
      (
        await Tasks.find(
          { ownerId: userId, 'migratedFrom.key': { $type: 'string' } },
          { projection: { migratedFrom: 1 } },
        ).toArray()
      ).map((t) => [
        `${t.migratedFrom.worklogId}|${t.migratedFrom.key}`,
        String(t._id),
      ]),
    );
    const toInsert = [];
    for (const t of plan.newTasks) {
      const found = madeBefore.get(
        `${t.migratedFrom.worklogId}|${t.migratedFrom.key}`,
      );
      if (found) {
        realId.set(t.tempId, found);
        continue;
      }
      const { tempId, changed: _c, ...doc } = t;
      const _id = new ObjectId();
      realId.set(tempId, String(_id));
      toInsert.push({
        _id,
        ...doc,
        description: null,
        dueDate: null,
        goalId: null,
        goalPartId: null,
        order: Date.parse(doc.createdAt) || Date.now(),
        startedAt: doc.startedAt ?? null,
        completedAt: doc.completedAt ?? null,
      });
    }
    for (const docs of chunks(toInsert))
      await Tasks.insertMany(docs, { ordered: false });
    // Earlier runs' tasks carried on to a newer day.
    const carriedOn = Array.from(migrated.values())
      .filter((t) => t.changed)
      .map((t) => ({
        updateOne: {
          filter: { _id: t._id },
          update: {
            $set: {
              status: t.status,
              flag: t.flag ?? null,
              completedAt: t.completedAt ?? null,
              updatedAt: t.updatedAt,
            },
          },
        },
      }));
    if (carriedOn.length) await Tasks.bulkWrite(carriedOn, { ordered: false });

    const pointKey = (p) =>
      [
        p.taskId,
        p.at,
        p.migratedFrom.worklogId,
        p.migratedFrom.key,
        p.status ?? null,
        p.text,
      ].join('|');
    const pointsBefore = new Set(
      (
        await Points.find(
          { userId, 'migratedFrom.key': { $type: 'string' } },
          {
            projection: { taskId: 1, at: 1, migratedFrom: 1, status: 1, text: 1 },
          },
        ).toArray()
      ).map(pointKey),
    );
    const newPoints = [];
    for (const p of plan.points) {
      const { task: _t, ...doc } = p;
      const point = {
        ...doc,
        taskId: realId.get(p.task) ?? p.task,
        createdAt: p.at,
        updatedAt: p.at,
      };
      if (!pointsBefore.has(pointKey(point))) newPoints.push(point);
    }
    for (const docs of chunks(newPoints))
      await Points.insertMany(docs, { ordered: false });

    // Each worklog keeps what it was, and is written from tasks from now on.
    const migratedAt = new Date().toISOString();
    const marks = plan.marks.map((m) => {
      const log = logs.find((l) => String(l._id) === m.worklogId);
      return {
        updateOne: {
          filter: { _id: log._id, tasksFirst: { $ne: true } },
          update: {
            $set: {
              tasksFirst: true,
              beforeTasks: {
                works: log.works ?? [],
                links: log.links ?? [],
                timeline: log.timeline ?? [],
                migratedAt,
              },
            },
          },
        },
      };
    });
    for (const ops of chunks(marks, 200))
      await Logs.bulkWrite(ops, { ordered: false });
    if (verbose)
      console.log(
        `  ${userId}: wrote ${toInsert.length} tasks, ${newPoints.length} work points, marked ${marks.length} days`,
      );
  }

  console.log(
    apply ? 'Applied:' : 'Dry run (nothing written; pass --apply to write):',
  );
  for (const r of rows)
    console.log(
      `  ${r.userId}: ${r.logs} days → ${r.tasks} new tasks (${r.open} open, ${r.done} done, ${r.archived} archived; ${r.claudeTasks} by Claude), ${r.linked} existing tasks joined, ${r.points} work points${r.mismatched ? `; ${r.mismatched} lines disagree with their task's status (the task's is kept)` : ''}`,
    );
  console.log(
    `Total: ${totals.people} people, ${totals.logs} days, ${totals.tasks} new tasks (${totals.open} open, ${totals.done} done, ${totals.archived} archived; ${totals.claudeTasks} by Claude), ${totals.linked} existing tasks joined, ${totals.points} work points.`,
  );
  await client.close();
};

if (process.argv[1]?.endsWith('migrate-tasks-first.mjs')) await main();
