export type BookFormat = 'pdf' | 'epub' | 'txt';

export interface Book {
  id: string;              // hash di nome+dimensione
  title: string;           // nome file (senza estensione) o titolo ePub
  format: BookFormat;
  totalPages: number;
  addedAt: string;         // ISO date
  lastReadAt: string;      // ISO date
  coverColor: string;      // colore generato deterministicamente dall'id
}

export interface ReadingProgress {
  bookId: string;
  currentPage: number;
  currentWordIndex: number;
  wpm: number;
  chunkSize: number;       // 1, 2, o 3 parole per volta
}

export interface ReadingSession {
  bookId: string;
  startedAt: string;       // ISO date
  durationSeconds: number;
  wordsRead: number;
  averageWpm: number;
}

export interface ReadingStats {
  bookId: string;
  totalSessions: ReadingSession[];
  totalWordsRead: number;
  totalTimeSeconds: number;
  averageWpm: number;
}

export interface LibraryEntry {
  book: Book;
  progress: ReadingProgress;
  stats: ReadingStats;
}

/** Struttura salvata in localStorage */
export interface LibraryStorage {
  books: { [bookId: string]: Book };
  progress: { [bookId: string]: ReadingProgress };
  stats: { [bookId: string]: ReadingStats };
}
