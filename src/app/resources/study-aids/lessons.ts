// Lesson content for /resources/study-aids.
//
// Each lesson has a slide deck (viewable inline) and a graphic organizer
// (downloadable PDF). Missing files render as "Coming soon" states.
//
// Titles are placeholders — swap in the real lesson names when they lock.
//
// File conventions (both live under /public/study-aids/):
//   decks/lesson-<n>-deck.pdf
//   organizers/lesson-<n>-organizer.pdf
// Where <n> is the id below (e.g. "1", "2-5", "3"...).

export type Lesson = {
  id: string;              // slug — matches file names
  number: string;          // display, e.g. "1", "2.5"
  title: string;           // display title
  deck?: string;           // path under /public, e.g. "/study-aids/decks/lesson-1-deck.pdf"
  organizer?: string;      // path under /public
};

export const LESSONS: Lesson[] = [
  {
    id: "1",
    number: "1",
    title: "What is debate?",
    deck: "/study-aids/decks/lesson-1-deck.pdf",
    organizer: "/study-aids/organizers/lesson-1-organizer.pdf",
  },
  {
    id: "2",
    number: "2",
    title: "Building an Argument – Claim, Warrant, Impact",
    deck: "/study-aids/decks/lesson-2-deck.pdf",
    organizer: "/study-aids/organizers/lesson-2-organizer.pdf",
  },
  {
    id: "2-5",
    number: "2.5",
    title: "Debate Vocabulary",
    deck: "/study-aids/decks/lesson-2-5-deck.pdf",
  },
  {
    id: "3",
    number: "3",
    title: "Structure of a Debate Round",
    deck: "/study-aids/decks/lesson-3-deck.pdf",
  },
  {
    id: "4",
    number: "4",
    title: "Topic Intro + AFF Basics (SHIS)",
  },
  {
    id: "5",
    number: "5",
    title: "Understanding the NEG + ITAPIN",
  },
  {
    id: "6",
    number: "6",
    title: "Disadvantages",
    deck: "/study-aids/decks/lesson-6-deck.pdf",
  },
  {
    id: "7",
    number: "7",
    title: "Impact Calculation",
  },
];
