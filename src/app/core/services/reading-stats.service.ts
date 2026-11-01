import { Injectable } from '@angular/core';
import { ReadingSession } from '../../shared/models/book.model';
import { LibraryService } from './library.service';

@Injectable({ providedIn: 'root' })
export class ReadingStatsService {

  private sessionStartTime: number | null = null;
  private sessionWordsRead = 0;
  private sessionWpmReadings: number[] = [];
  private currentBookId: string | null = null;

  constructor(private libraryService: LibraryService) {}

  // ─── Session Management ───────────────────────────────────────────────────

  startSession(bookId: string): void {
    this.currentBookId = bookId;
    this.sessionStartTime = Date.now();
    this.sessionWordsRead = 0;
    this.sessionWpmReadings = [];
  }

  /** Chiamato ad ogni parola avanzata durante la riproduzione */
  recordWordRead(currentWpm: number): void {
    this.sessionWordsRead++;
    this.sessionWpmReadings.push(currentWpm);
  }

  endSession(): ReadingSession | null {
    if (!this.sessionStartTime || !this.currentBookId) return null;

    const durationSeconds = Math.round((Date.now() - this.sessionStartTime) / 1000);
    if (durationSeconds < 5 || this.sessionWordsRead < 1) return null;

    const averageWpm = this.sessionWpmReadings.length > 0
      ? Math.round(this.sessionWpmReadings.reduce((a, b) => a + b, 0) / this.sessionWpmReadings.length)
      : 0;

    const session: ReadingSession = {
      bookId: this.currentBookId,
      startedAt: new Date(this.sessionStartTime).toISOString(),
      durationSeconds,
      wordsRead: this.sessionWordsRead,
      averageWpm,
    };

    this.libraryService.addSession(session);
    this.reset();
    return session;
  }

  private reset(): void {
    this.sessionStartTime = null;
    this.sessionWordsRead = 0;
    this.sessionWpmReadings = [];
    this.currentBookId = null;
  }

  // ─── Utility ──────────────────────────────────────────────────────────────

  /** Stima il tempo di lettura rimanente in minuti */
  estimateRemainingMinutes(wordsLeft: number, wpm: number): number {
    if (wpm <= 0) return 0;
    return Math.ceil(wordsLeft / wpm);
  }

  formatDuration(seconds: number): string {
    return this.libraryService.formatTime(seconds);
  }
}
