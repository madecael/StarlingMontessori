import { escapeHtml } from "./_escape";

export function nurture1(params: { name: string; unsubscribeUrl: string }) {
  const { name, unsubscribeUrl } = params;
  return {
    subject: "Before you tour a preschool",
    text: [
      `Hi ${name},`,
      "",
      "When you visit a school, there are a few things worth noticing that most tour guides won't point out.",
      "",
      "Watch the transitions between activities. Abrupt transitions — a sharp bell, a teacher clapping hands to stop work mid-flow — tend to stress small children. Gentle, signaled transitions reveal how much the adults have thought about the children's experience rather than just the schedule.",
      "",
      "Listen to the room when adults aren't the ones talking. In a well-functioning classroom, children's voices fill the space softly — conversation, questions, occasional laughter. If the room goes quiet only when a teacher commands it, that tells you something about whose experience is centered.",
      "",
      "Notice whether the lead teacher kneels or sits to speak with children rather than addressing them from above. It's a small thing, but it shows up consistently in schools where the adults genuinely think from the child's perspective.",
      "",
      "None of these will appear on a brochure. But they're the kind of details that tend to matter most once your child is actually there every morning.",
      "",
      "Happy to talk through any of this any time — even if Starling isn't where you'll land.",
      "",
      "— Fabienne",
      "",
      `You can unsubscribe at any time with one click: ${unsubscribeUrl}`,
    ].join("\n"),
    html: `
<p>Hi ${escapeHtml(name)},</p>

<p>When you visit a school, there are a few things worth noticing that most tour guides won't point out.</p>

<p>Watch the transitions between activities. Abrupt transitions — a sharp bell, a teacher clapping hands to stop work mid-flow — tend to stress small children. Gentle, signaled transitions reveal how much the adults have thought about the children's experience rather than just the schedule.</p>

<p>Listen to the room when adults aren't the ones talking. In a well-functioning classroom, children's voices fill the space softly — conversation, questions, occasional laughter. If the room goes quiet only when a teacher commands it, that tells you something about whose experience is centered.</p>

<p>Notice whether the lead teacher kneels or sits to speak with children rather than addressing them from above. It's a small thing, but it shows up consistently in schools where the adults genuinely think from the child's perspective.</p>

<p>None of these will appear on a brochure. But they're the kind of details that tend to matter most once your child is actually there every morning.</p>

<p>Happy to talk through any of this any time — even if Starling isn't where you'll land.</p>

<p>— Fabienne</p>

<p style="font-size:12px;color:#888;">You can unsubscribe at any time with one click: <a href="${escapeHtml(unsubscribeUrl)}">unsubscribe</a></p>
`.trim(),
  };
}
