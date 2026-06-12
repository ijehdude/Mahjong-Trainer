import { generatePracticeQuestion } from "@/lib/mahjong/practice";

for (const d of ["beginner", "intermediate", "advanced"] as const) {
  const t0 = performance.now();
  const counts: Record<string, number> = {};
  for (let i = 0; i < 30; i++) {
    const q = generatePracticeQuestion(d);
    counts[q.type] = (counts[q.type] ?? 0) + 1;
    if (!q.correct.length) throw new Error("no correct answer!");
    if (q.options && !q.correct.every((c) => q.options!.some((o) => o.id === c)))
      throw new Error("correct not among options!");
    if (!q.options && !q.correct.every((c) => q.state.players[q.state.humanIndex].hand.includes(c)))
      throw new Error("correct tile not in hand!");
    if (q.explanation.length < 40) throw new Error("explanation too short");
  }
  console.log(d, JSON.stringify(counts), `${((performance.now() - t0) / 30).toFixed(0)}ms/question`);
}
console.log("PRACTICE GENERATOR OK");
