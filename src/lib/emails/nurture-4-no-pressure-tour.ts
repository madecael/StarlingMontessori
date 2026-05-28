import { escapeHtml } from "./_escape";

export function nurture4(params: { name: string; unsubscribeUrl: string }) {
  const { name, unsubscribeUrl } = params;
  return {
    subject: "Want to drop by Starling without committing?",
    text: [
      `Hi ${name},`,
      "",
      "If you haven't been by yet and are curious, I'd like to offer something with no agenda attached: a 20-minute walkthrough during our morning work cycle.",
      "",
      "You'd come in, move through the classroom at your own pace, and simply watch. There's no presentation, no pitch, no follow-up expected. The morning work cycle is when the classroom is most itself — children choosing their own work, moving quietly, helping each other. It's a good time to see what actually happens here day to day.",
      "",
      "You're welcome to come, see what you see, and choose a different school entirely. That would be fine. I just think it's easier to decide when you've seen a place in motion rather than on a Saturday tour.",
      "",
      "If that sounds useful, just reply and we'll find a time.",
      "",
      "— Fabienne",
      "",
      `You can unsubscribe at any time with one click: ${unsubscribeUrl}`,
    ].join("\n"),
    html: `
<p>Hi ${escapeHtml(name)},</p>

<p>If you haven't been by yet and are curious, I'd like to offer something with no agenda attached: a 20-minute walkthrough during our morning work cycle.</p>

<p>You'd come in, move through the classroom at your own pace, and simply watch. There's no presentation, no pitch, no follow-up expected. The morning work cycle is when the classroom is most itself — children choosing their own work, moving quietly, helping each other. It's a good time to see what actually happens here day to day.</p>

<p>You're welcome to come, see what you see, and choose a different school entirely. That would be fine. I just think it's easier to decide when you've seen a place in motion rather than on a Saturday tour.</p>

<p>If that sounds useful, just reply and we'll find a time.</p>

<p>— Fabienne</p>

<p style="font-size:12px;color:#888;">You can unsubscribe at any time with one click: <a href="${escapeHtml(unsubscribeUrl)}">unsubscribe</a></p>
`.trim(),
  };
}
