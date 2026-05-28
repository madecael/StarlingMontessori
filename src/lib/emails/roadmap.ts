import type { Roadmap } from "../roadmap";

export function roadmapEmail(params: { name: string; roadmap: Roadmap }): {
  subject: string;
  text: string;
  html: string;
} {
  const { name, roadmap } = params;
  const { timeline, priorities, schools, nextStep } = roadmap;

  const subject = "Your personal preschool decision roadmap";

  // ── Text version ────────────────────────────────────────────────────────────

  const timelineLines = timeline.map((s) => `  ${s.period}: ${s.label}`);

  const prioritiesLines =
    priorities.length > 0
      ? ["What to look for", "", ...priorities.map((p) => `  - ${p}`)]
      : [];

  const schoolLines = schools.map((s) => {
    const tag = s.isStarling ? " (that's us)" : "";
    return `  ${s.name}${tag} — ${s.philosophy} (${s.neighborhood})\n  ${s.url}`;
  });

  const textSections: string[] = [
    `Hi ${name},`,
    "",
    "Your timeline",
    "",
    ...timelineLines,
  ];

  if (prioritiesLines.length > 0) {
    textSections.push("", ...prioritiesLines);
  }

  textSections.push(
    "",
    "Schools to consider near you",
    "",
    ...schoolLines.flatMap((l) => [l, ""]),
    "Your next step",
    "",
    nextStep,
    "",
    "We'll send you a few short notes over the coming weeks as decision dates get closer. You can unsubscribe at any time.",
    "",
    "We're happy to help — even if Starling isn't the right fit for you.",
    "",
    "If you have questions, just reply to this email — we read every one.",
    "",
    "Warmly,",
    "— Fabienne, Starling Montessori"
  );

  const text = textSections.join("\n");

  // ── HTML version ─────────────────────────────────────────────────────────────

  const timelineHtml = timeline
    .map((s) => `<li>${escapeHtml(s.period)}: ${escapeHtml(s.label)}</li>`)
    .join("\n");

  const prioritiesHtml =
    priorities.length > 0
      ? `<h3>What to look for</h3>\n<ul>\n${priorities.map((p) => `<li>${escapeHtml(p)}</li>`).join("\n")}\n</ul>`
      : "";

  const schoolsHtml = schools
    .map((s) => {
      const tag = s.isStarling ? ` <span>(that's us)</span>` : "";
      const link = `<a href="${s.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(s.name)}</a>`;
      return `<p>${link}${tag} — ${escapeHtml(s.philosophy)} (${escapeHtml(s.neighborhood)})</p>`;
    })
    .join("\n");

  const html = `
<p>Hi ${escapeHtml(name)},</p>

<h3>Your timeline</h3>
<ul>
${timelineHtml}
</ul>

${prioritiesHtml}

<h3>Schools to consider near you</h3>
${schoolsHtml}

<h3>Your next step</h3>
<p>${escapeHtml(nextStep)}</p>

<p>We'll send you a few short notes over the coming weeks as decision dates get closer. You can unsubscribe at any time.</p>

<p>We're happy to help — even if Starling isn't the right fit for you.</p>

<p>If you have questions, just reply to this email — we read every one.</p>

<p>Warmly,<br>— Fabienne, Starling Montessori</p>
`.trim();

  return { subject, text, html };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]!);
}
