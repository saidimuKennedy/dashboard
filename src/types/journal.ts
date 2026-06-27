export type JournalAuthor = {
  firstName: string;
  lastName: string;
};

export type JournalDetail = {
  id: string;
  authorId: string;
  date: string;
  content: string;
  lessons: string | null;
  challenges: string | null;
  wins: string | null;
  mood: string | null;
  aiSummary: string | null;
  createdAt: string;
  updatedAt: string;
  author?: JournalAuthor;
};
