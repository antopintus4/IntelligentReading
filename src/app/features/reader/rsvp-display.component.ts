import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-rsvp-display',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="rsvp-wrapper" (click)="playPauseClick.emit()">
      <!-- Previous words context -->
      <div class="context-words context-prev" [class.visible]="prevWords && !breakType">
        {{ prevWords }}
      </div>

      <!-- Main RSVP box -->
      <div class="rsvp-box"
           [class.playing]="isPlaying && !breakType"
           [class.pause-strong]="pauseType === 'strong'"
           [class.pause-medium]="pauseType === 'medium'"
           [class.pause-light]="pauseType === 'light'"
           [class.break-paragraph]="breakType === 'paragraph'"
           [class.break-chapter]="breakType === 'chapter'">
        <!-- Vertical guide line -->
        <div class="guide-line"></div>

        <!-- Pause type indicator (punteggiatura) -->
        @if (isPlaying && pauseType !== 'none' && !breakType) {
          <div class="pause-indicator" [class]="'pause-indicator--' + pauseType">
            {{ pauseLabel }}
          </div>
        }

        <!-- PARAGRAPH break overlay -->
        @if (breakType === 'paragraph') {
          <div class="break-overlay">
            <span class="break-icon">&#182;</span>
            <span class="break-label">Nuovo paragrafo</span>
          </div>
        }

        <!-- CHAPTER break overlay -->
        @if (breakType === 'chapter') {
          <div class="break-overlay break-overlay--chapter">
            <span class="break-icon chapter-icon">&#167;</span>
            <span class="break-chapter-title">{{ chapterTitle }}</span>
          </div>
        }

        <!-- Word display (hidden during structural breaks) -->
        @if (!breakType) {
          <div class="rsvp-word" [class.chunk-mode]="chunkSize > 1">
            @if (chunkSize === 1) {
              <span class="word-part word-start">{{ wordStart }}</span>
              <span class="word-pivot" [class]="'word-pivot--' + pauseType">{{ wordPivot }}</span>
              <span class="word-part word-end">{{ wordEnd }}</span>
            } @else {
              <span class="chunk-text">{{ currentChunk }}</span>
            }
          </div>
        }

        <!-- Subtle playing indicator -->
        @if (isPlaying && !breakType) {
          <div class="playing-dots">
            <span></span><span></span><span></span>
          </div>
        }
      </div>

      <!-- Next words context -->
      <div class="context-words context-next" [class.visible]="nextWords && !breakType">
        {{ nextWords }}
      </div>
    </div>
  `,
  styles: [`
    .rsvp-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
      width: 100%;
      cursor: pointer;
      user-select: none;
    }

    /* Context */
    .context-words {
      font-size: 17px;
      color: var(--text-muted);
      opacity: 0;
      max-width: 600px;
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      width: 100%;
      transition: opacity 0.3s;
      min-height: 26px;
    }
    .context-words.visible { opacity: 0.45; }

    /* RSVP box */
    .rsvp-box {
      position: relative;
      width: 100%;
      max-width: 680px;
      min-height: 180px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      transition: box-shadow 0.25s ease, border-color 0.25s ease;
    }
    /* Stato play normale */
    .rsvp-box.playing {
      border-color: var(--accent);
      box-shadow: 0 0 0 1px var(--accent), 0 16px 40px rgba(99, 102, 241, 0.15);
    }
    /* Pausa forte — fine frase (2.5×) */
    .rsvp-box.pause-strong {
      border-color: #f59e0b;
      box-shadow: 0 0 0 1px #f59e0b, 0 16px 40px rgba(245, 158, 11, 0.2);
    }
    /* Pausa media — virgola/due punti (1.6×) */
    .rsvp-box.pause-medium {
      border-color: #34d399;
      box-shadow: 0 0 0 1px #34d399, 0 16px 40px rgba(52, 211, 153, 0.15);
    }
    /* Pausa leggera — trattino/inciso (1.2-1.3×) */
    .rsvp-box.pause-light {
      border-color: #818cf8;
      box-shadow: 0 0 0 1px #818cf8, 0 16px 40px rgba(129, 140, 248, 0.12);
    }

    /* Pause indicator badge */
    .pause-indicator {
      position: absolute;
      top: 14px;
      right: 16px;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 3px 9px;
      border-radius: 999px;
      animation: fadeInDown 0.2s ease;
      pointer-events: none;
    }
    .pause-indicator--strong {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .pause-indicator--medium {
      background: rgba(52, 211, 153, 0.12);
      color: #34d399;
      border: 1px solid rgba(52, 211, 153, 0.3);
    }
    .pause-indicator--light {
      background: rgba(129, 140, 248, 0.12);
      color: #818cf8;
      border: 1px solid rgba(129, 140, 248, 0.3);
    }
    @keyframes fadeInDown {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* ── Structural break overlays ─────────────────────────────────────── */

    /* Paragrafo: bordo e sfondo turchese */
    .rsvp-box.break-paragraph {
      border-color: #06b6d4;
      box-shadow: 0 0 0 1px #06b6d4, 0 16px 40px rgba(6, 182, 212, 0.18);
    }
    /* Capitolo: bordo e sfondo dorato più intenso */
    .rsvp-box.break-chapter {
      border-color: #f59e0b;
      box-shadow: 0 0 0 2px #f59e0b, 0 20px 50px rgba(245, 158, 11, 0.25);
    }

    /* Contenitore overlay (riempie tutta la box) */
    .break-overlay {
      position: absolute; inset: 0;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 10px;
      animation: breakFadeIn 0.3s ease;
      z-index: 2;
    }
    .break-overlay--chapter { gap: 14px; }
    @keyframes breakFadeIn {
      from { opacity: 0; transform: scale(0.94); }
      to   { opacity: 1; transform: scale(1); }
    }

    /* Icona simbolo (¶ o §) */
    .break-icon {
      font-size: 42px;
      color: #06b6d4;
      line-height: 1;
      opacity: 0.9;
    }
    .chapter-icon { color: #f59e0b; font-size: 36px; }

    /* Etichetta "Nuovo paragrafo" */
    .break-label {
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: #06b6d4;
      opacity: 0.85;
    }

    /* Titolo capitolo (mostrato nella pausa capitolo) */
    .break-chapter-title {
      font-size: clamp(18px, 3vw, 28px);
      font-weight: 700;
      color: var(--text-primary);
      text-align: center;
      padding: 0 24px;
      line-height: 1.3;
    }

    .guide-line {
      position: absolute;
      top: 0; bottom: 0;
      left: 50%;
      width: 2px;
      background: var(--accent);
      opacity: 0.12;
      transform: translateX(-50%);
      pointer-events: none;
    }

    /* Word display */
    .rsvp-word {
      display: flex;
      align-items: baseline;
      justify-content: center;
      font-family: 'Georgia', 'Times New Roman', serif;
      font-size: clamp(36px, 6vw, 72px);
      font-weight: 600;
      letter-spacing: 0.02em;
      padding: 0 40px;
      z-index: 1;
    }
    .rsvp-word.chunk-mode {
      font-size: clamp(26px, 4vw, 52px);
    }
    .word-part {
      color: var(--text-primary);
    }
    .word-start { text-align: right; }
    .word-end { text-align: left; }
    /* Pivot: cambia colore in base al tipo di pausa */
    .word-pivot {
      color: var(--accent);
      font-weight: 800;
      transition: color 0.2s ease;
    }
    .word-pivot--strong { color: #f59e0b; }
    .word-pivot--medium { color: #34d399; }
    .word-pivot--light  { color: #818cf8; }
    .word-pivot--none   { color: var(--accent); }
    .chunk-text {
      color: var(--text-primary);
      text-align: center;
    }

    /* Playing dots */
    .playing-dots {
      position: absolute;
      bottom: 14px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 5px;
    }
    .playing-dots span {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: var(--accent);
      animation: bounce 1.2s ease-in-out infinite;
    }
    .playing-dots span:nth-child(2) { animation-delay: 0.2s; }
    .playing-dots span:nth-child(3) { animation-delay: 0.4s; }
    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
      40% { transform: scale(1); opacity: 1; }
    }
  `]
})
export class RsvpDisplayComponent {
  @Input() words: string[] = [];
  @Input() currentIndex = 0;
  @Input() chunkSize = 1;
  @Input() isPlaying = false;
  /** Moltiplicatore di pausa (punteggiatura) */
  @Input() pauseMultiplier = 1;
  /** Tipo di pausa strutturale: 'paragraph' | 'chapter' | null */
  @Input() breakType: 'paragraph' | 'chapter' | null = null;
  /** Titolo del capitolo (usato quando breakType === 'chapter') */
  @Input() chapterTitle = '';
  @Output() playPauseClick = new EventEmitter<void>();

  /**
   * Classifica il tipo di pausa per il feedback visivo:
   * 'strong' ≥ 2.0 | 'medium' ≥ 1.5 | 'light' ≥ 1.1 | 'none' = normale
   */
  get pauseType(): 'strong' | 'medium' | 'light' | 'none' {
    if (this.pauseMultiplier >= 2.0) return 'strong';
    if (this.pauseMultiplier >= 1.5) return 'medium';
    if (this.pauseMultiplier >= 1.1) return 'light';
    return 'none';
  }

  /** Etichetta testuale mostrata nel badge durante la pausa */
  get pauseLabel(): string {
    switch (this.pauseType) {
      case 'strong': return 'Fine frase';
      case 'medium': return 'Pausa';
      case 'light':  return 'Stacco';
      default:       return '';
    }
  }

  get currentChunk(): string {
    return this.words.slice(this.currentIndex, this.currentIndex + this.chunkSize).join(' ');
  }

  get currentWord(): string {
    return this.words[this.currentIndex] ?? '';
  }

  get wordStart(): string {
    const w = this.currentWord;
    if (!w) return '';
    const pivot = Math.max(1, Math.floor(w.length / 2));
    return w.slice(0, pivot - 1);
  }

  get wordPivot(): string {
    const w = this.currentWord;
    if (!w) return '';
    const pivot = Math.max(1, Math.floor(w.length / 2));
    return w.slice(pivot - 1, pivot);
  }

  get wordEnd(): string {
    const w = this.currentWord;
    if (!w) return '';
    const pivot = Math.max(1, Math.floor(w.length / 2));
    return w.slice(pivot);
  }

  get prevWords(): string {
    return this.words
      .slice(Math.max(0, this.currentIndex - 5), this.currentIndex)
      .join(' ');
  }

  get nextWords(): string {
    const end = Math.min(this.words.length, this.currentIndex + this.chunkSize + 5);
    return this.words
      .slice(this.currentIndex + this.chunkSize, end)
      .join(' ');
  }
}
