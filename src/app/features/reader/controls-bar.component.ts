import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface OutlineItem { title: string; page: number; }

@Component({
  selector: 'app-controls-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="controls-bar">

      <!-- Progress bar row -->
      <div class="progress-row">
        <span class="pg-label">Pg {{ currentPage }}</span>
        <div class="progress-track" (click)="onProgressClick($event)">
          <div class="progress-fill" [style.width.%]="pagePercent"></div>
          <div class="progress-thumb" [style.left.%]="pagePercent"></div>
        </div>
        <span class="pg-label">{{ totalPages }}</span>
        <span class="pct-badge">{{ pagePercent }}%</span>
      </div>

      <!-- Word-level progress -->
      <div class="word-progress-row">
        <div class="word-progress-track">
          <div class="word-progress-fill" [style.width.%]="wordPercent"></div>
        </div>
        <span class="word-label">{{ currentWordIndex + 1 }} / {{ totalWords }} parole</span>
      </div>

      <!-- Main controls row -->
      <div class="main-controls">

        <!-- Left: Page navigation + Chapters -->
        <div class="controls-left">
          <button class="btn-nav" (click)="prevPage.emit()" [disabled]="currentPage <= 1" title="Pagina precedente (←)">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <span class="page-indicator">{{ currentPage }} / {{ totalPages }}</span>
          <button class="btn-nav" (click)="nextPage.emit()" [disabled]="currentPage >= totalPages" title="Pagina successiva (→)">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

          @if (outline.length > 0) {
            <div class="chapters-dropdown">
              <button class="btn-nav btn-chapters" (click)="showChapters = !showChapters" title="Capitoli">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="15" y2="18"/>
                </svg>
                Capitoli
              </button>
              @if (showChapters) {
                <div class="chapters-panel" (clickOutside)="showChapters = false">
                  @for (ch of outline; track ch.page) {
                    <button class="chapter-item" [class.active]="isCurrentChapter(ch)"
                      (click)="jumpToChapter.emit(ch.page); showChapters = false">
                      {{ ch.title }}
                    </button>
                  }
                </div>
              }
            </div>
          }
        </div>

        <!-- Center: Playback -->
        <div class="controls-center">
          <button class="btn-skip" (click)="skipBack.emit()" title="Indietro 10 parole (↑)">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
              fill="currentColor" stroke="none">
              <path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
            </svg>
          </button>

          <button class="btn-play" (click)="playPause.emit()" [class.playing]="isPlaying" title="Play/Pausa (Spazio)">
            @if (isPlaying) {
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
              </svg>
            } @else {
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" style="margin-left:3px"/>
              </svg>
            }
          </button>

          <button class="btn-skip" (click)="skipForward.emit()" title="Avanti 10 parole (↓)">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
              fill="currentColor" stroke="none">
              <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z"/>
            </svg>
          </button>
        </div>

        <!-- Right: Speed + Chunk -->
        <div class="controls-right">
          <!-- Chunk size -->
          <div class="chunk-control">
            <span class="control-label">Parole</span>
            <div class="chunk-buttons">
              @for (n of [1, 2, 3]; track n) {
                <button class="chunk-btn" [class.active]="chunkSize === n"
                  (click)="chunkSizeChange.emit(n)">{{ n }}</button>
              }
            </div>
          </div>

          <!-- WPM -->
          <div class="wpm-control">
            <div class="wpm-header">
              <span class="control-label">Velocità</span>
              <span class="wpm-value">{{ wpm }} wpm</span>
            </div>
            <input type="range" min="100" max="1000" step="25"
              [value]="wpm" (input)="onWpmChange($event)"
              class="wpm-slider" title="+/- con tasto su/giù" />
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .controls-bar {
      background: var(--surface);
      border-top: 1px solid var(--border);
      padding: 12px 24px 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    /* Progress bars */
    .progress-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .pg-label { font-size: 12px; color: var(--text-muted); min-width: 32px; }
    .progress-track {
      flex: 1;
      height: 6px;
      background: var(--surface-hover);
      border-radius: 999px;
      cursor: pointer;
      position: relative;
    }
    .progress-fill {
      height: 100%;
      background: var(--accent);
      border-radius: 999px;
      transition: width 0.2s;
    }
    .progress-thumb {
      position: absolute;
      top: 50%; transform: translate(-50%, -50%);
      width: 14px; height: 14px;
      background: var(--accent);
      border: 2px solid var(--surface);
      border-radius: 50%;
      box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      transition: left 0.2s;
    }
    .pct-badge {
      font-size: 12px;
      font-weight: 700;
      color: var(--accent);
      min-width: 36px;
      text-align: right;
    }

    .word-progress-row {
      display: flex; align-items: center; gap: 10px;
    }
    .word-progress-track {
      flex: 1; height: 3px;
      background: var(--surface-hover);
      border-radius: 999px;
    }
    .word-progress-fill {
      height: 100%; background: var(--accent);
      opacity: 0.5; border-radius: 999px;
      transition: width 0.1s;
    }
    .word-label { font-size: 11px; color: var(--text-muted); min-width: 110px; text-align: right; }

    /* Main controls */
    .main-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .controls-left, .controls-right {
      display: flex; align-items: center; gap: 10px;
    }
    .controls-center {
      display: flex; align-items: center; gap: 12px;
    }

    /* Nav buttons */
    .btn-nav {
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 7px;
      color: var(--text-muted);
      cursor: pointer;
      display: flex; align-items: center; gap: 5px;
      font-size: 13px;
      transition: all 0.15s;
    }
    .btn-nav:hover:not(:disabled) { color: var(--text-primary); background: var(--surface-hover); }
    .btn-nav:disabled { opacity: 0.35; cursor: not-allowed; }

    /* Play button */
    .btn-play {
      width: 60px; height: 60px;
      border-radius: 50%;
      background: var(--accent);
      border: none;
      color: white;
      cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: background 0.2s, transform 0.1s, box-shadow 0.2s;
      box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
    }
    .btn-play:hover { background: var(--accent-hover); transform: scale(1.06); }
    .btn-play:active { transform: scale(0.95); }
    .btn-play.playing {
      background: var(--surface);
      border: 2px solid var(--accent);
      color: var(--accent);
      box-shadow: none;
    }

    /* Skip buttons */
    .btn-skip {
      background: transparent;
      border: none;
      padding: 8px;
      color: var(--text-muted);
      cursor: pointer;
      border-radius: 50%;
      display: flex; align-items: center;
      transition: color 0.2s, background 0.2s;
    }
    .btn-skip:hover { color: var(--accent); background: color-mix(in srgb, var(--accent) 10%, transparent); }

    /* Chapters dropdown */
    .chapters-dropdown { position: relative; }
    .btn-chapters { padding: 7px 12px; }
    .chapters-panel {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 0;
      min-width: 240px;
      max-height: 280px;
      overflow-y: auto;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.2);
      padding: 6px;
      z-index: 200;
    }
    .chapter-item {
      display: block; width: 100%;
      text-align: left;
      padding: 9px 12px;
      background: transparent; border: none;
      color: var(--text-primary);
      font-size: 13px;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s;
    }
    .chapter-item:hover { background: var(--surface-hover); }
    .chapter-item.active { color: var(--accent); font-weight: 600; }

    /* Chunk control */
    .control-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      font-weight: 600;
    }
    .chunk-control { display: flex; align-items: center; gap: 8px; }
    .chunk-buttons { display: flex; gap: 4px; }
    .chunk-btn {
      width: 30px; height: 30px;
      border: 1px solid var(--border);
      border-radius: 7px;
      background: transparent;
      color: var(--text-muted);
      font-size: 13px; font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
    }
    .chunk-btn.active {
      background: var(--accent);
      border-color: var(--accent);
      color: white;
    }
    .chunk-btn:hover:not(.active) { border-color: var(--accent); color: var(--accent); }

    /* WPM control */
    .wpm-control { display: flex; flex-direction: column; gap: 4px; min-width: 140px; }
    .wpm-header { display: flex; justify-content: space-between; align-items: center; }
    .wpm-value { font-size: 13px; font-weight: 700; color: var(--accent); }
    .wpm-slider {
      width: 100%;
      accent-color: var(--accent);
      height: 4px;
      cursor: pointer;
    }

    @media (max-width: 700px) {
      .controls-right { flex-direction: column; align-items: flex-end; gap: 6px; }
      .main-controls { flex-wrap: wrap; }
    }
  `]
})
export class ControlsBarComponent {
  @Input() currentPage = 1;
  @Input() totalPages = 1;
  @Input() currentWordIndex = 0;
  @Input() totalWords = 0;
  @Input() wpm = 300;
  @Input() chunkSize = 1;
  @Input() isPlaying = false;
  @Input() outline: OutlineItem[] = [];

  @Output() playPause = new EventEmitter<void>();
  @Output() skipBack = new EventEmitter<void>();
  @Output() skipForward = new EventEmitter<void>();
  @Output() prevPage = new EventEmitter<void>();
  @Output() nextPage = new EventEmitter<void>();
  @Output() wpmChange = new EventEmitter<number>();
  @Output() chunkSizeChange = new EventEmitter<number>();
  @Output() jumpToChapter = new EventEmitter<number>();
  @Output() seekToPage = new EventEmitter<number>();

  showChapters = false;

  get pagePercent(): number {
    if (this.totalPages === 0) return 0;
    return Math.round(((this.currentPage - 1) / this.totalPages) * 100);
  }

  get wordPercent(): number {
    if (this.totalWords === 0) return 0;
    return Math.round((this.currentWordIndex / this.totalWords) * 100);
  }

  onWpmChange(e: Event): void {
    this.wpmChange.emit(Number((e.target as HTMLInputElement).value));
  }

  onProgressClick(e: MouseEvent): void {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const page = Math.max(1, Math.ceil(pct * this.totalPages));
    this.seekToPage.emit(page);
  }

  isCurrentChapter(ch: OutlineItem): boolean {
    const idx = this.outline.indexOf(ch);
    const next = this.outline[idx + 1];
    return this.currentPage >= ch.page && (!next || this.currentPage < next.page);
  }
}
