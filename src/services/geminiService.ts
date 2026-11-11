import { GoogleGenerativeAI } from '@google/generative-ai';
import { FlashcardItem } from '../components/Flashcards';
import { MatchingPair } from '../components/Matching';
import { ParagraphData } from '../components/ParagraphPractice';
import { QuizQuestion } from '../components/Quiz';
import { globalKeyPool, speedConfig } from './keyPoolService';

export const getStoredAPIKey = (): string => {
  const storedKey = localStorage.getItem('GEMINI_API_KEY');
  if (storedKey && storedKey.trim()) {
    return storedKey.trim();
  }

  const envKey = import.meta.env.VITE_GEMINI_API_KEY as string;
  if (envKey && envKey !== 'your_api_key_here') {
    return envKey.trim();
  }

  return '';
};

// Initialize the Gemini API
export const getAPIKey = () => {
  const key = getStoredAPIKey();
  if (key) return key;
  throw new Error('Please provide a valid Google Gemini API key');
};

// Helper function to extract and parse JSON from a string that might include markdown fences
const extractAndParseJson = (text: string) => {
  const match = text.match(/```json\n([\s\S]*?)\n```|({[\s\S]*})|(\[[\s\S]*\])/);
  if (match && (match[1] || match[2] || match[3])) {
    try {
      return JSON.parse(match[1] || match[2] || match[3]);
    } catch (e) {
      console.error("Failed to parse extracted JSON:", e);
      console.error("Original text:", text);
      throw new Error("The AI returned a malformed JSON response.");
    }
  }

  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse the full response text as JSON:", e);
    console.error("Original text:", text);
    throw new Error("The AI response was not in the expected JSON format.");
  }
};

export const generateQuizContent = async (
  vocabularyList: string[],
  difficulty: 'easy' | 'standard' | 'hard' = 'standard'
): Promise<QuizGenerationResult> => {
  return globalKeyPool.executeWithRotation(async (genAI, _key, fallbackModel, signal) => {
    const modelName = fallbackModel || 'gemini-3.8-flash';
    const model = genAI.getGenerativeModel({
      model: modelName,
      // JSON mode avoids malformed replies; lower thinking answers sooner and temperature provides high factual accuracy
      generationConfig: { responseMimeType: 'application/json', ...speedConfig(modelName) }
    });
    const vocabString = vocabularyList.join(', ');

    let quizDifficultyDirective = 'Make questions balanced AP English Language style questions with realistic distractors.';
    let paragraphDifficultyDirective = 'Use engaging, balanced AP Lang level prose with vivid and distinctive context clues so the missing word is logical and identifiable.';

    if (difficulty === 'easy') {
      quizDifficultyDirective = 'Make questions straightforward with clear context clues and distinct, recognizable contrasts between the correct word and distractors.';
      paragraphDifficultyDirective = 'Use clear sentence structures with direct, unmistakable context clues so the target word is straightforwardly identifiable.';
    } else if (difficulty === 'hard') {
      quizDifficultyDirective = 'Make questions very challenging AP-tier questions with subtle, sophisticated distinctions between nuanced options.';
      paragraphDifficultyDirective = 'Use complex, elevated academic prose where subtle rhetorical clues and analytical tone identify the missing word.';
    }

    // Consolidated prompt: Generates Quiz, Flashcards, Matching, and Paragraph in ONE single API request (75% savings in key usage)
    const combinedPrompt = `You are an elite AP English Language & Composition instructor creating a comprehensive study packet for these vocabulary words: ${vocabString}.
Difficulty Level: ${difficulty}.
Quiz Directive: ${quizDifficultyDirective}
Passage Directive: ${paragraphDifficultyDirective}

Return a single JSON object containing ALL 4 modules:
1. "questions": 10 multiple-choice quiz questions. Each question must have:
   - "question": A sentence with a ___ blank where the word belongs
   - "options": Array of 4 distinct choices (1 correct, 3 plausible distractors)
   - "correct": Index (0, 1, 2, or 3) of the correct answer
   - "word": The target vocabulary word
2. "flashcards": Flashcards for each word in the vocabulary list. Each must have all 8 fields:
   - "word": string
   - "definition": clear, concise definition
   - "synonyms": "syn1, syn2, syn3"
   - "antonyms": "ant1, ant2, ant3"
   - "context": a sentence showing typical usage context
   - "etymology": word origin and root meaning
   - "example": an example sentence using the word
   - "mnemonic": a creative, memorable trick, rhyme, or association
3. "pairs": Matching pairs for each word with:
   - "word": vocabulary word
   - "definition": concise 5-10 word definition
4. "paragraph": A continuous, unified passage incorporating the vocabulary words:
   - "paragraph": An authentic, coherent narrative or argument where EACH sentence containing a vocabulary word contains EXACTLY ONE target vocabulary word marked in **bold** (e.g. **candid**). Smooth transitions between sentences.
   - "questions": 3-4 comprehension questions with "question" and "answer"

Format response strictly as JSON with this structure:
{
  "questions": [
    { "question": "...", "options": ["..."], "correct": 0, "word": "..." }
  ],
  "flashcards": [
    { "word": "...", "definition": "...", "synonyms": "...", "antonyms": "...", "context": "...", "etymology": "...", "example": "...", "mnemonic": "..." }
  ],
  "pairs": [
    { "word": "...", "definition": "..." }
  ],
  "paragraph": {
    "paragraph": "...",
    "questions": [
      { "question": "...", "answer": "..." }
    ]
  }
}`;

    const result = await model.generateContent(combinedPrompt, { signal });
    const data = extractAndParseJson(result.response.text());

    return {
      quiz: data.questions || data.quiz || [],
      flashcards: data.flashcards || [],
      matching: data.pairs || data.matching || [],
      paragraph: data.paragraph || { paragraph: '', questions: [] }
    };
  });
};

// Checks a key by listing models instead of generating content: no quota used, no model load
// to wait on, and it answers in well under a second.
const KEY_TEST_TIMEOUT_MS = 8000;

export const testAPIKey = async (candidateKey?: string): Promise<{ valid: boolean; error?: string }> => {
  const key = candidateKey ? candidateKey.trim() : getStoredAPIKey();
  if (!key) return { valid: false, error: "No API key provided" };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), KEY_TEST_TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=${encodeURIComponent(key)}`,
      { signal: controller.signal }
    );
    if (res.ok) return { valid: true };

    // Rate-limited means the key itself is real
    if (res.status === 429) return { valid: true };

    const body = await res.json().catch(() => null);
    const reason: string = body?.error?.details?.find((d: any) => d?.reason)?.reason || '';
    if (reason === 'API_KEY_INVALID' || res.status === 400) {
      return { valid: false, error: "That key isn't valid. Copy it again from Google AI Studio." };
    }
    if (res.status === 403) {
      return { valid: false, error: "This key doesn't have access to the Gemini API. Create one in Google AI Studio." };
    }
    return { valid: false, error: body?.error?.message || `Verification failed (HTTP ${res.status}).` };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return { valid: false, error: "Google didn't respond in time. Check your connection and try again." };
    }
    return { valid: false, error: "Couldn't reach Google. Check your connection and try again." };
  } finally {
    clearTimeout(timeoutId);
  }
};

export interface QuizGenerationResult {
  quiz: QuizQuestion[];
  flashcards: FlashcardItem[];
  matching: MatchingPair[];
  paragraph: ParagraphData;
}

export const generateMoreQuizQuestions = async (
  vocabularyList: string[],
  difficulty: 'easy' | 'standard' | 'medium' | 'hard' | 'custom' = 'standard',
  customTopic: string = ''
): Promise<QuizQuestion[]> => {
  return globalKeyPool.executeWithRotation(async (genAI, _key, fallbackModel) => {
    const model = genAI.getGenerativeModel({ model: fallbackModel || 'gemini-3.8-flash' });
    const vocabString = vocabularyList.join(', ');

    let difficultyInstruction = '';
    if (difficulty === 'easy') {
      difficultyInstruction = 'Make the questions straightforward with clear context hints and distinct contrasts between the correct answer and distractors.';
    } else if (difficulty === 'hard') {
      difficultyInstruction = 'Make the questions very challenging AP-tier questions, requiring deep understanding of subtle nuances, connotation, and context.';
    } else if (difficulty === 'custom' && customTopic) {
      difficultyInstruction = `Focus the questions on: ${customTopic}`;
    } else {
      difficultyInstruction = 'Make the questions authentic AP English Language style questions with balanced difficulty and plausible distractors.';
    }

    const quizPrompt = `Create 5 multiple choice quiz questions for these AP Lang vocabulary words: ${vocabString}.
    ${difficultyInstruction}
    
    For each question, provide:
    1. A sentence with a blank where the vocabulary word should go
    2. Four answer choices (one correct, three incorrect)
    3. The correct answer
    
    Format your response as JSON with this structure:
    {
      "questions": [
        {
          "question": "sentence with ___ blank",
          "options": ["option1", "option2", "option3", "option4"],
          "correct": 0,
          "word": "vocabulary word"
        }
      ]
    }`;

    const quizResult = await model.generateContent(quizPrompt);
    const quizData = extractAndParseJson(quizResult.response.text());
    return quizData.questions || [];
  });
};

export const generateMoreParagraph = async (
  vocabularyList: string[],
  difficulty: 'easy' | 'standard' | 'medium' | 'hard' | 'custom' = 'standard',
  customTopic: string = ''
): Promise<ParagraphData> => {
  return globalKeyPool.executeWithRotation(async (genAI, _key, fallbackModel) => {
    const model = genAI.getGenerativeModel({ model: fallbackModel || 'gemini-3.8-flash' });
    const vocabString = vocabularyList.join(', ');

    let difficultyInstruction = '';
    let themeInstruction = '';

    if (difficulty === 'easy') {
      difficultyInstruction = 'Use simple, clear sentence structures with direct, unmistakable context clues so each word choice is straightforwardly identifiable.';
    } else if (difficulty === 'hard') {
      difficultyInstruction = 'Use sophisticated sentence structures and challenging, abstract analytical contexts where nuanced clues indicate the word.';
    } else if (difficulty === 'custom' && customTopic) {
      themeInstruction = `Focus the paragraph on the theme: ${customTopic}`;
    } else {
      difficultyInstruction = 'Use engaging, balanced AP Lang level prose with vivid and distinctive context clues so each word choice makes sense and is identifiable.';
    }

    const paragraphPrompt = `Create an authentic, challenging AP English Language passage or narrative that reads as ONE continuous, unified piece of writing naturally incorporating these vocabulary words: ${vocabString}.
    ${difficultyInstruction}
    ${themeInstruction}
    
    CRITICAL RULES FOR COHESION AND RIGOR:
    1. The passage MUST read as a single, connected, flowing narrative or persuasive argument—NOT disconnected sentences. Ensure smooth, natural transitions between consecutive sentences.
    2. EACH sentence containing a vocabulary word MUST contain EXACTLY ONE target vocabulary word marked in **bold** (e.g. **word**). Never put multiple target vocabulary words in the same sentence.
    3. The context must meaningfully challenge the reader: embed rich rhetorical context clues and tone so the word choice is logical and verifiable through careful analytical reading.
    4. Create 3-4 comprehension questions about the paragraph.
    
    Format your response as JSON with this structure:
    {
      "paragraph": "Your unified, continuous paragraph text with strictly one **bolded** vocabulary word per sentence",
      "questions": [
        {
          "question": "comprehension question",
          "answer": "expected answer"
        }
      ]
    }`;

    const paragraphResult = await model.generateContent(paragraphPrompt);
    return extractAndParseJson(paragraphResult.response.text());
  });
};

export const generateHangmanWords = async (
  theme: string,
  count: number,
  difficulty: 'easy' | 'medium' | 'hard' | 'custom'
): Promise<FlashcardItem[]> => {
  return globalKeyPool.executeWithRotation(async (genAI, _key, fallbackModel) => {
    const model = genAI.getGenerativeModel({ model: fallbackModel || 'gemini-3.8-flash' });

    let prompt = '';
    if (difficulty === 'custom') {
      prompt = `Generate ${count} vocabulary words related to the theme "${theme}".
      IMPORTANT: These words should be "spicy hard" - challenging, obscure, or complex words that fit the theme.
      
      For each word, provide:
      1. The word itself
      2. A clear definition
      3. A hint (synonym or context clue)
      
      Format as JSON:
      {
        "words": [
          {
            "word": "example",
            "definition": "definition here",
            "mnemonic": "hint here" 
          }
        ]
      }`;
    } else {
      prompt = `Generate ${count} vocabulary words for a ${difficulty} level Hangman game.
      Format as JSON:
      {
        "words": [
          {
            "word": "example",
            "definition": "definition here",
            "mnemonic": "hint here"
          }
        ]
      }`;
    }

    const result = await model.generateContent(prompt);
    const data = extractAndParseJson(result.response.text());

    return (data.words || []).map((item: any) => ({
      word: item.word,
      definition: item.definition,
      mnemonic: item.mnemonic,
      synonyms: '',
      antonyms: '',
      context: '',
      etymology: '',
      example: ''
    }));
  });
};

// ==========================================
// RHETORICAL TERMS & DEVICES EXTENSION
// ==========================================

export interface RhetoricalFlashcardItem {
  term: string;
  definition: string;
  rhetoricalEffect: string;
  exampleSentence: string;
  historicExample: string;
  etymology?: string;
  mnemonic: string;
}

export interface RhetoricalDistractorSentence {
  sentence: string;
  deviceOrReason: string;
}

export interface RhetoricalSentenceItem {
  term: string;
  targetSentence: string;
  keyFeature: string;
  explanation: string;
  distractorSentences: RhetoricalDistractorSentence[];
}

export interface RhetoricalQuizQuestion {
  question: string;
  options: string[];
  correct: number;
  term: string;
  explanation: string;
}

export interface RhetoricalPassageQuestion {
  question: string;
  answer: string;
}

export interface RhetoricalPassageData {
  passage: string;
  devicesUsed?: string[];
  questions: RhetoricalPassageQuestion[];
}

export interface RhetoricalGenerationResult {
  flashcards: RhetoricalFlashcardItem[];
  sentenceMatches: RhetoricalSentenceItem[];
  quiz: RhetoricalQuizQuestion[];
  passage: RhetoricalPassageData;
}

export const generateRhetoricalContent = async (
  termsList: string[],
  difficulty: 'easy' | 'standard' | 'hard' = 'standard'
): Promise<RhetoricalGenerationResult> => {
  return globalKeyPool.executeWithRotation(async (genAI, _key, fallbackModel, signal) => {
    const modelName = fallbackModel || 'gemini-3.8-flash';
    const model = genAI.getGenerativeModel({
      model: modelName,
      // JSON mode avoids malformed replies; lower thinking answers sooner and temperature provides high factual accuracy
      generationConfig: { responseMimeType: 'application/json', ...speedConfig(modelName) }
    });
    const termsString = termsList.join(', ');

    let diffInstructionQuiz = 'balanced AP Language exam rigor';
    let diffInstructionSentence = 'clear, identifiable rhetorical moves';
    if (difficulty === 'easy') {
      diffInstructionQuiz = 'straightforward questions with obvious rhetorical patterns and distinct distractors';
      diffInstructionSentence = 'vivid, prototypical sentences with clear and unmistakable syntactic traits';
    } else if (difficulty === 'hard') {
      diffInstructionQuiz = 'advanced, subtle questions examining complex rhetorical functions and nuanced distinctions';
      diffInstructionSentence = 'sophisticated, multi-clause literary excerpts with subtle stylistic maneuvers';
    }

    // Consolidated prompt: Generates Flashcards, Sentence Matches, Quiz, and Passage in ONE single request (75% savings in key usage)
    const combinedPrompt = `You are an elite AP English Language & Composition instructor creating a complete study packet for these rhetorical terms/devices: ${termsString}.
Difficulty Level: ${difficulty}.
Quiz Directive: ${diffInstructionQuiz}
Sentence Challenge Directive: ${diffInstructionSentence}

Return a single JSON object containing ALL 4 modules:

1. "flashcards": Flashcards for each term with:
   - "term": Exact device name
   - "definition": Clear, precise definition
   - "rhetoricalEffect": Why an author/speaker uses it (persuasive impact, tone, cadence, emotional appeal)
   - "exampleSentence": Clear modern example sentence illustrating the device
   - "historicExample": Famous literary, historical, or oratorical quote demonstrating this device with speaker attribution
   - "etymology": Greek/Latin root or linguistic origin
   - "mnemonic": Creative memory trick, rhyme, or association

2. "sentenceMatches": Sentence guessing challenges for EACH term:
   - "term": Rhetorical device name
   - "targetSentence": Rich, vivid sentence that clearly and unquestionably demonstrates this specific rhetorical device
   - "keyFeature": Specific syntactic pattern or phrase creating the device
   - "explanation": Detailed educational explanation of why it matches and its effect
   - "distractorSentences": Exactly 3 sentences that DO NOT use this device, each with "sentence" and "deviceOrReason"

3. "questions": 10 AP Language multiple-choice questions:
   - "question": Quote, excerpt, or scenario asking to identify the device or its function
   - "options": 4 choices (one correct, 3 plausible distractors)
   - "correct": Index (0, 1, 2, or 3) of correct option
   - "term": Device name
   - "explanation": Detailed explanation of why it is correct

4. "passage": Eloquent, cohesive speech or essay passage (175-250 words):
   - "passage": Full text with devices bolded in text (e.g. **[Anaphora: ...]**)
   - "devicesUsed": Array of device names used
   - "questions": 3-4 AP Lang style rhetorical analysis questions with "question" and "answer"

Format response strictly as JSON with this structure:
{
  "flashcards": [
    { "term": "...", "definition": "...", "rhetoricalEffect": "...", "exampleSentence": "...", "historicExample": "...", "etymology": "...", "mnemonic": "..." }
  ],
  "sentenceMatches": [
    { "term": "...", "targetSentence": "...", "keyFeature": "...", "explanation": "...", "distractorSentences": [{ "sentence": "...", "deviceOrReason": "..." }] }
  ],
  "questions": [
    { "question": "...", "options": ["..."], "correct": 0, "term": "...", "explanation": "..." }
  ],
  "passage": {
    "passage": "...",
    "devicesUsed": ["..."],
    "questions": [
      { "question": "...", "answer": "..." }
    ]
  }
}`;

    const result = await model.generateContent(combinedPrompt, { signal });
    const data = extractAndParseJson(result.response.text());

    return {
      flashcards: data.flashcards || [],
      sentenceMatches: data.sentenceMatches || [],
      quiz: data.questions || data.quiz || [],
      passage: data.passage || { passage: '', questions: [] }
    };
  });
};

export const generateMoreRhetoricalQuizQuestions = async (
  termsList: string[],
  difficulty: 'easy' | 'standard' | 'medium' | 'hard' | 'custom' = 'standard',
  customTopic: string = ''
): Promise<RhetoricalQuizQuestion[]> => {
  return globalKeyPool.executeWithRotation(async (genAI, _key, fallbackModel) => {
    const model = genAI.getGenerativeModel({ model: fallbackModel || 'gemini-3.8-flash' });
    const termsString = termsList.join(', ');

    let instruction = '';
    if (difficulty === 'easy') {
      instruction = 'Provide straightforward examples with obvious syntactic patterns.';
    } else if (difficulty === 'hard') {
      instruction = 'Provide complex, nuanced excerpts where distinguishing between subtle rhetorical devices requires deep AP Lang analysis.';
    } else if (difficulty === 'custom' && customTopic) {
      instruction = `Focus the questions and excerpts around: ${customTopic}`;
    } else {
      instruction = 'Provide authentic-feeling literary/speech excerpts with plausible distractors.';
    }

    const prompt = `Create 5 AP Lang multiple choice questions for these rhetorical terms: ${termsString}.
    ${instruction}
    
    Format as JSON:
    {
      "questions": [
        {
          "question": "question text",
          "options": ["opt1", "opt2", "opt3", "opt4"],
          "correct": 0,
          "term": "term name",
          "explanation": "explanation text"
        }
      ]
    }`;

    const result = await model.generateContent(prompt);
    const data = extractAndParseJson(result.response.text());
    return data.questions || [];
  });
};

export const generateMoreRhetoricalPassage = async (
  termsList: string[],
  difficulty: 'easy' | 'standard' | 'medium' | 'hard' | 'custom' = 'standard',
  customTopic: string = ''
): Promise<RhetoricalPassageData> => {
  return globalKeyPool.executeWithRotation(async (genAI, _key, fallbackModel) => {
    const model = genAI.getGenerativeModel({ model: fallbackModel || 'gemini-3.8-flash' });
    const termsString = termsList.join(', ');

    let theme = customTopic ? `on the theme of ${customTopic}` : 'addressing a pressing civic or ethical dilemma';
    const prompt = `Write an eloquent AP Lang style speech or essay excerpt (175-250 words) ${theme} that incorporates these rhetorical devices: ${termsString}.
    Bold the devices when used like **[Device: excerpt]** or **excerpt (Device)**.
    Include 3-4 AP Lang rhetorical analysis questions with model answers.
    
    Format as JSON:
    {
      "passage": "passage text...",
      "devicesUsed": ["..."],
      "questions": [
        {
          "question": "question text",
          "answer": "model answer"
        }
      ]
    }`;

    const result = await model.generateContent(prompt);
    return extractAndParseJson(result.response.text());
  });
};
