export interface CourseRhetoricalTerm {
  term: string;
  definition: string;
  example?: string;
  notes?: string;
}

export interface RhetoricalCourseUnit {
  id: string;
  testNumber: number | string;
  unitTitle: string;
  description: string;
  terms: string[];
  termsDetailed: CourseRhetoricalTerm[];
}

export const RHETORICAL_COURSE_UNITS: RhetoricalCourseUnit[] = [
  {
    id: 'unit-1',
    testNumber: 1,
    unitTitle: 'Unit 1 (Test 1): Core Foundations',
    description: 'Diction, syntax, denotation, and connotation fundamentals.',
    terms: ['Diction', 'Syntax', 'Denotation', 'Connotation'],
    termsDetailed: [
      {
        term: 'Diction',
        definition: 'Choice of words especially with regard to correctness, clearness, or effectiveness. Combined with other devices creates the author’s style.',
        notes: 'Describe an author’s diction (plain, formal, etc.) and understand how it complements purpose.',
      },
      {
        term: 'Syntax',
        definition: 'The way an author chooses to join words into phrases, clauses, and sentences. Differentiate syntax (groups of words) from diction (individual words).',
        notes: 'Expect to analyze how the author manipulates syntax to accomplish purpose.',
      },
      {
        term: 'Denotation',
        definition: 'The strict, literal, dictionary definition of a word, devoid of any emotion, attitude, or color.',
        example: 'HOME = one’s place of residence/where one lives.',
      },
      {
        term: 'Connotation',
        definition: 'The nonliteral, associative meaning of a word; the implied, suggested meaning involving ideas, emotions, or attitudes.',
        example: 'HOME = warmth, security, love, peace, happiness, etc.',
      },
    ],
  },
  {
    id: 'unit-2',
    testNumber: 2,
    unitTitle: 'Unit 2 (Test 2): Appeals & Sentence Architecture',
    description: 'Rhetoric, Ethos, Logos, Pathos, and syntactic sentence structures.',
    terms: [
      'Rhetoric',
      'Ethos',
      'Logos',
      'Pathos',
      'Periodic Sentence',
      'Cumulative Sentence',
      'Imperative Sentence',
      'Rhetorical Question',
    ],
    termsDetailed: [
      {
        term: 'Rhetoric',
        definition: 'From the Greek for "orator," describes the principles governing the art of writing effectively, eloquently, and persuasively.',
      },
      {
        term: 'Ethos',
        definition: 'Appeal based on the character, credibility, or reputation of the speaker/writer.',
        example: '"As a doctor, I know how important it is to relieve stress and nothing does it better for me than Marlboro."',
      },
      {
        term: 'Logos',
        definition: 'Appeal based on logic, data, or reason.',
        example: '"The president’s approval rating is currently at 42%. He must respond to the opinions of the majority."',
      },
      {
        term: 'Pathos',
        definition: 'Appeal based on emotion, sympathy, or vivid human imagery.',
        example: '"For the price of a cup of coffee per day, you can help feed and clothe this family for a year."',
      },
      {
        term: 'Periodic Sentence',
        definition: 'Sentence whose main clause is withheld until the very end, building suspense or emphasis.',
        example: '"To that world assembly of sovereign states, the United Nations, our last best hope in an age where the instruments of war have far outpaced the instruments of peace, we renew our pledge of support."',
      },
      {
        term: 'Cumulative Sentence',
        definition: 'Sentence that completes the main idea at the beginning, and then builds, accumulates, and adds on subordinate details.',
        example: '"But neither can two great and powerful groups of nations take comfort from our present course—both sides overburdened by the cost of modern weapons, both rightly alarmed by the steady spread of the deadly atom..."',
      },
      {
        term: 'Imperative Sentence',
        definition: 'Sentence used to command, enjoin, implore, or entreat.',
        example: '"Let both sides explore what problems unite us instead of belaboring those problems that divide us."',
      },
      {
        term: 'Rhetorical Question',
        definition: 'Figure of speech in the form of a question posed for rhetorical effect rather than for the purpose of getting an answer.',
        example: '"Will you join in this historic effort?"',
      },
    ],
  },
  {
    id: 'unit-3',
    testNumber: 3,
    unitTitle: 'Unit 3 (Test 3): Structural Framing & Inversion',
    description: 'Parallelism, Inversion, Juxtaposition, and Parenthetical insertions.',
    terms: ['Parallelism', 'Inversion', 'Juxtaposition', 'Parenthetical'],
    termsDetailed: [
      {
        term: 'Parallelism',
        definition: 'From Greek roots meaning "beside one another"; the grammatical or rhetorical framing of words, phrases, sentences, or paragraphs to give structural similarity.',
        example: '"It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness..."',
      },
      {
        term: 'Inversion',
        definition: 'A change in normal word order, especially placing the verb before the noun or switching clause order for emphasis and distinct rhythm.',
        example: '"Impossible is Nothing"',
      },
      {
        term: 'Juxtaposition',
        definition: 'The act or an instance of placing two or more contrasting things side by side for comparison or contrast.',
        example: '"The movie was both terrifying and exciting."',
      },
      {
        term: 'Parenthetical',
        definition: 'An amplifying or explanatory word, phrase, or sentence inserted into a passage, set off by commas, dashes, or parentheses.',
        example: '"You are, on the other hand, a very talented artist."',
      },
    ],
  },
  {
    id: 'unit-4',
    testNumber: 4,
    unitTitle: 'Unit 4 (Test 4): Figurative Comparisons & Address',
    description: 'Allusion, Analogy, Anecdote, and Apostrophe.',
    terms: ['Allusion', 'Analogy', 'Anecdote', 'Apostrophe'],
    termsDetailed: [
      {
        term: 'Allusion',
        definition: 'A direct or indirect reference to something presumably commonly known (historical, literary, religious, mythical, or social).',
        example: '"Calculus was his Achilles heel." / "Don’t be such a Scrooge."',
      },
      {
        term: 'Analogy',
        definition: 'A similarity or comparison between two different things, explaining something unfamiliar by associating it with something familiar.',
        example: '"A street light is like a star. Both provide light at night, both are in predictable locations, both are overhead..."',
      },
      {
        term: 'Anecdote',
        definition: 'A short, engaging narrative of an interesting, amusing, or biographical incident used to illustrate a point.',
      },
      {
        term: 'Apostrophe',
        definition: 'A figure of speech in which someone absent, dead, or something nonhuman is directly addressed as if alive, present, and capable of replying.',
        example: '"O Captain! my Captain! our fearful trip is done..." (Walt Whitman addressing Lincoln)',
      },
    ],
  },
  {
    id: 'unit-5',
    testNumber: 5,
    unitTitle: 'Unit 5 (Test 5): Irony, Paradox & Indirect Language',
    description: 'Irony, Paradox, Euphemism, and Double Entendre.',
    terms: ['Irony', 'Paradox', 'Euphemism', 'Double Entendre'],
    termsDetailed: [
      {
        term: 'Irony',
        definition: 'The contrast between what is stated explicitly and what is really meant; the difference between expectation and reality.',
        example: 'A marriage counselor files for divorce / "What a beautiful view," said while looking at an alley.',
      },
      {
        term: 'Paradox',
        definition: 'A statement that appears self-contradictory or opposed to common sense but upon closer inspection contains profound truth.',
        example: '"To find your life you must lose it."',
      },
      {
        term: 'Euphemism',
        definition: 'A more agreeable or less offensive substitute for a generally unpleasant word or concept.',
        example: '"Collateral damage" / "Let go" for fired / "Under the weather" for sick.',
      },
      {
        term: 'Double Entendre',
        definition: 'A word or phrase having a double meaning, especially when the second meaning is risqué or humorous.',
        example: 'Staples company (stapler vs. essential needs) / "That’s what she said".',
      },
    ],
  },
  {
    id: 'unit-6',
    testNumber: '6 (Review)',
    unitTitle: 'Unit 6 (Test 6): Cumulative Review 1–5',
    description: 'Comprehensive review covering all 24 terms from Tests 1 through 5.',
    terms: [
      'Diction',
      'Syntax',
      'Denotation',
      'Connotation',
      'Rhetoric',
      'Ethos',
      'Logos',
      'Pathos',
      'Periodic Sentence',
      'Cumulative Sentence',
      'Imperative Sentence',
      'Rhetorical Question',
      'Parallelism',
      'Inversion',
      'Juxtaposition',
      'Parenthetical',
      'Allusion',
      'Analogy',
      'Anecdote',
      'Apostrophe',
      'Irony',
      'Paradox',
      'Euphemism',
      'Double Entendre',
    ],
    termsDetailed: [],
  },
  {
    id: 'unit-7',
    testNumber: 7,
    unitTitle: 'Unit 7 (Test 7): Logical Fallacies',
    description: 'Core AP Lang argumentative flaws and logical fallacies.',
    terms: [
      'Ad Hominem',
      'Straw Man',
      'Slippery Slope',
      'False Dilemma',
      'Hasty Generalization',
      'Bandwagon Appeal',
      'Red Herring',
      'Circular Reasoning',
    ],
    termsDetailed: [
      {
        term: 'Ad Hominem',
        definition: 'Attacking the person making an argument rather than the substance of the argument itself.',
      },
      {
        term: 'Straw Man',
        definition: 'Oversimplifying or misrepresenting an opponent’s argument to make it easier to attack.',
      },
      {
        term: 'Slippery Slope',
        definition: 'Asserting that a relatively small first step will inevitably lead to a chain of catastrophic events without supporting evidence.',
      },
      {
        term: 'False Dilemma',
        definition: 'Presenting only two alternative states as the only possibilities, when in fact more possibilities exist (either-or).',
      },
      {
        term: 'Hasty Generalization',
        definition: 'Drawing a broad, sweeping conclusion based on an insufficient or unrepresentative sample size.',
      },
      {
        term: 'Bandwagon Appeal',
        definition: 'Appealing to popularity or the fact that many people do something as validation for doing it.',
      },
      {
        term: 'Red Herring',
        definition: 'Introducing an irrelevant topic into an argument to distract the attention of listeners from the original issue.',
      },
      {
        term: 'Circular Reasoning',
        definition: 'Begging the question; an argument in which the conclusion is assumed in one of the premises.',
      },
    ],
  },
  {
    id: 'unit-8',
    testNumber: 8,
    unitTitle: 'Unit 8 (Test 8): Reasoning Patterns & Syllogisms',
    description: 'Antithesis, Deductive Reasoning, Syllogism, and Inductive Reasoning.',
    terms: ['Antithesis', 'Deductive Reasoning', 'Syllogism', 'Inductive Reasoning'],
    termsDetailed: [
      {
        term: 'Antithesis',
        definition: 'A rhetorical opposition or contrast of ideas by means of a grammatical arrangement of words, clauses, or sentences.',
        example: '"Ask not what your country can do for you, but what you can do for your country." / "That’s one small step for man, one giant leap for mankind."',
      },
      {
        term: 'Deductive Reasoning',
        definition: 'Reasoning that begins with a general principle and concludes with a specific instance demonstrating that general principle.',
        example: 'All human beings are mortal. Socrates is a human being. Therefore, Socrates is mortal.',
      },
      {
        term: 'Syllogism',
        definition: 'A form of deductive reasoning that draws a conclusion from two premises (major premise, minor premise, and conclusion).',
        example: 'No humans are immortal. Some organisms are immortal. Therefore, some organisms aren’t humans.',
      },
      {
        term: 'Inductive Reasoning',
        definition: 'Reasoning that begins by citing a number of specific instances or examples to collectively establish a general principle.',
        example: 'The first three candies in the bag are chocolate; all candy in the bag must be chocolate.',
      },
    ],
  },
  {
    id: 'unit-9',
    testNumber: 9,
    unitTitle: 'Unit 9 (Test 9): Repetition, Metonymy & Wordplay',
    description: 'Metonymy, Anaphora, Epistrophe, and Malapropism.',
    terms: ['Metonymy', 'Anaphora', 'Epistrophe', 'Malapropism'],
    termsDetailed: [
      {
        term: 'Metonymy',
        definition: 'A figure of speech consisting of the use of the name of one object or concept for that of another to which it is closely related or associated.',
        example: '"Brains" to signify intelligence / "Hollywood" for the film industry / "Count heads" for counting people.',
      },
      {
        term: 'Anaphora',
        definition: 'The repetition of a word or words at the beginning of successive phrases, clauses, or sentences.',
        example: '"Not time, not money, not laws, but willing diligence will get this done."',
      },
      {
        term: 'Epistrophe',
        definition: 'The counterpart of anaphora: repetition of the same word or words at the end of successive phrases, clauses, or sentences.',
        example: '"Where affections bear rule, there reason is subdued, honesty is subdued, good will is subdued..."',
      },
      {
        term: 'Malapropism',
        definition: 'From mal à propos (inappropriate); the humorous misuse of a word by confusing it with a similar-sounding word.',
        example: '"I might just fade into Bolivian" (for oblivion) / "Sixteenth Chapel" (for Sistine Chapel).',
      },
    ],
  },
  {
    id: 'unit-10',
    testNumber: 10,
    unitTitle: 'Unit 10 (Test 10): Satire, Tropes & Complex Schemes',
    description: 'Synecdoche, Zeugma, Satire, and Parody.',
    terms: ['Synecdoche', 'Zeugma', 'Satire', 'Parody'],
    termsDetailed: [
      {
        term: 'Synecdoche',
        definition: 'A type of metaphor in which any portion, section, or main quality stands for the whole, or the whole stands for a part.',
        example: '"Farmer Jones has two hundred head of cattle and three hired hands." / "If I had some wheels, I’d put on my best threads..."',
      },
      {
        term: 'Zeugma',
        definition: 'The use of two different words in a grammatically similar way but producing different, incongruous, or striking meanings.',
        example: '"Now the trumpet summons us again—not as a call to bear arms, though arms we need... but a call to bear the burden."',
      },
      {
        term: 'Satire',
        definition: 'The use of irony, sarcasm, or ridicule to expose, denounce, or deride human vice, folly, or institutional shortcomings.',
      },
      {
        term: 'Parody',
        definition: 'A humorous or satirical imitation of a serious piece of literature, art, or writing to mock or amuse.',
        example: 'A hilarious parody of Hamlet’s soliloquy.',
      },
    ],
  },
  {
    id: 'full-curriculum',
    testNumber: 'All',
    unitTitle: 'Complete Course Master Set (Tests 1–10)',
    description: 'All 44 course terms from the entire AP Language & Composition curriculum.',
    terms: [
      'Diction',
      'Syntax',
      'Denotation',
      'Connotation',
      'Rhetoric',
      'Ethos',
      'Logos',
      'Pathos',
      'Periodic Sentence',
      'Cumulative Sentence',
      'Imperative Sentence',
      'Rhetorical Question',
      'Parallelism',
      'Inversion',
      'Juxtaposition',
      'Parenthetical',
      'Allusion',
      'Analogy',
      'Anecdote',
      'Apostrophe',
      'Irony',
      'Paradox',
      'Euphemism',
      'Double Entendre',
      'Ad Hominem',
      'Straw Man',
      'Slippery Slope',
      'False Dilemma',
      'Hasty Generalization',
      'Bandwagon Appeal',
      'Red Herring',
      'Circular Reasoning',
      'Antithesis',
      'Deductive Reasoning',
      'Syllogism',
      'Inductive Reasoning',
      'Metonymy',
      'Anaphora',
      'Epistrophe',
      'Malapropism',
      'Synecdoche',
      'Zeugma',
      'Satire',
      'Parody',
    ],
    termsDetailed: [],
  },
];
