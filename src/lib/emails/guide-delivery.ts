export function guideDeliveryEmail(params: { name: string; pdfUrl: string }) {
  const { name, pdfUrl } = params;
  return {
    subject: "Your Preschool Decision Guide",
    text: [
      `Hi ${name},`,
      "",
      "Here is the Preschool Decision Guide you asked for:",
      pdfUrl,
      "",
      "It's a 12-page walkthrough of how parents in Capitol Hill, Brookland, and Eastern Market are choosing preschools — questions to ask, signs to watch for, and a few honest thoughts about what tuition typically includes.",
      "",
      "If anything sparks a question, just reply to this email. We're happy to help even if Starling isn't the right fit for you.",
      "",
      "Warmly,",
      "Fabienne",
      "Starling Montessori School",
    ].join("\n"),
    html: `
      <p>Hi ${escapeHtml(name)},</p>
      <p>Here is the Preschool Decision Guide you asked for:</p>
      <p><a href="${pdfUrl}">Download the Decision Guide (PDF)</a></p>
      <p>It's a 12-page walkthrough of how parents in Capitol Hill, Brookland, and Eastern Market are choosing preschools — questions to ask, signs to watch for, and a few honest thoughts about what tuition typically includes.</p>
      <p>If anything sparks a question, just reply to this email. We're happy to help even if Starling isn't the right fit for you.</p>
      <p>Warmly,<br>Fabienne<br>Starling Montessori School</p>
    `,
  };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[c]!);
}
