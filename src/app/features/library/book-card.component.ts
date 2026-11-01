import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LibraryEntry } from '../../shared/models/book.model';
import { LibraryService } from '../../core/services/library.service';

@Component({
  selector: 'app-book-card',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="book-card" [style.--cover-color]="entry.book.coverColor">
      <!-- Cover -->
      <div class="book-cover" [routerLink]="['/reader', entry.book.id]">
        <div class="cover-spine"></div>
        <div class="cover-body">
          <div class="cover-title">{{ entry.book.title }}</div>
          <div class="cover-format">{{ entry.book.format.toUpperCase() }}</div>
        </div>
        <!-- Progress overlay -->
        <div class="cover-progress-bar">
          <div class="cover-progress-fill" [style.width.%]="progressPercent"></div>
        </div>
      </div>

      <!-- Info -->
      <div class="book-info">
        <div class="book-title" [title]="entry.book.title">{{ entry.book.title }}</div>
        <div class="book-meta">
          <span class="book-percent">{{ progressPercent }}%</span>
          <span class="book-sep">·</span>
          <span class="book-pages">Pg {{ entry.progress.currentPage }}/{{ entry.book.totalPages }}</span>
        </div>
        <div class="book-last-read">{{ formatDate(entry.book.lastReadAt) }}</div>

        <!-- Stats snippet -->
        @if (entry.stats.totalTimeSeconds > 0) {
          <div class="book-stats">
            <span>⏱ {{ formatTime(entry.stats.totalTimeSeconds) }}</span>
            <span>· {{ entry.stats.totalWordsRead.toLocaleString() }} parole</span>
          </div>
        }
      </div>

      <!-- Actions -->
      <div class="book-actions">
        <a [routerLink]="['/reader', entry.book.id]" class="btn-read">Riprendi</a>
        <button class="btn-delete" (click)="onDelete($event)" title="Rimuovi dalla libreria">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .book-card {
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 16px;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      cursor: default;
    }
    .book-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 32px rgba(0,0,0,0.15);
    }

    /* Cover */
    .book-cover {
      position: relative;
      height: 160px;
      background: var(--cover-color, #6366f1);
      border-radius: 10px;
      display: flex;
      overflow: hidden;
      cursor: pointer;
      transition: filter 0.2s;
    }
    .book-cover:hover { filter: brightness(1.1); }
    .cover-spine {
      width: 14px;
      background: rgba(0,0,0,0.25);
      flex-shrink: 0;
    }
    .cover-body {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 12px;
      gap: 6px;
    }
    .cover-title {
      font-size: 13px;
      font-weight: 700;
      color: rgba(255,255,255,0.95);
      line-height: 1.4;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
    }
    .cover-format {
      font-size: 10px;
      font-weight: 600;
      color: rgba(255,255,255,0.6);
      letter-spacing: 0.1em;
    }
    .cover-progress-bar {
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 4px;
      background: rgba(0,0,0,0.2);
    }
    .cover-progress-fill {
      height: 100%;
      background: rgba(255,255,255,0.7);
      transition: width 0.4s ease;
    }

    /* Info */
    .book-info { display: flex; flex-direction: column; gap: 4px; }
    .book-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .book-meta {
      font-size: 12px;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .book-percent { color: var(--accent); font-weight: 600; }
    .book-sep { color: var(--border); }
    .book-last-read { font-size: 11px; color: var(--text-muted); }
    .book-stats {
      font-size: 11px;
      color: var(--text-muted);
      display: flex;
      gap: 4px;
    }

    /* Actions */
    .book-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .btn-read {
      flex: 1;
      text-align: center;
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.2s, transform 0.1s;
    }
    .btn-read:hover { background: var(--accent-hover); transform: scale(1.02); }
    .btn-delete {
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 8px;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      align-items: center;
      transition: color 0.2s, border-color 0.2s;
    }
    .btn-delete:hover { color: #ef4444; border-color: #ef4444; }
  `]
})
export class BookCardComponent {
  @Input() entry!: LibraryEntry;
  @Output() deleted = new EventEmitter<string>();

  constructor(private libraryService: LibraryService) {}

  get progressPercent(): number {
    return this.libraryService.getProgressPercent(this.entry.book.id);
  }

  formatDate(isoDate: string): string {
    const d = new Date(isoDate);
    return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatTime(seconds: number): string {
    return this.libraryService.formatTime(seconds);
  }

  onDelete(e: Event): void {
    e.stopPropagation();
    if (confirm(`Rimuovere "${this.entry.book.title}" dalla libreria?`)) {
      this.deleted.emit(this.entry.book.id);
    }
  }
}
