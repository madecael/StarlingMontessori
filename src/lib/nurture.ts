export interface NurtureStepDef {
  step: number;
  dueAfterDays: number;
  template: string;  // matches a key in src/lib/emails/
}

export const NURTURE_SCHEDULE: NurtureStepDef[] = [
  { step: 1, dueAfterDays: 3,  template: "nurture-1-tour-prep" },
  { step: 2, dueAfterDays: 7,  template: "nurture-2-parents-questions" },
  { step: 3, dueAfterDays: 21, template: "nurture-3-applications-open" },
  { step: 4, dueAfterDays: 42, template: "nurture-4-no-pressure-tour" },
  { step: 5, dueAfterDays: 70, template: "nurture-5-soft-goodbye" },
];

export interface NurtureContext {
  firstContactAt: string;  // ISO date
  lastNurtureStep: number; // 0 if none sent yet
  now?: Date;              // injectable for tests
}

export function nextNurtureStep(ctx: NurtureContext): NurtureStepDef | null {
  const now = ctx.now ?? new Date();
  const elapsedDays = Math.floor(
    (now.getTime() - new Date(ctx.firstContactAt).getTime()) / 86_400_000,
  );
  const candidate = NURTURE_SCHEDULE.find(
    (s) => s.step === ctx.lastNurtureStep + 1 && elapsedDays >= s.dueAfterDays,
  );
  return candidate ?? null;
}
