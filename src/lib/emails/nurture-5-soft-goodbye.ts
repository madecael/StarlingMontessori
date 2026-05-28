import { escapeHtml } from "./_escape";

export function nurture5(params: { name: string; unsubscribeUrl: string }) {
  const { name, unsubscribeUrl } = params;
  return {
    subject: "We'll stop emailing — but the door is open",
    text: [
      `Hi ${name},`,
      "",
      "This is the last note you'll get from us. We won't reach out again unless you do first.",
      "",
      "I hope the search has gone well, or is going well. Finding the right preschool takes more time and thought than most parents expect, and you've clearly put both into it.",
      "",
      "If you'd find it helpful, I'm happy to send along a short list of schools in DC I'd suggest looking into — regardless of whether Starling is among them. Just reply and say so.",
      "",
      "Wishing your family a good start, wherever you land.",
      "",
      "— Fabienne",
      "",
      `You can unsubscribe at any time with one click: ${unsubscribeUrl}`,
    ].join("\n"),
    html: `
<p>Hi ${escapeHtml(name)},</p>

<p>This is the last note you'll get from us. We won't reach out again unless you do first.</p>

<p>I hope the search has gone well, or is going well. Finding the right preschool takes more time and thought than most parents expect, and you've clearly put both into it.</p>

<p>If you'd find it helpful, I'm happy to send along a short list of schools in DC I'd suggest looking into — regardless of whether Starling is among them. Just reply and say so.</p>

<p>Wishing your family a good start, wherever you land.</p>

<p>— Fabienne</p>

<p style="font-size:12px;color:#888;">You can unsubscribe at any time with one click: <a href="${escapeHtml(unsubscribeUrl)}">unsubscribe</a></p>
`.trim(),
  };
}
