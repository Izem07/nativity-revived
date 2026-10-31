import { globalKeyPool, speedConfig } from './keyPoolService';

// ==========================================
// PASSAGE STUDY — AP Lang Section I practice test
// Gemini writes an original nonfiction passage plus 10 AP-style reading questions.
// ==========================================

export const PASSAGE_QUESTION_COUNT = 10;
export const PASSAGE_CHOICE_COUNT = 5;

export type PassageType = 'Speech' | 'Essay' | 'Letter' | 'Editorial';
export const PASSAGE_TYPES: PassageType[] = ['Speech', 'Essay', 'Letter', 'Editorial'];

export interface PassageQuestion {
  question: string;
  choices: string[];
  correctIndex: number;
  // AP skill category, e.g. "Rhetorical Situation", "Claims & Evidence"
  skill: string;
  explanation: string;
}

export interface PassageTest {
  title: string;
  author: string;
  // AP-style italic intro line: "The following passage is adapted from..."
  context: string;
  paragraphs: string[];
  questions: PassageQuestion[];
  passageType: PassageType;
  topic: string;
  generatedAt: number;
}

const CACHE_KEY = 'NATIVITY_PASSAGE_TEST_LAST';

export function getCachedPassageTest(): PassageTest | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PassageTest;
    return isValidPassageTest(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function setCachedPassageTest(test: PassageTest): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(test));
  } catch {
    // Ignore storage quota errors
  }
}

function isValidPassageTest(t: any): t is PassageTest {
  return (
    t &&
    Array.isArray(t.paragraphs) &&
    t.paragraphs.length > 0 &&
    Array.isArray(t.questions) &&
    t.questions.length > 0 &&
    t.questions.every(
      (q: any) =>
        typeof q?.question === 'string' &&
        Array.isArray(q.choices) &&
        q.choices.length >= 2 &&
        Number.isInteger(q.correctIndex) &&
        q.correctIndex >= 0 &&
        q.correctIndex < q.choices.length
    )
  );
}

export async function generatePassageTest(options: {
  passageType: PassageType;
  topic?: string;
  // Optional words from the student's other study sets to weave into the passage
  vocabularyHints?: string[];
}): Promise<PassageTest> {
  const { passageType } = options;
  const topic = (options.topic || '').trim();
  const hints = (options.vocabularyHints || []).filter(Boolean).slice(0, 8);

  const prompt = `You write practice material for the AP English Language and Composition exam, Section I (Reading).

Write ONE original nonfiction ${passageType.toLowerCase()} and ${PASSAGE_QUESTION_COUNT} multiple-choice questions about it.

PASSAGE
- ${topic ? `Topic: ${topic}.` : 'Choose a substantive public-interest topic (civic life, education, science, labor, the arts, technology, nature).'}
- 450 to 650 words, 5 to 8 paragraphs, written in a clear argumentative voice with a discernible line of reasoning.
- Use deliberate rhetorical choices AP questions can target: a concession or counterargument, a shift in tone, an analogy or extended metaphor, varied syntax, appeals to the audience's values.
- The text must be ORIGINAL. Invent a plausible author and setting; do not reproduce or attribute it to a real person.
${hints.length ? `- Where it reads naturally, use some of these words: ${hints.join(', ')}.` : ''}
- "context" is a one-sentence italic-style introduction like the real exam uses, e.g. "The following passage is adapted from a 1912 address by a labor organizer to a gathering of factory owners."

QUESTIONS
- Exactly ${PASSAGE_QUESTION_COUNT} questions, each with exactly ${PASSAGE_CHOICE_COUNT} answer choices.
- Model them on real AP Lang reading questions. Cover a mix of skills:
  "Rhetorical Situation" (purpose, audience, exigence), "Claims & Evidence", "Reasoning & Organization" (function of a paragraph, line of reasoning, shifts), "Style" (diction, syntax, tone, figurative language).
- Refer to locations by paragraph number, e.g. "In paragraph 3, the author's reference to ... primarily serves to".
- Wrong choices must be plausible: partially true, too broad, too extreme, or true of a different paragraph. Exactly one choice is best.
- Choices are plain text with no letter prefixes.
- Spread correct answers across positions 0 to ${PASSAGE_CHOICE_COUNT - 1}.
- "explanation" says why the answer is right and briefly why the strongest distractor is wrong.

Return ONLY JSON with this shape:
{
  "title": string,
  "author": string,
  "context": string,
  "paragraphs": string[],
  "questions": [
    { "question": string, "choices": string[], "correctIndex": number, "skill": string, "explanation": string }
  ]
}`;

  const parsed = await globalKeyPool.executeWithRotation(async (genAI, _key, fallbackModel, signal) => {
    const modelName = fallbackModel || 'gemini-3.8-flash';
    const model = genAI.getGenerativeModel({
      model: modelName,
      // Lower thinking answers sooner; dropped automatically if a model rejects it
      generationConfig: { responseMimeType: 'application/json', temperature: 0.9, ...speedConfig(modelName) }
    });
    const result = await model.generateContent(prompt, { signal });
    const text = result.response.text().trim().replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
    try {
      return JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
      throw new Error('Gemini returned a malformed test. Please try again.');
    }
  });

  const questions: PassageQuestion[] = (Array.isArray(parsed?.questions) ? parsed.questions : [])
    .map((q: any) => ({
      question: String(q?.question || '').trim(),
      choices: (Array.isArray(q?.choices) ? q.choices : [])
        .map((c: any) => String(c).replace(/^\(?[A-E][).:]\s+/, '').trim())
        .filter(Boolean),
      correctIndex: Number(q?.correctIndex),
      skill: String(q?.skill || 'Reading').trim(),
      explanation: String(q?.explanation || '').trim()
    }))
    // Drop malformed questions rather than showing an unanswerable one
    .filter(
      (q: PassageQuestion) =>
        q.question &&
        q.choices.length >= 2 &&
        Number.isInteger(q.correctIndex) &&
        q.correctIndex >= 0 &&
        q.correctIndex < q.choices.length
    );

  const paragraphs: string[] = (Array.isArray(parsed?.paragraphs) ? parsed.paragraphs : [])
    .map((p: any) => String(p).trim())
    .filter(Boolean);

  if (paragraphs.length === 0 || questions.length < 5) {
    throw new Error('Gemini returned an incomplete test. Please try again.');
  }

  const test: PassageTest = {
    title: String(parsed?.title || 'Practice Passage').trim(),
    author: String(parsed?.author || '').trim(),
    context: String(parsed?.context || '').trim(),
    paragraphs,
    questions: questions.slice(0, PASSAGE_QUESTION_COUNT),
    passageType,
    topic,
    generatedAt: Date.now()
  };
  setCachedPassageTest(test);
  return test;
}
