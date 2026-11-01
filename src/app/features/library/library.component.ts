import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LibraryEntry } from '../../shared/models/book.model';
import { LibraryService } from '../../core/services/library.service';
import { PdfParserService } from '../../core/services/pdf-parser.service';
import { FileStorageService } from '../../core/services/file-storage.service';
import { BookCardComponent } from './book-card.component';
import { Book } from '../../shared/models/book.model';

@Component({
  selector: 'app-library',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, BookCardComponent],
  template: `
    <div class="library-page">

      <!-- Header -->
      <header class="library-header">
        <div class="header-brand">
          <div class="brand-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <div>
            <h1 class="brand-name">Intelligent Reading</h1>
            <p class="brand-sub">La tua libreria personale</p>
          </div>
        </div>

        <div class="header-actions">
          <!-- Theme toggle -->
          <button class="btn-icon" (click)="toggleTheme()" [title]="isDark() ? 'Tema chiaro' : 'Tema scuro'">
            @if (isDark()) {
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            } @else {
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            }
          </button>

          <!-- Paste text button -->
          <button class="btn-paste-text" (click)="openPasteModal()" title="Incolla o scrivi un testo da leggere">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Incolla testo
          </button>

          <!-- Upload button -->
          <label class="btn-upload">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Aggiungi file
            <input type="file" accept=".pdf,.epub,.txt" (change)="onFileUpload($event)" hidden />
          </label>
        </div>
      </header>

      <!-- Global stats bar -->
      @if (entries().length > 0) {
        <div class="stats-bar">
          <div class="stat-item">
            <span class="stat-value">{{ entries().length }}</span>
            <span class="stat-label">Libri</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">{{ totalWordsRead() }}</span>
            <span class="stat-label">Parole lette</span>
          </div>
          <div class="stat-divider"></div>
          <div class="stat-item">
            <span class="stat-value">{{ totalTimeRead() }}</span>
            <span class="stat-label">Tempo di lettura</span>
          </div>
        </div>
      }

      <!-- Empty state -->
      @if (entries().length === 0 && !isUploading()) {
        <div class="empty-state">
          <div class="empty-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
            </svg>
          </div>
          <h2 class="empty-title">La tua libreria è vuota</h2>
          <p class="empty-sub">Carica un PDF, ePub, file di testo o incolla un brano per iniziare a leggere con il motore RSVP</p>
          <div class="empty-buttons">
            <label class="btn-upload btn-upload-large">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Carica file (PDF, ePub, TXT)
              <input type="file" accept=".pdf,.epub,.txt" (change)="onFileUpload($event)" hidden />
            </label>
            <button class="btn-paste-text btn-paste-large" (click)="openPasteModal()">
              📋 Incolla testo libero
            </button>
          </div>
        </div>
      }

      <!-- Upload progress -->
      @if (isUploading()) {
        <div class="upload-overlay">
          <div class="upload-spinner"></div>
          <p>Caricamento in corso...</p>
        </div>
      }

      <!-- Book grid -->
      @if (entries().length > 0) {
        <main class="books-grid">
          @for (entry of entries(); track entry.book.id) {
            <app-book-card
              [entry]="entry"
              (deleted)="onBookDeleted($event)"
            />
          }
        </main>
      }

      <!-- Paste Text Modal -->
      @if (showPasteModal()) {
        <div class="modal-backdrop" (click)="closePasteModal()">
          <div class="modal-card" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <div class="modal-title-group">
                <h3>Lettura rapida da testo</h3>
                <p>Incolla qualsiasi articolo, appunto o brano per leggerlo all'istante</p>
              </div>
              <button class="btn-close-modal" (click)="closePasteModal()">✕</button>
            </div>

            <div class="modal-body">
              <div class="form-group">
                <label for="paste-title">Titolo (opzionale)</label>
                <input
                  id="paste-title"
                  type="text"
                  class="form-input"
                  placeholder="Es. Articolo, Appunti di studio..."
                  [(ngModel)]="pasteTitle"
                />
              </div>

              <div class="form-group">
                <div class="textarea-header">
                  <label for="paste-content">Contenuto del testo</label>
                  <button class="btn-clipboard-paste" (click)="pasteFromClipboard()" type="button">
                    📋 Incolla da appunti
                  </button>
                </div>
                <textarea
                  id="paste-content"
                  class="form-textarea"
                  rows="7"
                  placeholder="Incolla o digita qui il testo..."
                  [(ngModel)]="pasteContent"
                  (input)="updatePasteStats()"
                ></textarea>
              </div>

              @if (pasteWordCount() > 0) {
                <div class="paste-stats-pill">
                  <span><b>{{ pasteWordCount() }}</b> parole</span>
                  <span>·</span>
                  <span>~<b>{{ pasteEstMinutes() }}</b> min a 300 WPM</span>
                </div>
              }
            </div>

            <div class="modal-footer">
              <button class="btn-cancel" (click)="closePasteModal()">Annulla</button>
              <button
                class="btn-confirm-read"
                [disabled]="!pasteContent.trim() || isUploading()"
                (click)="submitPastedText()"
              >
                Inizia a leggere
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .library-page {
      min-height: 100vh;
      background: var(--bg);
      color: var(--text-primary);
    }

    /* Header */
    .library-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 32px;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
      backdrop-filter: blur(12px);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .header-brand { display: flex; align-items: center; gap: 14px; }
    .brand-icon {
      width: 44px; height: 44px;
      background: var(--accent);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      color: white;
    }
    .brand-name {
      font-size: 20px;
      font-weight: 800;
      color: var(--text-primary);
      margin: 0;
    }
    .brand-sub {
      font-size: 13px;
      color: var(--text-muted);
      margin: 0;
    }
    .header-actions { display: flex; align-items: center; gap: 10px; }

    .btn-icon {
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 9px;
      color: var(--text-muted);
      cursor: pointer;
      display: flex; align-items: center;
      transition: color 0.2s, border-color 0.2s, background 0.2s;
    }
    .btn-icon:hover {
      color: var(--text-primary);
      background: var(--surface-hover);
    }

    .btn-upload {
      display: flex; align-items: center; gap: 8px;
      background: var(--accent);
      color: white;
      border: none;
      border-radius: 10px;
      padding: 10px 18px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s, transform 0.1s;
    }
    .btn-upload:hover { background: var(--accent-hover); transform: scale(1.02); }
    .btn-upload-large {
      padding: 14px 28px;
      font-size: 16px;
      border-radius: 14px;
      margin-top: 8px;
    }

    /* Stats bar */
    .stats-bar {
      display: flex;
      align-items: center;
      gap: 0;
      padding: 16px 32px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
    }
    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 0 24px;
    }
    .stat-item:first-child { padding-left: 0; }
    .stat-value {
      font-size: 22px;
      font-weight: 800;
      color: var(--accent);
    }
    .stat-label {
      font-size: 11px;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .stat-divider {
      width: 1px;
      height: 36px;
      background: var(--border);
    }

    /* Empty state */
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: calc(100vh - 80px);
      padding: 48px 24px;
      text-align: center;
      gap: 12px;
    }
    .empty-icon {
      width: 100px; height: 100px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 24px;
      display: flex; align-items: center; justify-content: center;
      color: var(--accent);
      margin-bottom: 8px;
    }
    .empty-title {
      font-size: 26px;
      font-weight: 800;
      color: var(--text-primary);
      margin: 0;
    }
    .empty-sub {
      font-size: 15px;
      color: var(--text-muted);
      max-width: 420px;
      margin: 0;
      line-height: 1.6;
    }

    /* Upload overlay */
    .upload-overlay {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      min-height: calc(100vh - 80px);
      gap: 16px;
      color: var(--text-muted);
    }
    .upload-spinner {
      width: 48px; height: 48px;
      border: 3px solid var(--border);
      border-top-color: var(--accent);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    /* Books grid */
    .books-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 20px;
      padding: 28px 32px;
    }

    .btn-paste-text {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 9px 16px;
      color: var(--text-primary);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    .btn-paste-text:hover {
      background: var(--surface-hover);
      border-color: var(--accent);
      color: var(--accent);
    }
    .empty-buttons {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-top: 10px;
    }
    .btn-paste-large {
      padding: 14px 24px;
      font-size: 15px;
      border-radius: 14px;
    }

    /* Modal */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 16px;
      animation: fadeIn 0.15s ease;
    }
    .modal-card {
      width: 100%;
      max-width: 600px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 22px;
      box-shadow: 0 24px 48px rgba(0,0,0,0.35);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes scaleUp {
      from { transform: scale(0.96); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .modal-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 22px 24px 16px;
      border-bottom: 1px solid var(--border);
    }
    .modal-title-group h3 {
      margin: 0 0 4px;
      font-size: 19px;
      font-weight: 800;
      color: var(--text-primary);
    }
    .modal-title-group p {
      margin: 0;
      font-size: 13px;
      color: var(--text-muted);
    }
    .btn-close-modal {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 18px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: 6px;
      transition: color 0.15s;
    }
    .btn-close-modal:hover { color: var(--text-primary); }
    .modal-body {
      padding: 20px 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .form-group label {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-muted);
    }
    .textarea-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .btn-clipboard-paste {
      background: transparent;
      border: none;
      color: var(--accent);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .btn-clipboard-paste:hover { text-decoration: underline; }
    .form-input, .form-textarea {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 11px 14px;
      font-size: 14px;
      color: var(--text-primary);
      font-family: inherit;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .form-input:focus, .form-textarea:focus {
      outline: none;
      border-color: var(--accent);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent);
    }
    .form-textarea {
      resize: vertical;
      min-height: 150px;
      line-height: 1.5;
    }
    .paste-stats-pill {
      display: flex;
      align-items: center;
      gap: 8px;
      background: color-mix(in srgb, var(--accent) 12%, transparent);
      color: var(--accent);
      padding: 8px 14px;
      border-radius: 10px;
      font-size: 13px;
    }
    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 10px;
      padding: 16px 24px;
      border-top: 1px solid var(--border);
      background: var(--surface);
    }
    .btn-cancel {
      background: transparent;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 9px 18px;
      font-size: 14px;
      font-weight: 600;
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-cancel:hover { background: var(--surface-hover); color: var(--text-primary); }
    .btn-confirm-read {
      background: var(--accent);
      border: none;
      border-radius: 10px;
      padding: 9px 22px;
      font-size: 14px;
      font-weight: 700;
      color: white;
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-confirm-read:hover:not(:disabled) {
      background: var(--accent-hover);
      transform: scale(1.02);
    }
    .btn-confirm-read:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    @media (max-width: 600px) {
      .library-header { padding: 16px; }
      .brand-name { font-size: 17px; }
      .books-grid { padding: 16px; gap: 14px; }
      .stats-bar { padding: 12px 16px; }
      .stat-item { padding: 0 12px; }
      .empty-buttons { flex-direction: column; width: 100%; }
      .btn-upload-large, .btn-paste-large { width: 100%; justify-content: center; }
    }
  `]
})
export class LibraryComponent implements OnInit {

  entries = signal<LibraryEntry[]>([]);
  isUploading = signal(false);
  isDark = signal(false);

  // Paste text modal state
  showPasteModal = signal(false);
  pasteTitle = '';
  pasteContent = '';
  pasteWordCount = signal(0);
  pasteEstMinutes = signal(0);

  constructor(
    private router: Router,
    private libraryService: LibraryService,
    private pdfParser: PdfParserService,
    private fileStorage: FileStorageService
  ) {}

  ngOnInit(): void {
    // Carica tema salvato
    const savedTheme = localStorage.getItem('ir_theme') ?? 'dark';
    this.isDark.set(savedTheme === 'dark');
    document.documentElement.setAttribute('data-theme', savedTheme);

    this.refreshEntries();
  }

  refreshEntries(): void {
    this.entries.set(this.libraryService.getAllBooks());
  }

  toggleTheme(): void {
    const next = this.isDark() ? 'light' : 'dark';
    this.isDark.set(next === 'dark');
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ir_theme', next);
  }

  openPasteModal(): void {
    this.pasteTitle = '';
    this.pasteContent = '';
    this.pasteWordCount.set(0);
    this.pasteEstMinutes.set(0);
    this.showPasteModal.set(true);
  }

  closePasteModal(): void {
    this.showPasteModal.set(false);
  }

  async pasteFromClipboard(): Promise<void> {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        this.pasteContent = text;
        this.updatePasteStats();
      }
    } catch {
      alert('Impossibile accedere agli appunti. Incolla il testo manualmente (Ctrl+V).');
    }
  }

  updatePasteStats(): void {
    const words = this.pasteContent.trim().split(/\s+/).filter(w => w.length > 0);
    const count = words.length;
    this.pasteWordCount.set(count);
    this.pasteEstMinutes.set(Math.max(1, Math.ceil(count / 300)));
  }

  async submitPastedText(): Promise<void> {
    const text = this.pasteContent.trim();
    if (!text) return;

    this.isUploading.set(true);
    try {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const { totalPages, title } = await this.pdfParser.loadTxt(blob, this.pasteTitle.trim() || undefined);

      const fileName = `${title.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30)}.txt`;
      const savedBook = this.libraryService.addOrUpdateBook(fileName, blob.size, 'txt', totalPages, title);

      await this.fileStorage.saveFile(savedBook.id, blob);
      this.closePasteModal();
      this.refreshEntries();

      // Vai direttamente al reader con il testo appena incollato
      this.router.navigate(['/reader', savedBook.id]);
    } catch (err) {
      console.error('Errore creazione testo:', err);
      alert('Errore nella creazione della sessione di lettura.');
    } finally {
      this.isUploading.set(false);
    }
  }

  async onFileUpload(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.isUploading.set(true);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let savedBook: Book | null = null;

      if (ext === 'pdf') {
        const { numPages } = await this.pdfParser.loadPdf(file);
        savedBook = this.libraryService.addOrUpdateBook(file.name, file.size, 'pdf', numPages);
      } else if (ext === 'epub') {
        const { totalSections, title } = await this.pdfParser.loadEpub(file);
        savedBook = this.libraryService.addOrUpdateBook(file.name, file.size, 'epub', totalSections, title);
      } else if (ext === 'txt') {
        const { totalPages, title } = await this.pdfParser.loadTxt(file);
        savedBook = this.libraryService.addOrUpdateBook(file.name, file.size, 'txt', totalPages, title);
      }

      if (savedBook) {
        await this.fileStorage.saveFile(savedBook.id, file);
      }

      this.refreshEntries();
    } catch (err) {
      console.error('Errore caricamento file:', err);
      alert('Errore nel caricamento del file. Verifica che il file non sia corrotto.');
    } finally {
      this.isUploading.set(false);
      input.value = '';
    }
  }

  async onBookDeleted(bookId: string): Promise<void> {
    this.libraryService.removeBook(bookId);
    await this.fileStorage.deleteFile(bookId);
    this.refreshEntries();
  }

  totalWordsRead(): string {
    const total = this.entries().reduce(
      (acc, e) => acc + (e.stats?.totalWordsRead ?? 0), 0
    );
    return total.toLocaleString('it-IT');
  }

  totalTimeRead(): string {
    const total = this.entries().reduce(
      (acc, e) => acc + (e.stats?.totalTimeSeconds ?? 0), 0
    );
    return this.libraryService.formatTime(total);
  }
}
