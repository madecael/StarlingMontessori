import schoolsByZip from "../data/comparable-schools.json";

export interface QuizAnswers {
  name: string;
  email: string;
  startDate: "summer_2026" | "fall_2026" | "fall_2027" | "exploring";
  childAge: "18_24m" | "2_3" | "3_4" | "4_5" | "5_plus";
  schedule: "half_day" | "full_day" | "flexible" | "not_sure";
  visitsSoFar: "none" | "1_2" | "three_plus" | "online_only";
  montessoriInterest: "sold" | "curious_comparing" | "open_multiple" | "prefer_other";
  topConcern: "right_fit" | "timing" | "cost" | "separation" | "all";
  zip: string;
}

export interface TimelineStep { label: string; period: string; }
export interface SchoolEntry { name: string; philosophy: string; neighborhood: string; url: string; }

export interface Roadmap {
  timeline: TimelineStep[];
  priorities: string[];
  schools: (SchoolEntry & { isStarling?: boolean })[];
  nextStep: string;
  zipFallback: boolean;
}

const STARLING_ENTRY: SchoolEntry & { isStarling: true } = {
  name: "Starling Montessori School",
  philosophy: "Montessori (AMI-trained guides)",
  neighborhood: "Capitol Hill",
  url: "https://starlingmontessorischool.com",
  isStarling: true,
};

function timelineFor(startDate: QuizAnswers["startDate"]): TimelineStep[] {
  switch (startDate) {
    case "summer_2026":
      return [
        { label: "Apply now — limited seats remain", period: "This month" },
        { label: "Confirm acceptance + deposit", period: "Within 4 weeks" },
        { label: "Family orientation", period: "1 month before start" },
        { label: "First day", period: "August 2026" },
      ];
    case "fall_2026":
      return [
        { label: "Tour 2–3 schools", period: "Now – July" },
        { label: "Submit applications", period: "June – July" },
        { label: "Confirm acceptance + deposit", period: "July – August" },
        { label: "First day", period: "August 2026" },
      ];
    case "fall_2027":
      return [
        { label: "Begin touring schools", period: "Fall 2026" },
        { label: "Narrow to top 3 + revisit", period: "Winter 2026/27" },
        { label: "Submit applications", period: "Spring 2027" },
        { label: "First day", period: "August 2027" },
      ];
    case "exploring":
      return [
        { label: "Read up on philosophies (this guide can help)", period: "Now" },
        { label: "Tour a few schools to calibrate", period: "Next 1–2 months" },
        { label: "Narrow your shortlist when timing is clearer", period: "When ready" },
      ];
  }
}

function nextStepFor(visits: QuizAnswers["visitsSoFar"]): string {
  switch (visits) {
    case "none":
    case "online_only":
      return "Start by visiting 2–3 schools across different philosophies. The contrast helps calibrate your gut.";
    case "1_2":
      return "Visit 1–2 more, then narrow to your top 3 for a closer second look.";
    case "three_plus":
      return "You're ready to apply. Confirm tuition, ratios, and acceptance timelines with your top 3.";
  }
}

function prioritiesFor(answers: QuizAnswers): string[] {
  const out: string[] = [];
  if (answers.topConcern === "right_fit" || answers.topConcern === "all") {
    out.push("Spend time watching the children, not just the space. A good fit shows in the room.");
  }
  if (answers.topConcern === "timing" || answers.topConcern === "all") {
    out.push("Ask each school for their exact application timeline in writing — DC schools vary widely.");
  }
  if (answers.topConcern === "cost" || answers.topConcern === "all") {
    out.push("Ask what tuition includes — lunches, supplies, materials fees, and deposits add up.");
  }
  if (answers.topConcern === "separation" || answers.topConcern === "all") {
    out.push("Ask how the school handles separation in the first weeks. The answer reveals their relational style.");
  }
  if (answers.montessoriInterest === "curious_comparing" || answers.montessoriInterest === "open_multiple") {
    out.push("Tour at least one non-Montessori school so you have something to compare against.");
  }
  return out;
}

export function composeRoadmap(answers: QuizAnswers): Roadmap {
  const byZip = schoolsByZip as Record<string, SchoolEntry[]>;
  const direct = byZip[answers.zip];
  let nearby: SchoolEntry[];
  let zipFallback = false;
  if (direct && direct.length > 0) {
    nearby = direct;
  } else {
    // Fallback: flatten all and pick first 3
    nearby = Object.values(byZip).flat().slice(0, 3);
    zipFallback = true;
  }
  const schools: (SchoolEntry & { isStarling?: boolean })[] = [STARLING_ENTRY, ...nearby.slice(0, 3)];

  return {
    timeline: timelineFor(answers.startDate),
    priorities: prioritiesFor(answers),
    schools,
    nextStep: nextStepFor(answers.visitsSoFar),
    zipFallback,
  };
}
