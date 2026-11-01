import { Injectable } from '@angular/core';
import {
  Book, BookFormat, ReadingProgress, ReadingStats,
  ReadingSession, LibraryEntry, LibraryStorage
} from '../../shared/models/book.model';

const STORAGE_KEY = 'intelligent_reading_library';

@Injectable({ providedIn: 'root' })
export class LibraryService {

  private storage: LibraryStorage = { books: {}, progress: {}, stats: {} };

  constructor() {
    this.load();
  }

  // ─── Persistence ─────────────────────────────────────────────────────────

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) this.storage = JSON.parse(raw);
    } catch {
      this.storage = { books: {}, progress: {}, stats: {} };
    }
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.storage));
  }

  // ─── Book CRUD ────────────────────────────────────────────────────────────

  /** Genera un ID stabile da nome + dimensione file */
  generateBookId(fileName: string, fileSize: number): string {
    return `${fileName.replace(/[^a-zA-Z0-9]/g, '_')}_${fileSize}`;
  }

  /** Genera un colore copertina deterministico dall'ID */
  generateCoverColor(id: string): string {
    const colors = [
      '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
      '#f97316', '#eab308', '#22c55e', '#14b8a6',
      '#3b82f6', '#06b6d4'
    ];
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  addOrUpdateBook(
    fileName: string,
    fileSize: number,
    format: BookFormat,
    totalPages: number,
    title?: string
  ): Book {
    const id = this.generateBookId(fileName, fileSize);
    const now = new Date().toISOString();

    if (!this.storage.books[id]) {
      // Nuovo libro
      const book: Book = {
        id,
        title: title ?? fileName.replace(/\.[^.]+$/, ''),
        format,
        totalPages,
        addedAt: now,
        lastReadAt: now,
        coverColor: this.generateCoverColor(id),
      };
      this.storage.books[id] = book;

      // Progresso iniziale
      this.storage.progress[id] = {
        bookId: id, currentPage: 1, currentWordIndex: 0, wpm: 300, chunkSize: 1
      };

      // Stats iniziali
      this.storage.stats[id] = {
        bookId: id, totalSessions: [], totalWordsRead: 0, totalTimeSeconds: 0, averageWpm: 0
      };
    } else {
      // Libro già esistente — aggiorna metadati variabili
      this.storage.books[id].lastReadAt = now;
      this.storage.books[id].totalPages = totalPages;
    }

    this.save();
    return this.storage.books[id];
  }

  getBook(bookId: string): Book | undefined {
    return this.storage.books[bookId];
  }

  getAllBooks(): LibraryEntry[] {
    return (Object.values(this.storage.books) as Book[]).map((book: Book) => ({
      book,
      progress: this.storage.progress[book.id],
      stats: this.storage.stats[book.id],
    })).sort((a: LibraryEntry, b: LibraryEntry) =>
      new Date(b.book.lastReadAt).getTime() - new Date(a.book.lastReadAt).getTime()
    );
  }

  removeBook(bookId: string): void {
    delete this.storage.books[bookId];
    delete this.storage.progress[bookId];
    delete this.storage.stats[bookId];
    this.save();
  }

  // ─── Progress ─────────────────────────────────────────────────────────────

  getProgress(bookId: string): ReadingProgress | undefined {
    return this.storage.progress[bookId];
  }

  saveProgress(progress: ReadingProgress): void {
    this.storage.progress[progress.bookId] = progress;
    if (this.storage.books[progress.bookId]) {
      this.storage.books[progress.bookId].lastReadAt = new Date().toISOString();
    }
    this.save();
  }

  /** Calcola la percentuale di completamento (0-100) */
  getProgressPercent(bookId: string): number {
    const book = this.storage.books[bookId];
    const progress = this.storage.progress[bookId];
    if (!book || !progress || book.totalPages === 0) return 0;
    return Math.round(((progress.currentPage - 1) / book.totalPages) * 100);
  }

  // ─── Stats ────────────────────────────────────────────────────────────────

  getStats(bookId: string): ReadingStats | undefined {
    return this.storage.stats[bookId];
  }

  addSession(session: ReadingSession): void {
    const stats = this.storage.stats[session.bookId];
    if (!stats) return;
    stats.totalSessions.push(session);
    stats.totalWordsRead += session.wordsRead;
    stats.totalTimeSeconds += session.durationSeconds;
    const totalWpm = stats.totalSessions.reduce((acc: number, s: ReadingSession) => acc + s.averageWpm, 0);
    stats.averageWpm = Math.round(totalWpm / stats.totalSessions.length);
    this.save();
  }

  /** Formatta i secondi in "Xh Xm" */
  formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }
}
