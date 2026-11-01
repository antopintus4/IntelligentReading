import {
  Component, OnInit, OnDestroy, HostListener, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LibraryService } from '../../core/services/library.service';
import { PdfParserService } from '../../core/services/pdf-parser.service';
const PB = PdfParserService.PARAGRAPH_BREAK;
const CB = PdfParserService.CHAPTER_BREAK_PREFIX;
import { ReadingStatsService } from '../../core/services/reading-stats.service';
import { FileStorageService } from '../../core/services/file-storage.service';
import { RsvpDisplayComponent } from './rsvp-display.component';
import { FullTextDisplayComponent } from './full-text-display.component';
import { ControlsBarComponent, OutlineItem } from './controls-bar.component';
import { Book, ReadingProgress } from '../../shared/models/book.model';

@Component({
  selector: 'app-reader',
  standalone: true,
  imports: [CommonModule, RouterModule, RsvpDisplayComponent, FullTextDisplayComponent, ControlsBarComponent],
  template: `
    <div class="reader-page" [class.fullscreen]="isFullscreen()">

      <!-- Top bar -->
      <div class="reader-topbar">
        <button class="btn-back" (click)="goBack()" title="Torna alla libreria">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Libreria
        </button>

        <div class="reader-title">{{ book()?.title ?? '' }}</div>

        <div class="topbar-actions">
          <!-- Mode switcher (RSVP vs FullText) -->
          @if (fileLoaded() && !isLoading()) {
            <div class="mode-toggle-group">
              <button
                class="btn-mode-tab"
                [class.active]="viewMode() === 'rsvp'"
                (click)="viewMode.set('rsvp')"
                title="Modalità RSVP (V)"
              >
                RSVP
              </button>
              <button
                class="btn-mode-tab"
                [class.active]="viewMode() === 'fulltext'"
                (click)="viewMode.set('fulltext')"
                title="Modalità Testo / Bionic (V)"
              >
                Testo
              </button>
            </div>

            @if (viewMode() === 'fulltext') {
              <button
                class="btn-bionic"
                [class.active]="bionicEnabled()"
                (click)="bionicEnabled.update(v => !v)"
                title="Attiva/Disattiva Bionic Reading (B)"
              >
                <b>Bio</b>nic
              </button>
            }
          }

          <!-- Stats pill -->
          @if (isPlaying()) {
            <div class="stats-pill">
              <span class="pill-wpm">{{ wpm() }} wpm</span>
              <span class="pill-sep">·</span>
              <span>~{{ estimatedMinutes() }} min rimasti</span>
            </div>
          }

          <!-- Fullscreen toggle -->
          <button class="btn-icon-top" (click)="toggleFullscreen()" title="Schermo intero (F)">
            @if (!isFullscreen()) {
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
              </svg>
            } @else {
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 0 2 2v3"/>
              </svg>
            }
          </button>
        </div>
      </div>

      <!-- Upload overlay (se il file non è caricato) -->
      @if (!fileLoaded() && !isLoading()) {
        <div class="upload-prompt">
          <div class="upload-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
          </div>
          <h2>Carica il file per iniziare</h2>
          <p>Il tuo progresso è salvato. Ricarica il file per riprendere dalla pagina {{ savedPage() }}.</p>
          <label class="btn-upload-reader">
            <input type="file" [accept]="fileAccept()" (change)="onFileUpload($event)" hidden />
            Carica {{ book()?.format?.toUpperCase() }}
          </label>
        </div>
      }

      <!-- Loading -->
      @if (isLoading()) {
        <div class="loading-screen">
          <div class="loading-spinner"></div>
          <p>{{ loadingMessage() }}</p>
        </div>
      }

      <!-- Main Reader (Dual-Mode: RSVP vs FullText) -->
      @if (fileLoaded() && !isLoading()) {
        <div class="reader-canvas" [class.canvas-fulltext]="viewMode() === 'fulltext'">
          @if (viewMode() === 'rsvp') {
            <app-rsvp-display
              [words]="currentWords()"
              [currentIndex]="currentWordIndex()"
              [chunkSize]="chunkSize()"
              [isPlaying]="isPlaying()"
              [pauseMultiplier]="pauseMultiplier()"
              [breakType]="activeBreak()"
              [chapterTitle]="activeChapterTitle()"
              (playPauseClick)="togglePlay()"
            />
          } @else {
            <app-full-text-display
              [words]="currentWords()"
              [currentIndex]="currentWordIndex()"
              [isPlaying]="isPlaying()"
              [bionicEnabled]="bionicEnabled()"
              (wordClick)="onFullTextWordClick($event)"
            />
          }
        </div>

        <!-- Controls -->
        <app-controls-bar
          [currentPage]="currentPage()"
          [totalPages]="totalPages()"
          [currentWordIndex]="currentWordIndex()"
          [totalWords]="currentWords().length"
          [wpm]="wpm()"
          [chunkSize]="chunkSize()"
          [isPlaying]="isPlaying()"
          [outline]="outline()"
          (playPause)="togglePlay()"
          (skipBack)="skipWords(-10)"
          (skipForward)="skipWords(10)"
          (prevPage)="loadPage(currentPage() - 1)"
          (nextPage)="loadPage(currentPage() + 1)"
          (wpmChange)="setWpm($event)"
          (chunkSizeChange)="setChunkSize($event)"
          (jumpToChapter)="loadPage($event)"
          (seekToPage)="loadPage($event)"
        />
      }
    </div>
  `,
  styles: [`
    .reader-page {
      display: flex;
      flex-direction: column;
      height: 100vh;
      background: var(--bg);
      color: var(--text-primary);
      overflow: hidden;
    }
    .reader-page.fullscreen .reader-topbar { opacity: 0; transition: opacity 0.3s; pointer-events: none; }
    .reader-page.fullscreen:hover .reader-topbar { opacity: 1; pointer-events: auto; }

    /* Top bar */
    .reader-topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 24px;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
      z-index: 50;
      transition: opacity 0.3s;
    }
    .btn-back {
      display: flex; align-items: center; gap: 6px;
      background: transparent; border: 1px solid var(--border);
      border-radius: 8px; padding: 7px 12px;
      color: var(--text-muted); font-size: 13px;
      cursor: pointer; transition: all 0.15s;
    }
    .btn-back:hover { color: var(--text-primary); background: var(--surface-hover); }
    .reader-title {
      font-size: 15px; font-weight: 700;
      color: var(--text-primary);
      max-width: 40%;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      text-align: center;
    }
    .topbar-actions { display: flex; align-items: center; gap: 10px; }
    .stats-pill {
      display: flex; align-items: center; gap: 6px;
      background: color-mix(in srgb, var(--accent) 12%, transparent);
      border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
      color: var(--accent);
      font-size: 12px; font-weight: 600;
      padding: 5px 12px; border-radius: 999px;
      animation: fadeIn 0.3s;
    }
    .pill-sep { opacity: 0.5; }
    .btn-icon-top {
      background: transparent; border: 1px solid var(--border);
      border-radius: 8px; padding: 8px;
      color: var(--text-muted); cursor: pointer;
      display: flex; align-items: center;
      transition: all 0.15s;
    }
    .btn-icon-top:hover { color: var(--text-primary); background: var(--surface-hover); }

    /* Upload prompt */
    .upload-prompt {
      flex: 1;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      gap: 14px; text-align: center; padding: 32px;
    }
    .upload-icon {
      width: 96px; height: 96px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 24px;
      display: flex; align-items: center; justify-content: center;
      color: var(--accent);
    }
    .upload-prompt h2 { font-size: 24px; font-weight: 800; margin: 0; }
    .upload-prompt p { font-size: 14px; color: var(--text-muted); max-width: 380px; margin: 0; }
    .btn-upload-reader {
      display: inline-flex; align-items: center; gap: 8px;
      background: var(--accent); color: white;
      border: none; border-radius: 12px;
      padding: 12px 28px; font-size: 15px; font-weight: 600;
      cursor: pointer; transition: background 0.2s;
    }
    .btn-upload-reader:hover { background: var(--accent-hover); }

    /* Loading */
    .loading-screen {
      flex: 1;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 16px;
      color: var(--text-muted);
    }
    .loading-spinner {
      width: 48px; height: 48px;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .mode-toggle-group {
      display: flex;
      background: var(--surface-hover);
      border: 1px solid var(--border);
      border-radius: 9px;
      padding: 2px;
      gap: 2px;
    }
    .btn-mode-tab {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 12px;
      font-weight: 700;
      padding: 5px 12px;
      border-radius: 7px;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .btn-mode-tab:hover {
      color: var(--text-primary);
    }
    .btn-mode-tab.active {
      background: var(--surface);
      color: var(--accent);
      box-shadow: 0 1px 4px rgba(0,0,0,0.12);
    }
    .btn-bionic {
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 5px 10px;
      color: var(--text-muted);
      font-size: 12px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-bionic:hover {
      color: var(--text-primary);
    }
    .btn-bionic.active {
      border-color: var(--accent);
      color: var(--accent);
      background: color-mix(in srgb, var(--accent) 12%, transparent);
    }

    /* RSVP canvas */
    .reader-canvas {
      flex: 1;
      display: flex; align-items: center; justify-content: center;
      padding: 24px;
      overflow: hidden;
    }
    .reader-canvas.canvas-fulltext {
      align-items: stretch;
      padding: 0;
    }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; } }
  `]
})
export class ReaderComponent implements OnInit, OnDestroy {

  // Signals
  viewMode = signal<'rsvp' | 'fulltext'>('rsvp');
  bionicEnabled = signal(true);
  book = signal<Book | null>(null);
  fileLoaded = signal(false);
  isLoading = signal(false);
  loadingMessage = signal('Caricamento...');
  currentPage = signal(1);
  totalPages = signal(0);
  currentWords = signal<string[]>([]);
  currentWordIndex = signal(0);
  isPlaying = signal(false);
  wpm = signal(300);
  /** Moltiplicatore di pausa attivo (1 = normale, >1 = rallentamento per punteggiatura) */
  pauseMultiplier = signal(1);
  chunkSize = signal(1);
  outline = signal<OutlineItem[]>([]);
  isFullscreen = signal(false);
  savedPage = signal(1);
  /** Tipo di pausa strutturale corrente: null = nessuna, 'paragraph' o 'chapter' */
  activeBreak = signal<'paragraph' | 'chapter' | null>(null);
  activeChapterTitle = signal('');

  private pdfDoc: any = null;
  private epubSections: string[][] = [];
  private txtPages: string[][] = [];
  private playInterval: any = null;
  private saveTimeout: any = null;
  private bookId = '';

  estimatedMinutes = computed(() => {
    const wordsLeft = this.currentWords().length - this.currentWordIndex();
    return this.statsService.estimateRemainingMinutes(wordsLeft, this.wpm());
  });

  fileAccept = computed(() => {
    const fmt = this.book()?.format;
    if (fmt === 'epub') return '.epub';
    if (fmt === 'txt') return '.txt';
    return '.pdf';
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private libraryService: LibraryService,
    private pdfParser: PdfParserService,
    private statsService: ReadingStatsService,
    private fileStorage: FileStorageService
  ) {}

  ngOnInit(): void {
    this.bookId = this.route.snapshot.paramMap.get('bookId') ?? '';
    const book = this.libraryService.getBook(this.bookId);
    if (!book) { this.router.navigate(['/library']); return; }

    this.book.set(book);

    const progress = this.libraryService.getProgress(this.bookId);
    if (progress) {
      this.currentPage.set(progress.currentPage);
      this.currentWordIndex.set(progress.currentWordIndex);
      this.wpm.set(progress.wpm);
      this.chunkSize.set(progress.chunkSize);
      this.savedPage.set(progress.currentPage);
    }

    // Applica tema salvato
    const theme = localStorage.getItem('ir_theme') ?? 'dark';
    document.documentElement.setAttribute('data-theme', theme);

    // Tenta il recupero automatico del file da IndexedDB
    this.checkAndAutoLoadStoredFile();
  }

  private async checkAndAutoLoadStoredFile(): Promise<void> {
    try {
      this.isLoading.set(true);
      this.loadingMessage.set('Recupero libro dalla memoria...');
      const blob = await this.fileStorage.getFile(this.bookId);
      if (blob) {
        await this.loadBookBlob(blob);
      }
    } catch (err) {
      console.warn('File non trovato in memoria locale:', err);
    } finally {
      if (!this.fileLoaded()) {
        this.isLoading.set(false);
      }
    }
  }

  ngOnDestroy(): void {
    this.stopPlay();
    this.saveProgress();
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
  }

  // ─── File Upload & Loading ────────────────────────────────────────────────

  async onFileUpload(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file || !this.book()) return;

    try {
      await this.fileStorage.saveFile(this.bookId, file);
      await this.loadBookBlob(file);
    } catch (err) {
      console.error('Errore nel salvataggio e caricamento del file:', err);
      alert('Errore nel caricamento del file.');
      this.isLoading.set(false);
    }
  }

  async loadBookBlob(blob: Blob | File): Promise<void> {
    this.isLoading.set(true);
    this.stopPlay();

    try {
      const format = this.book()!.format;

      if (format === 'pdf') {
        this.loadingMessage.set('Caricamento PDF...');
        const { pdfDoc, numPages, outline } = await this.pdfParser.loadPdf(blob);
        this.pdfDoc = pdfDoc;
        this.totalPages.set(numPages);
        this.outline.set(outline);

        this.loadingMessage.set('Estrazione testo...');
        const page = this.currentPage();
        const words = await this.pdfParser.extractPageWordsWithStructure(pdfDoc, page);
        this.currentWords.set(words);

        // Ripristina indice parola salvato
        const progress = this.libraryService.getProgress(this.bookId);
        if (progress && progress.currentPage === page) {
          this.currentWordIndex.set(Math.min(progress.currentWordIndex, Math.max(0, words.length - 1)));
        } else {
          this.currentWordIndex.set(0);
        }

      } else if (format === 'epub') {
        this.loadingMessage.set('Caricamento ePub...');
        const { sections, totalSections } = await this.pdfParser.loadEpub(blob);
        this.epubSections = sections;
        this.totalPages.set(totalSections);
        const page = this.currentPage();
        const idx = Math.min(page - 1, Math.max(0, sections.length - 1));
        const words = sections[idx] ?? [];
        this.currentWords.set(words);

        const progress = this.libraryService.getProgress(this.bookId);
        if (progress && progress.currentPage === page) {
          this.currentWordIndex.set(Math.min(progress.currentWordIndex, Math.max(0, words.length - 1)));
        } else {
          this.currentWordIndex.set(0);
        }

      } else if (format === 'txt') {
        this.loadingMessage.set('Caricamento testo...');
        const { words, totalPages } = await this.pdfParser.loadTxt(blob);
        this.txtPages = words;
        this.totalPages.set(totalPages);
        const page = this.currentPage();
        const idx = Math.min(page - 1, Math.max(0, words.length - 1));
        const wordsList = words[idx] ?? [];
        this.currentWords.set(wordsList);

        const progress = this.libraryService.getProgress(this.bookId);
        if (progress && progress.currentPage === page) {
          this.currentWordIndex.set(Math.min(progress.currentWordIndex, Math.max(0, wordsList.length - 1)));
        } else {
          this.currentWordIndex.set(0);
        }
      }

      this.fileLoaded.set(true);
    } catch (err) {
      console.error('Errore caricamento libro:', err);
      this.fileLoaded.set(false);
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  // ─── Page Navigation ──────────────────────────────────────────────────────

  /** Navigazione manuale (da UI): interrompe la lettura e carica la pagina. */
  async loadPage(pageNum: number, wordIndex = 0): Promise<void> {
    if (!this.pdfDoc && this.book()?.format === 'pdf') return;
    this.stopPlay();
    await this.internalLoadPage(pageNum, wordIndex);
  }

  /**
   * Caricamento interno — NON chiama stopPlay, usato sia dalla navigazione
   * manuale (dopo stopPlay) sia dall'auto-avanzamento pagina durante la lettura.
   */
  private async internalLoadPage(pageNum: number, wordIndex = 0): Promise<void> {
    const clampedPage = Math.max(1, Math.min(pageNum, this.totalPages()));
    this.isLoading.set(true);
    this.loadingMessage.set('Estrazione testo...');
    try {
      let words: string[] = [];
      if (this.book()?.format === 'epub') {
        const idx = Math.min(clampedPage - 1, Math.max(0, this.epubSections.length - 1));
        words = this.epubSections[idx] ?? [];
      } else if (this.book()?.format === 'txt') {
        const idx = Math.min(clampedPage - 1, Math.max(0, this.txtPages.length - 1));
        words = this.txtPages[idx] ?? [];
      } else {
        words = await this.pdfParser.extractPageWordsWithStructure(this.pdfDoc, clampedPage);
      }

      this.currentPage.set(clampedPage);
      this.currentWords.set(words);
      // Salta l'indice in avanti fino alla prima parola reale (non-sentinella)
      let startIdx = Math.min(wordIndex, Math.max(0, words.length - 1));
      while (startIdx < words.length && (words[startIdx] === PB || words[startIdx]?.startsWith(CB))) {
        startIdx++;
      }
      this.currentWordIndex.set(startIdx);
    } finally {
      this.isLoading.set(false);
    }
    this.scheduleSave();
  }

  // ─── Playback ─────────────────────────────────────────────────────────────

  togglePlay(): void {
    if (this.isPlaying()) {
      this.stopPlay();
    } else {
      this.startPlay();
    }
  }

  /**
   * Quick Rewind: alla ripresa della lettura, riavvolge di qualche parola
   * per ripristinare il contesto cognitivo dell'utente.
   */
  private applyQuickRewind(): void {
    const words = this.currentWords();
    const curr = this.currentWordIndex();
    if (curr <= 0 || words.length === 0) return;

    const REWIND_WORDS = 4;
    let target = Math.max(0, curr - REWIND_WORDS);

    // Evita di posizionarsi esattamente su sentinelle
    while (target < curr && (words[target] === PB || words[target]?.startsWith(CB))) {
      target++;
    }

    this.currentWordIndex.set(target);
  }

  private startPlay(): void {
    this.applyQuickRewind();
    this.isPlaying.set(true);
    this.statsService.startSession(this.bookId);

    const tick = () => {
      const words = this.currentWords();
      const idx   = this.currentWordIndex();
      const chunk = this.chunkSize();

      // ── Auto-avanzamento pagina ────────────────────────────────────────────
      if (idx >= words.length) {
        if (this.currentPage() < this.totalPages()) {
          this.internalLoadPage(this.currentPage() + 1, 0).then(() => {
            if (this.isPlaying()) this.scheduleNextTick(tick, '');
          });
        } else {
          this.stopPlay();
        }
        return;
      }

      const word = words[idx];

      // ── Sentinella PARAGRAFO ───────────────────────────────────────────────
      if (word === PB) {
        this.currentWordIndex.set(idx + 1);
        this.activeBreak.set('paragraph');
        const pauseMs = Math.min(Math.max(700, (60000 / this.wpm()) * 2.5), 2500);
        this.playInterval = setTimeout(() => {
          this.activeBreak.set(null);
          tick();
        }, pauseMs);
        return;
      }

      // ── Sentinella CAPITOLO ────────────────────────────────────────────────
      if (word?.startsWith(CB)) {
        const title = word.slice(CB.length);
        this.currentWordIndex.set(idx + 1);
        this.activeBreak.set('chapter');
        this.activeChapterTitle.set(title);
        const pauseMs = Math.min(Math.max(2000, (60000 / this.wpm()) * 6), 6000);
        this.playInterval = setTimeout(() => {
          this.activeBreak.set(null);
          tick();
        }, pauseMs);
        return;
      }

      // ── Parola/chunk normale ───────────────────────────────────────────────
      // Il chunk non attraversa sentinella: raccoglie solo token-parola
      const chunkWords: string[] = [];
      let scanIdx = idx;
      while (chunkWords.length < chunk && scanIdx < words.length) {
        const w = words[scanIdx];
        if (w === PB || w?.startsWith(CB)) break;
        chunkWords.push(w);
        scanIdx++;
      }
      const displayedWord = chunkWords.join(' ');
      const advanceTo = scanIdx; // = idx + chunkWords.length

      this.statsService.recordWordRead(this.wpm());

      if (advanceTo >= words.length) {
        if (this.currentPage() < this.totalPages()) {
          this.internalLoadPage(this.currentPage() + 1, 0).then(() => {
            if (this.isPlaying()) this.scheduleNextTick(tick, '');
          });
        } else {
          this.stopPlay();
        }
        return;
      }

      this.currentWordIndex.set(advanceTo);
      this.scheduleSave();
      this.scheduleNextTick(tick, displayedWord);
    };

    this.scheduleNextTick(tick, '');
  }


  /**
   * Calcola il moltiplicatore di pausa in base alla punteggiatura
   * della parola (o chunk) corrente.
   *
   * Gerarchia delle pause:
   *  [.!?…]   → 2.5× — Fine frase: pausa lunga per reset cognitivo
   *  [,;:]    → 1.6× — Clausola: pausa media per sub-unità sintattiche
   *  [—–-()]  → 1.3× — Inciso/trattino: lieve rallentamento
   *  >9 char  → 1.1× — Parola lunga: micro-pausa per decodifica
   *  default  → 1.0× — Velocità nominale
   */
  private getPauseMultiplier(word: string): number {
    if (!word) return 1;

    // Rimuovi virgolette/apici periferici prima di analizzare
    const clean = word.replace(/^[\u00ab\u00bb"'"'\u201c\u201d\u2018\u2019]+|[\u00ab\u00bb"'"'\u201c\u201d\u2018\u2019]+$/g, '').trim();

    // Fine frase forte (punto, esclamativo, interrogativo, ellissi)
    if (/[.!?\u2026]$/.test(clean) || clean === '...') return 2.5;

    // Pausa di clausola (virgola, punto+virgola, due punti)
    if (/[,;:]$/.test(clean)) return 1.6;

    // Em-dash, en-dash, trattino, parentesi/parentesi quadra chiusa
    if (/[\u2014\u2013]/.test(clean) || /[)\]]+$/.test(clean)) return 1.3;

    // Parentesi/parentesi quadra aperta (stacco prima di inciso)
    if (/^[([\{]/.test(clean)) return 1.2;

    // Parola lunga: richiede più tempo di decodifica visiva
    if (clean.length > 9) return 1.1;

    return 1;
  }

  private scheduleNextTick(tick: () => void, currentWord: string): void {
    const baseMs = 60000 / this.wpm();
    const multiplier = this.getPauseMultiplier(currentWord);

    // Aggiorna il segnale visivo (reset a 1 se nessuna pausa)
    this.pauseMultiplier.set(multiplier);

    this.playInterval = setTimeout(() => {
      // Ripristina moltiplicatore a 1 prima di eseguire il tick successivo
      this.pauseMultiplier.set(1);
      tick();
    }, baseMs * multiplier);
  }


  private stopPlay(): void {
    if (this.playInterval) { clearTimeout(this.playInterval); this.playInterval = null; }
    if (this.isPlaying()) {
      this.statsService.endSession();
      this.isPlaying.set(false);
    }
  }

  skipWords(delta: number): void {
    const words = this.currentWords();
    let next = Math.max(0, Math.min(this.currentWordIndex() + delta, words.length - 1));
    // Salta i token sentinella dopo lo skip
    const dir = delta >= 0 ? 1 : -1;
    while (next > 0 && next < words.length - 1 &&
           (words[next] === PB || words[next]?.startsWith(CB))) {
      next += dir;
    }
    next = Math.max(0, Math.min(next, words.length - 1));
    this.currentWordIndex.set(next);
    this.scheduleSave();
  }

  setWpm(value: number): void {
    this.wpm.set(value);
    this.scheduleSave();
  }

  setChunkSize(value: number): void {
    this.chunkSize.set(value);
  }

  // ─── Fullscreen ───────────────────────────────────────────────────────────

  toggleFullscreen(): void {
    this.isFullscreen.update(v => !v);
  }

  // ─── Keyboard Shortcuts ───────────────────────────────────────────────────

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        this.togglePlay();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        this.loadPage(this.currentPage() - 1);
        break;
      case 'ArrowRight':
        e.preventDefault();
        this.loadPage(this.currentPage() + 1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.skipWords(-10);
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.skipWords(10);
        break;
      case '+':
      case '=':
        this.setWpm(Math.min(1000, this.wpm() + 25));
        break;
      case '-':
        this.setWpm(Math.max(100, this.wpm() - 25));
        break;
      case 'v':
      case 'V':
        e.preventDefault();
        this.viewMode.update(m => m === 'rsvp' ? 'fulltext' : 'rsvp');
        break;
      case 'b':
      case 'B':
        if (this.viewMode() === 'fulltext') {
          e.preventDefault();
          this.bionicEnabled.update(v => !v);
        }
        break;
      case 'f':
      case 'F':
        this.toggleFullscreen();
        break;
      case 'Escape':
        if (this.isFullscreen()) this.isFullscreen.set(false);
        break;
    }
  }

  onFullTextWordClick(index: number): void {
    this.currentWordIndex.set(index);
    this.scheduleSave();
  }

  // ─── Persistence ──────────────────────────────────────────────────────────

  private scheduleSave(): void {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    this.saveTimeout = setTimeout(() => this.saveProgress(), 1500);
  }

  private saveProgress(): void {
    if (!this.book()) return;
    const progress: ReadingProgress = {
      bookId: this.bookId,
      currentPage: this.currentPage(),
      currentWordIndex: this.currentWordIndex(),
      wpm: this.wpm(),
      chunkSize: this.chunkSize(),
    };
    this.libraryService.saveProgress(progress);
  }

  goBack(): void {
    this.stopPlay();
    this.saveProgress();
    this.router.navigate(['/library']);
  }
}
