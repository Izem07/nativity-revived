import { GoogleGenerativeAI } from '@google/generative-ai';
import { FlashcardItem } from '../components/Flashcards';
import { MatchingPair } from '../components/Matching';
import { ParagraphData } from '../components/ParagraphPractice';
import { QuizQuestion } from '../components/Quiz';
import { globalKeyPool } from './keyPoolService';

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

export const generateQuizContent = async (vocabularyList: string[]): Promise<QuizGenerationResult> => {
  return globalKeyPool.executeWithRotation(async (genAI, _key, fallbackModel) => {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });
    const vocabString = vocabularyList.join(', ');

    // Generate Quiz Questions
    const quizPrompt = `Create 10 multiple choice quiz questions for these AP Lang vocabulary words: ${vocabString}.
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

    // Generate Flashcards
    const flashcardPrompt = `Create comprehensive flashcards for these AP Lang vocabulary words: ${vocabString}.
    
    IMPORTANT: You MUST provide ALL of the following fields for each word:
    1. The word
    2. A clear, concise definition
    3. Synonyms (comma-separated list of 2-3 words)
    4. Antonyms (comma-separated list of 2-3 words)
    5. A context sentence showing typical usage
    6. Etymology (word origin and root meaning)
    7. An example sentence using the word
    8. A creative MNEMONIC - a memory trick, funny association, rhyme, or story to help remember the word
    
    Format your response as JSON with this structure:
    {
      "flashcards": [
        {
          "word": "vocabulary word",
          "definition": "clear definition here",
          "synonyms": "synonym1, synonym2, synonym3",
          "antonyms": "antonym1, antonym2, antonym3",
          "context": "A sentence showing typical usage context",
          "etymology": "Word origin and root meaning",
          "example": "An example sentence using the word",
          "mnemonic": "A creative, memorable trick to remember this word"
        }
      ]
    }
    
    Do NOT skip any fields. Every flashcard must have all 8 fields filled in.`;

    // Generate Matching pairs
    const matchingPrompt = `Create matching pairs for these AP Lang vocabulary words: ${vocabString}.
    Provide the word and a brief definition (5-10 words).
    
    Format your response as JSON with this structure:
    {
      "pairs": [
        {
          "word": "vocabulary word",
          "definition": "brief definition"
        }
      ]
    }`;

    // Generate Practice Paragraph
    const paragraphPrompt = `Write a cohesive paragraph (150-200 words) that uses ALL of these AP Lang vocabulary words: ${vocabString}.
    Make the paragraph engaging and contextually appropriate. Bold each vocabulary word when used.
    Also provide comprehension questions about the vocabulary usage.
    
    Format your response as JSON with this structure:
    {
      "paragraph": "the paragraph text with **bolded** vocab words",
      "questions": [
        {
          "question": "comprehension question",
          "answer": "correct answer"
        }
      ]
    }`;

    const [quizResult, flashcardResult, matchingResult, paragraphResult] = await Promise.all([
      model.generateContent(quizPrompt),
      model.generateContent(flashcardPrompt),
      model.generateContent(matchingPrompt),
      model.generateContent(paragraphPrompt)
    ]);

    const quizData = extractAndParseJson(quizResult.response.text());
    const flashcardData = extractAndParseJson(flashcardResult.response.text());
    const matchingData = extractAndParseJson(matchingResult.response.text());
    const paragraphData = extractAndParseJson(paragraphResult.response.text());

    return {
      quiz: quizData.questions || [],
      flashcards: flashcardData.flashcards || [],
      matching: matchingData.pairs || [],
      paragraph: paragraphData
    };
  });
};

export const testAPIKey = async (candidateKey?: string): Promise<{ valid: boolean; error?: string }> => {
  try {
    const key = candidateKey ? candidateKey.trim() : getStoredAPIKey();
    if (!key) return { valid: false, error: 'No API key provided' };
    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });
    const result = await model.generateContent('ping');
    return { valid: Boolean(result.response.text()) };
  } catch (err: any) {
    return { valid: false, error: err?.message || 'Invalid API Key' };
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
  difficulty: 'easy' | 'medium' | 'hard' | 'custom' = 'medium',
  customTopic: string = ''
): Promise<QuizQuestion[]> => {
  return globalKeyPool.executeWithRotation(async (genAI, _key, fallbackModel) => {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });
    const vocabString = vocabularyList.join(', ');

    let difficultyInstruction = '';
    if (difficulty === 'easy') {
      difficultyInstruction = 'Make the questions straightforward with clear distinctions between the correct answer and distractors.';
    } else if (difficulty === 'medium') {
      difficultyInstruction = 'Make the questions moderately challenging with subtle differences between options.';
    } else if (difficulty === 'hard') {
      difficultyInstruction = 'Make the questions very challenging, requiring deep understanding of nuances and context.';
    } else if (difficulty === 'custom' && customTopic) {
      difficultyInstruction = `Focus the questions on: ${customTopic}`;
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
  difficulty: 'easy' | 'medium' | 'hard' | 'custom' = 'medium',
  customTopic: string = ''
): Promise<ParagraphData> => {
  return globalKeyPool.executeWithRotation(async (genAI, _key, fallbackModel) => {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });
    const vocabString = vocabularyList.join(', ');

    let difficultyInstruction = '';
    let themeInstruction = '';

    if (difficulty === 'easy') {
      difficultyInstruction = 'Use simple sentence structures and clear contexts for each vocabulary word.';
    } else if (difficulty === 'medium') {
      difficultyInstruction = 'Use moderately complex sentence structures with nuanced contexts.';
    } else if (difficulty === 'hard') {
      difficultyInstruction = 'Use sophisticated sentence structures and challenging, abstract contexts.';
    } else if (difficulty === 'custom' && customTopic) {
      themeInstruction = `Focus the paragraph on the theme: ${customTopic}`;
    }

    const paragraphPrompt = `Create a cohesive paragraph that naturally incorporates these AP Lang vocabulary words: ${vocabString}.
    ${difficultyInstruction}
    ${themeInstruction}
    
    Requirements:
    1. Write a 150-200 word paragraph
    2. Mark each vocabulary word with **bold** formatting like **word**
    3. Use each word correctly in context
    4. Create 3-4 comprehension questions about the paragraph
    
    Format your response as JSON with this structure:
    {
      "paragraph": "Your paragraph text with **vocabulary** words in **bold**",
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
    const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });

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

export const generateRhetoricalContent = async (termsList: string[]): Promise<RhetoricalGenerationResult> => {
  return globalKeyPool.executeWithRotation(async (genAI, _key, fallbackModel) => {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });
    const termsString = termsList.join(', ');

    // 1. Rhetorical Flashcards
    const flashcardPrompt = `Create comprehensive AP Language & Composition flashcards for these rhetorical terms/devices: ${termsString}.
    
    IMPORTANT: Provide ALL of the following fields for each term:
    1. "term": Exact rhetorical device name
    2. "definition": Clear, precise definition
    3. "rhetoricalEffect": Why an author/speaker uses this device (persuasive impact, tone, cadence, emotional appeal)
    4. "exampleSentence": A clear modern example sentence illustrating the device
    5. "historicExample": A famous literary, historical, or oratorical quote demonstrating this device (attribute author/speaker)
    6. "etymology": Greek/Latin root or linguistic origin
    7. "mnemonic": A memorable memory trick, rhyme, or visual association
    
    Format as JSON:
    {
      "flashcards": [
        {
          "term": "Anaphora",
          "definition": "The repetition of a word or phrase at the beginning of successive clauses.",
          "rhetoricalEffect": "Builds rhythmic momentum, emotional intensity, and emphasizes a central theme.",
          "exampleSentence": "We will stand together, we will fight together, and we will win together.",
          "historicExample": "I have a dream... I have a dream today. (Martin Luther King Jr.)",
          "etymology": "Greek: ana- (again) + pherein (to carry)",
          "mnemonic": "Anaphora = A New phrase starting every line again."
        }
      ]
    }`;

    // 2. Sentence Guessing & Matching items
    const sentenceMatchPrompt = `Create sentence guessing challenges for these AP Lang rhetorical terms: ${termsString}.
    For EACH term, generate:
    1. "term": The rhetorical device name
    2. "targetSentence": A rich, vivid sentence that clearly and unquestionably demonstrates this specific rhetorical device.
    3. "keyFeature": The specific phrase or syntactic pattern in the sentence that creates this device (e.g., "reversal of words A-B into B-A" or "deliberate omission of conjunctions").
    4. "explanation": A detailed, educational explanation of why this sentence matches the device and how it creates its rhetorical effect.
    5. "distractorSentences": Exactly 3 well-crafted sentences that DO NOT use this device (they should each use a different rhetorical device or normal grammar), each with a brief "deviceOrReason" explaining why it is NOT the target device.
    
    Format as JSON:
    {
      "sentenceMatches": [
        {
          "term": "Chiasmus",
          "targetSentence": "Let us never negotiate out of fear, but let us never fear to negotiate.",
          "keyFeature": "reversal of words 'negotiate out of fear' into 'fear to negotiate' (A-B-B-A structure)",
          "explanation": "Chiasmus reverses the grammatical structure or words in successive phrases to highlight contrast and balance.",
          "distractorSentences": [
            {
              "sentence": "He was a lion in battle, fierce and untamed.",
              "deviceOrReason": "This is a metaphor comparing courage to a lion, not chiasmus."
            },
            {
              "sentence": "I came, I saw, I conquered.",
              "deviceOrReason": "This is asyndeton/tricolon (rapid listing without conjunctions), not chiasmus."
            },
            {
              "sentence": "The wind howled through the empty corridors all night.",
              "deviceOrReason": "This is personification giving human traits to the wind, not chiasmus."
            }
          ]
        }
      ]
    }`;

    // 3. AP Lang Multiple Choice Quiz
    const quizPrompt = `Create 10 AP Language & Composition style multiple choice questions testing these rhetorical terms: ${termsString}.
    Each question should present a quote, excerpt, or scenario and ask students to identify the rhetorical device or analyze its rhetorical function.
    
    Format as JSON:
    {
      "questions": [
        {
          "question": "In the excerpt: '...', which rhetorical device is predominantly utilized to heighten the speaker's urgency?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correct": 0,
          "term": "term name",
          "explanation": "Detailed explanation of why this is correct."
        }
      ]
    }`;

    // 4. Rhetorical Analysis Passage
    const passagePrompt = `Write an eloquent, cohesive persuasive speech or essay passage (175-250 words) that naturally employs several of these rhetorical devices: ${termsString}.
    Bold the devices used in the text like **[Device: excerpt]** or **excerpt (Device)**.
    Provide 3-4 AP Lang style rhetorical analysis prompts analyzing how the speaker uses rhetorical devices to achieve their purpose, with model analytical answers.
    
    Format as JSON:
    {
      "passage": "Full passage text...",
      "devicesUsed": ["Anaphora", "Chiasmus", "Polysyndeton"],
      "questions": [
        {
          "question": "How does the speaker's use of anaphora in paragraph 1 reinforce their call to action?",
          "answer": "The repeated opening creates a rhythmic urgency that unites the listeners..."
        }
      ]
    }`;

    const [flashcardResult, sentenceMatchResult, quizResult, passageResult] = await Promise.all([
      model.generateContent(flashcardPrompt),
      model.generateContent(sentenceMatchPrompt),
      model.generateContent(quizPrompt),
      model.generateContent(passagePrompt)
    ]);

    const flashcardData = extractAndParseJson(flashcardResult.response.text());
    const sentenceMatchData = extractAndParseJson(sentenceMatchResult.response.text());
    const quizData = extractAndParseJson(quizResult.response.text());
    const passageData = extractAndParseJson(passageResult.response.text());

    return {
      flashcards: flashcardData.flashcards || [],
      sentenceMatches: sentenceMatchData.sentenceMatches || [],
      quiz: quizData.questions || [],
      passage: passageData
    };
  });
};

export const generateMoreRhetoricalQuizQuestions = async (
  termsList: string[],
  difficulty: 'easy' | 'medium' | 'hard' | 'custom' = 'medium',
  customTopic: string = ''
): Promise<RhetoricalQuizQuestion[]> => {
  return globalKeyPool.executeWithRotation(async (genAI, _key, fallbackModel) => {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });
    const termsString = termsList.join(', ');

    let instruction = '';
    if (difficulty === 'easy') {
      instruction = 'Provide straightforward examples with obvious syntactic patterns.';
    } else if (difficulty === 'medium') {
      instruction = 'Provide authentic-feeling literary/speech excerpts with plausible distractors.';
    } else if (difficulty === 'hard') {
      instruction = 'Provide complex, nuanced excerpts where distinguishing between subtle rhetorical devices requires deep AP Lang analysis.';
    } else if (difficulty === 'custom' && customTopic) {
      instruction = `Focus the questions and excerpts around: ${customTopic}`;
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
  difficulty: 'easy' | 'medium' | 'hard' | 'custom' = 'medium',
  customTopic: string = ''
): Promise<RhetoricalPassageData> => {
  return globalKeyPool.executeWithRotation(async (genAI, _key, fallbackModel) => {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' });
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
