import { globalKeyPool } from './keyPoolService';

export interface SoapstoneData {
  speaker: string;
  occasion: string;
  audience: string;
  purpose: string;
  subject: string;
  tone: string;
}

export interface StructuralSection {
  sectionTitle: string;
  linesOrExcerpt: string;
  summary: string;
  rhetoricalMove: string;
}

export interface RhetoricalStrategyItem {
  term: string;
  quote: string;
  functionalAnalysis: string;
  effectOnAudience: string;
}

export interface PassageQuizQuestion {
  question: string;
  options: string[];
  correct: number;
  rationale: string;
}

export interface EssayScaffold {
  defensibleThesis: string;
  bodyParagraphIdeas: {
    deviceOrChoice: string;
    topicSentence: string;
    lineOfReasoningConnection: string;
  }[];
}

export interface APPassageStudyPacket {
  title: string;
  author: string;
  historicalContext: string;
  passageText: string;
  soapstone: SoapstoneData;
  structuralMapping: StructuralSection[];
  rhetoricalStrategies: RhetoricalStrategyItem[];
  mcqQuestions: PassageQuizQuestion[];
  essayScaffold: EssayScaffold;
  targetTermsFound: string[];
  generatedAt: string;
}

export interface PreloadedPassage {
  id: string;
  title: string;
  author: string;
  year: string;
  description: string;
  text: string;
}

export const PRELOADED_AP_PASSAGES: PreloadedPassage[] = [
  {
    id: 'florence-kelley',
    title: 'Speech on Child Labor at NAWSA Convention',
    author: 'Florence Kelley',
    year: '1905',
    description: 'Iconic AP Lang exam prompt. A relentless ethical appeal against child labor and disenfranchisement.',
    text: `We have, in this country, two million children under the age of sixteen years who are earning their bread. They vary in age from six and seven years (in the cotton mills of Georgia) and eight, nine and ten years (in the coal-breakers of Pennsylvania), to the larger girls and boys who work in the steam laundries and sweatshops.

No other portion of the wage-earning class increases so rapidly from decade to decade as the young girls from fourteen to twenty years. Men increase in the labor market by tens of thousands, but young girls increase by hundreds of thousands.

A little girl, on her twelfth birthday, could go to the mill in Georgia, work eleven hours a day, by day or by night, and receive her small pittance. If the mothers also had the vote, do you believe that this monstrous condition could endure?

Tonight while we sleep, several thousand little girls will be working in textile mills, all the night through, in the deafening noise of the spindles and the looms. They are working that we may have cheap cotton, cheap lace, cheap ribbons. If we were freed from the disfranchisement that cripples us, would we allow our sisters to be thus sacrificed?`,
  },
  {
    id: 'jfk-inaugural',
    title: 'Inaugural Address',
    author: 'John F. Kennedy',
    year: '1961',
    description: 'Celebrated for masterclass syntactic schemes: chiasmus, antithesis, parallelism, and anaphora.',
    text: `We observe today not a victory of party, but a celebration of freedom—symbolizing an end, as well as a beginning—signifying renewal, as well as change. For I have sworn before you and Almighty God the same solemn oath our forebears prescribed nearly a century and three-quarters ago.

The world is very different now. For man holds in his mortal hands the power to abolish all forms of human poverty and all forms of human life. And yet the same revolutionary beliefs for which our forebears fought are still at issue around the globe—the belief that the rights of man come not from the generosity of the state, but from the hand of God.

Let every nation know, whether it wishes us well or ill, that we shall pay any price, bear any burden, meet any hardship, support any friend, oppose any foe, in order to assure the survival and the success of liberty.

Let us never negotiate out of fear, but let us never fear to negotiate.

And so, my fellow Americans: ask not what your country can do for you—ask what you can do for your country.`,
  },
  {
    id: 'queen-elizabeth',
    title: 'Speech to the Troops at Tilbury',
    author: 'Queen Elizabeth I',
    year: '1588',
    description: 'A legendary masterclass in establishing persona, royal ethos, and inspiring martial resolve.',
    text: `My loving people,

We have been persuaded by some that are careful of our safety, to take heed how we commit ourselves to armed multitudes, for fear of treachery; but I assure you I do not desire to live to distrust my faithful and loving people. Let tyrants fear, I have always so behaved myself that, under God, I have placed my chiefest strength and safeguard in the loyal hearts and good-will of my subjects.

I know I have the body but of a weak and feeble woman; but I have the heart and stomach of a king, and of a king of England too, and think foul scorn that Parma or Spain, or any prince of Europe, should dare to invade the borders of my realm; to which rather than any dishonour shall grow by me, I myself will take up arms, I myself will be your general, judge, and rewarder of every one of your virtues in the field.

I know already, for your forwardness you have deserved rewards and crowns; and we do assure you on a word of a prince, they shall be duly paid.`,
  },
  {
    id: 'lincoln-second-inaugural',
    title: 'Second Inaugural Address',
    author: 'Abraham Lincoln',
    year: '1865',
    description: 'Profound biblical allusion, elevated parallelism, and compassionate national reconciliation.',
    text: `At this second appearing to take the oath of the presidential office, there is less occasion for an extended address than there was at the first. Then a statement, somewhat in detail, of a course to be pursued, seemed fitting and proper. Now, at the expiration of four years, during which public declarations have been constantly called forth on every point and phase of the great contest which still absorbs the attention and engrosses the energies of the nation, little that is new could be presented.

Both parties deprecated war; but one of them would make war rather than let the nation survive; and the other would accept war rather than let it perish. And the war came.

With malice toward none; with charity for all; with firmness in the right, as God gives us to see the right, let us strive on to finish the work we are in; to bind up the nation's wounds; to care for him who shall have borne the battle, and for his widow, and his orphan—to do all which may achieve and cherish a just and lasting peace among ourselves, and with all nations.`,
  },
];

// Helper to parse JSON from AI response
const extractJson = (text: string): any => {
  const match = text.match(/```json\n([\s\S]*?)\n```|({[\s\S]*})/);
  if (match && (match[1] || match[2])) {
    try {
      return JSON.parse(match[1] || match[2]);
    } catch (e) {
      console.error('Failed to parse matched JSON block:', e);
    }
  }
  return JSON.parse(text);
};

export interface GeneratePacketOptions {
  passageText: string;
  passageTitle?: string;
  passageAuthor?: string;
  targetRhetoricalTerms?: string[];
  targetVocabulary?: string[];
}

export async function generateAPPassageStudyPacket(
  options: GeneratePacketOptions
): Promise<APPassageStudyPacket> {
  const { passageText, passageTitle, passageAuthor, targetRhetoricalTerms = [], targetVocabulary = [] } = options;

  const termsInstruction = targetRhetoricalTerms.length
    ? `\nCRITICAL AP LANG OBJECTIVE: Specifically evaluate whether and how the author employs any of these studied rhetorical terms: ${targetRhetoricalTerms.join(
        ', '
      )}. In the "rhetoricalStrategies" list, prioritize these target devices whenever applicable.`
    : '';

  const vocabInstruction = targetVocabulary.length
    ? `\nVocabulary in Context: When crafting the multiple choice questions and analyses, incorporate or assess the comprehension of these words: ${targetVocabulary.join(
        ', '
      )}.`
    : '';

  const prompt = `You are a premier Chief Reader and Curriculum Director for AP English Language & Composition and College English 101.
Analyze this passage with deep rhetorical rigor and produce an exhaustive, publication-grade study packet in JSON format.

Passage Info:
Title: ${passageTitle || 'Selected Passage'}
Author: ${passageAuthor || 'Author'}
Text:
"""
${passageText}
"""
${termsInstruction}
${vocabInstruction}

Produce JSON matching this exact structure:
{
  "title": "${passageTitle || 'Selected Excerpt'}",
  "author": "${passageAuthor || 'Author'}",
  "historicalContext": "Concise 2-3 sentence background explaining exigence, era, and historical backdrop.",
  "soapstone": {
    "speaker": "Speaker's persona, credibility (ethos), and perspective",
    "occasion": "Historical setting and immediate exigence triggering this text",
    "audience": "Target audience, their values, doubts, and expectations",
    "purpose": "Author's ultimate persuasive intention (to convince, urge, condemn, etc.)",
    "subject": "Core thesis and overarching topical argument",
    "tone": "Primary tone adjectives and key emotional shifts across the text"
  },
  "structuralMapping": [
    {
      "sectionTitle": "Section name (e.g. Lines 1-10: The Hook & Shared Premise)",
      "linesOrExcerpt": "Key opening quote or phrase",
      "summary": "What the author argues here",
      "rhetoricalMove": "Strategic rhetorical purpose of this move"
    }
  ],
  "rhetoricalStrategies": [
    {
      "term": "Rhetorical Device (e.g., Chiasmus, Anaphora, Polysyndeton)",
      "quote": "Exact quoted sentence from the text demonstrating the device",
      "functionalAnalysis": "Rigorous AP Lang analysis of how this device functions syntactically or emotionally",
      "effectOnAudience": "Psychological/persuasive effect on the audience"
    }
  ],
  "mcqQuestions": [
    {
      "question": "AP Lang Section I style question testing rhetorical function, line of reasoning, or tone",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "rationale": "Detailed explanation of why Option A is correct and why the distractors are flawed"
    }
  ],
  "essayScaffold": {
    "defensibleThesis": "Sophisticated, non-formulaic AP Lang FRQ 2 thesis template for this passage",
    "bodyParagraphIdeas": [
      {
        "deviceOrChoice": "Rhetorical Strategy 1",
        "topicSentence": "Model analytical topic sentence linking choice to purpose",
        "lineOfReasoningConnection": "How this connects to the overarching thesis"
      }
    ]
  },
  "targetTermsFound": ["list of target terms identified"]
}

Ensure all fields are fully populated with scholarly AP Lang rigor. Do not return markdown outside the json block.`;

  return await globalKeyPool.executeWithRotation(async (genAI, _key, fallbackModel) => {
    const model = genAI.getGenerativeModel({ model: fallbackModel || 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const data = extractJson(text);

    return {
      title: data.title || passageTitle || 'AP Lang Rhetorical Excerpt',
      author: data.author || passageAuthor || 'Speaker',
      historicalContext: data.historicalContext || '',
      passageText,
      soapstone: data.soapstone || {
        speaker: '',
        occasion: '',
        audience: '',
        purpose: '',
        subject: '',
        tone: '',
      },
      structuralMapping: data.structuralMapping || [],
      rhetoricalStrategies: data.rhetoricalStrategies || [],
      mcqQuestions: data.mcqQuestions || [],
      essayScaffold: data.essayScaffold || { defensibleThesis: '', bodyParagraphIdeas: [] },
      targetTermsFound: data.targetTermsFound || [],
      generatedAt: new Date().toISOString(),
    };
  });
}

// Local cache storage helpers for passage study packets
const PASSAGE_CACHE_PREFIX = 'passage_study_cache_';

export function getCachedPassageStudy(passageHash: string): APPassageStudyPacket | null {
  try {
    const raw = localStorage.getItem(PASSAGE_CACHE_PREFIX + passageHash);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedPassageStudy(passageHash: string, packet: APPassageStudyPacket): void {
  try {
    localStorage.setItem(PASSAGE_CACHE_PREFIX + passageHash, JSON.stringify(packet));
  } catch {
    // Ignore storage quota
  }
}

export function computePassageHash(text: string, title?: string): string {
  const combined = (title || '') + text.slice(0, 100).toLowerCase().replace(/\s+/g, '');
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0;
  }
  return String(Math.abs(hash));
}
