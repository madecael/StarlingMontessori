import { escapeHtml } from "./_escape";

export function nurture3(params: { name: string; unsubscribeUrl: string }) {
  const { name, unsubscribeUrl } = params;
  return {
    subject: "A note on application timing",
    text: [
      `Hi ${name},`,
      "",
      "A practical note on DC application timelines, in case it's useful for your planning.",
      "",
      "Several preschools in the area close fall applications in May or early June. This doesn't reflect how many seats remain — it's simply when their enrollment teams wrap up the process for the year. If you have schools on your shortlist that you haven't yet formally contacted, mid-May to early June is typically when confirming your interest matters.",
      "",
      "Schools where deadlines tend to come early include Capitol Hill Day School, Sidwell Friends' Early Childhood program, National Child Research Center, and Beauvoir. Each has its own process, and it's worth calling or emailing directly to ask where they are in their cycle for next fall.",
      "",
      "Starling's process is rolling, so there's no single deadline, but I mention the others because I'd rather you not miss a school that was on your list.",
      "",
      "If you'd like to talk through your shortlist, I'm available.",
      "",
      "— Fabienne",
      "",
      `You can unsubscribe at any time with one click: ${unsubscribeUrl}`,
    ].join("\n"),
    html: `
<p>Hi ${escapeHtml(name)},</p>

<p>A practical note on DC application timelines, in case it's useful for your planning.</p>

<p>Several preschools in the area close fall applications in May or early June. This doesn't reflect how many seats remain — it's simply when their enrollment teams wrap up the process for the year. If you have schools on your shortlist that you haven't yet formally contacted, mid-May to early June is typically when confirming your interest matters.</p>

<p>Schools where deadlines tend to come early include Capitol Hill Day School, Sidwell Friends' Early Childhood program, National Child Research Center, and Beauvoir. Each has its own process, and it's worth calling or emailing directly to ask where they are in their cycle for next fall.</p>

<p>Starling's process is rolling, so there's no single deadline, but I mention the others because I'd rather you not miss a school that was on your list.</p>

<p>If you'd like to talk through your shortlist, I'm available.</p>

<p>— Fabienne</p>

<p style="font-size:12px;color:#888;">You can unsubscribe at any time with one click: <a href="${escapeHtml(unsubscribeUrl)}">unsubscribe</a></p>
`.trim(),
  };
}
