/** Deterministic, job-related scoring. These percentages are fit indicators, not hiring probabilities. */
export function percent(value: number) {
  return Number.isFinite(value) ? Math.round(Math.max(0, Math.min(100, value)) * 10) / 10 : 0;
}

const aliases: Record<string, string> = { 'js': 'javascript', 'ts': 'typescript', 'react.js': 'react', 'reactjs': 'react', 'node.js': 'nodejs', 'postgres': 'postgresql', 'ms excel': 'excel', 'microsoft excel': 'excel' };
export function normalizeSkill(skill: string) {
  const value = skill.trim().toLowerCase().replace(/\s+/g, ' ');
  return aliases[value] ?? value;
}
export function skillOverlap(candidateSkills: string[], required: string[]) {
  const candidates = new Set(candidateSkills.map(normalizeSkill));
  const unique = [...new Map(required.filter(s => s.trim()).map(s => [normalizeSkill(s), s.trim()])).values()];
  return {
    matchedSkills: unique.filter(s => candidates.has(normalizeSkill(s))),
    missingSkills: unique.filter(s => !candidates.has(normalizeSkill(s))),
  };
}
export function calculateMatch(similarity: number, candidateSkills: string[], required: string[], experienceYears: number, minimumYears: number) {
  const overlap = skillOverlap(candidateSkills, required);
  const count = overlap.matchedSkills.length + overlap.missingSkills.length;
  const semantic = percent(similarity);
  const skills = count ? percent(overlap.matchedSkills.length / count * 100) : 0;
  const experience = minimumYears > 0 ? percent(experienceYears / minimumYears * 100) : 100;
  // Redistribute the skills weight when the job has no required skills.
  const overall = count ? percent(semantic * .55 + skills * .30 + experience * .15) : percent((semantic * .55 + experience * .15) / .70);
  return { ...overlap, semantic, skills, experience, overall };
}

export function combineEvidence(match: number | null, assessment: number | null, interview: number | null) {
  const evidence = [
    { label: 'Job match', score: match, weight: 40 },
    { label: 'Completed assessments', score: assessment, weight: 30 },
    { label: 'Completed interviews', score: interview, weight: 30 },
  ];
  const available = evidence.filter(e => e.score !== null);
  const totalWeight = available.reduce((sum, e) => sum + e.weight, 0);
  const overall = totalWeight ? percent(available.reduce((sum, e) => sum + percent(e.score!) * e.weight, 0) / totalWeight) : null;
  return { evidence, overall, complete: available.length === evidence.length,
    recommendation: overall === null ? 'Awaiting evidence' : available.length < 3 ? 'Evaluation incomplete — review available evidence' : overall >= 80 ? 'Recommend advancing to human review' : overall >= 60 ? 'Review gaps before advancing' : 'Significant gaps — human review required' };
}
