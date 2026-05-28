import { escapeHtml } from "./_escape";

export function nurture2(params: { name: string; unsubscribeUrl: string }) {
  const { name, unsubscribeUrl } = params;
  return {
    subject: "Real questions other parents have asked us",
    text: [
      `Hi ${name},`,
      "",
      "Over the years, a handful of questions come up again and again. Here are three I've heard recently, with honest answers.",
      "",
      "\"Will my child miss out on academics by going Montessori?\"",
      "No — and in some ways the opposite tends to be true. Montessori children often begin reading earlier than their peers because the materials introduce phonics through hands-on work, and writing through drawing and the moveable alphabet before pencils enter the picture. The work is genuinely rigorous; it just doesn't look like worksheets.",
      "",
      "\"What if my child cries at drop-off for the first week?\"",
      "Separation is developmentally normal at this age, and a few tearful mornings don't mean a school is wrong for your child. What matters more is how the adults respond — whether they stay calm, acknowledge the feeling, and gently help the child find their footing. Ask any school you're considering what their approach is. The answer tells you a great deal.",
      "",
      "\"Do I need to commit to Montessori all the way through elementary?\"",
      "No. Many families choose a Montessori primary program (ages 3–6) and then transition to a different school for elementary. That said, understanding the three-year primary cycle — the reason Montessori classrooms span three ages together — can help you think through timing. Happy to explain that if it's useful.",
      "",
      "If you have your own question, just reply. I read every one.",
      "",
      "— Fabienne",
      "",
      `You can unsubscribe at any time with one click: ${unsubscribeUrl}`,
    ].join("\n"),
    html: `
<p>Hi ${escapeHtml(name)},</p>

<p>Over the years, a handful of questions come up again and again. Here are three I've heard recently, with honest answers.</p>

<p><strong>"Will my child miss out on academics by going Montessori?"</strong><br>
No — and in some ways the opposite tends to be true. Montessori children often begin reading earlier than their peers because the materials introduce phonics through hands-on work, and writing through drawing and the moveable alphabet before pencils enter the picture. The work is genuinely rigorous; it just doesn't look like worksheets.</p>

<p><strong>"What if my child cries at drop-off for the first week?"</strong><br>
Separation is developmentally normal at this age, and a few tearful mornings don't mean a school is wrong for your child. What matters more is how the adults respond — whether they stay calm, acknowledge the feeling, and gently help the child find their footing. Ask any school you're considering what their approach is. The answer tells you a great deal.</p>

<p><strong>"Do I need to commit to Montessori all the way through elementary?"</strong><br>
No. Many families choose a Montessori primary program (ages 3–6) and then transition to a different school for elementary. That said, understanding the three-year primary cycle — the reason Montessori classrooms span three ages together — can help you think through timing. Happy to explain that if it's useful.</p>

<p>If you have your own question, just reply. I read every one.</p>

<p>— Fabienne</p>

<p style="font-size:12px;color:#888;">You can unsubscribe at any time with one click: <a href="${escapeHtml(unsubscribeUrl)}">unsubscribe</a></p>
`.trim(),
  };
}
