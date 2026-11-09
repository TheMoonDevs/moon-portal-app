/**
 * Hiring skills: instructions that teach Claude how a team hires (screening,
 * task emails, interviews). Hiring leads install them on their own Claude
 * from the Skills page of the Hiring space. Client-safe.
 */

export const MAX_SKILL_BODY = 60000;
export const MAX_SKILL_TIPS = 4000;
export const MAX_SKILLS = 30;
/** What Claude accepts as a skill name; it is also the folder name. */
export const SKILL_NAME_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

/** A skill as the Skills section shows it. */
export interface HiringSkillView {
  /** The saved record, or null for a built-in the company hasn't changed. */
  id: string | null;
  name: string;
  description: string;
  body: string;
  tips: string | null;
  builtIn: boolean;
  updatedAt?: string | null;
  updatedById?: string | null;
}

const unquote = (value: string) => {
  const v = value.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  )
    return v.slice(1, -1).replace(/\\"/g, '"');
  return v;
};

/** Reads `name` and `description` from a SKILL.md's frontmatter. */
export function parseSkill(raw: string): {
  name: string;
  description: string;
  error: string | null;
} {
  const text = raw.replace(/\r\n/g, '\n').trim();
  const match = /^---\n([\s\S]*?)\n---(\n|$)/.exec(text);
  if (!match)
    return {
      name: '',
      description: '',
      error:
        'A skill starts with frontmatter: a --- line, name: and description:, then another --- line.',
    };
  const field = (key: string) => {
    const line = match[1]
      .split('\n')
      .find((l) => new RegExp(`^${key}\\s*:`).test(l));
    return line ? unquote(line.slice(line.indexOf(':') + 1)) : '';
  };
  const name = field('name');
  const description = field('description');
  const error = !SKILL_NAME_PATTERN.test(name)
    ? 'The name has to be lowercase letters, numbers and hyphens, up to 64 characters.'
    : !description
      ? 'Add a description: it tells Claude when to use the skill.'
      : description.length > 1024
        ? 'Keep the description under 1,024 characters.'
        : !text.slice(match[0].length).trim()
          ? 'Write the instructions below the frontmatter.'
          : null;
  return { name, description, error };
}

/**
 * A command that installs the skill for Claude Code on macOS or Linux: it
 * writes the SKILL.md into ~/.claude/skills/<name>/, replacing an older copy.
 */
export function claudeCodeInstallCommand(name: string, body: string) {
  const dir = `~/.claude/skills/${name}`;
  return `mkdir -p ${dir} && cat > ${dir}/SKILL.md <<'PORTAL_SKILL_EOF'
${body.trim()}
PORTAL_SKILL_EOF
echo "Installed ${name}. Start claude and type /${name}, or just ask."`;
}

/** Tips, one per line, without empty lines. */
export const tipLines = (tips: string | null | undefined) =>
  (tips ?? '')
    .split('\n')
    .map((t) => t.replace(/^\s*[-*]\s*/, '').trim())
    .filter(Boolean);

/**
 * One prompt that installs the skill when pasted into Claude, in the Claude
 * app (it saves the skill, or hands back a zip to upload) or in Claude Code
 * (it writes ~/.claude/skills/<name>/SKILL.md). Pasting it again updates it.
 */
export function skillInstallPrompt(name: string, body: string, origin: string) {
  return `Please install this Claude skill for me, exactly as written below. It's called "${name}" and comes from the Skills page of our portal's Hiring space. If I already have it, replace the old version.

- In Claude Code (you can write files on my computer): save the SKILL.md below to ~/.claude/skills/${name}/SKILL.md, creating the folder. Then tell me I can use it by typing /${name} or just asking for the work.
- In the Claude app (claude.ai, desktop or phone): save it to my skills. If you can save or propose a skill directly, do that with this exact content. If not, make a folder named ${name} with this SKILL.md inside, zip the folder as ${name}.zip, give me the file, and tell me to upload it under Settings → Capabilities → Skills → Upload skill (Customize → Skills in newer versions).

Don't reword, shorten or "improve" the skill. Once it's installed, check whether you can see the Portal connector's tools (for example list_job_openings). If you can't, tell me to connect the portal first at ${origin.replace(/\/$/, '')}/settings#claude.

=== BEGIN SKILL.md ===
${body.trim()}
=== END SKILL.md ===`;
}
