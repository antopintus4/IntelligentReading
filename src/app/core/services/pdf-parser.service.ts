import { Injectable } from '@angular/core';

export interface ParsedBook {
  words: string[][];   // words[pageIndex] = array di parole
  totalPages: number;
  title?: string;
}

@Injectable({ providedIn: 'root' })
export class PdfParserService {

  private pageCache: Map<number, string[]> = new Map();
  private pdfDoc: any = null;

  // ─── Sentinel token constants ──────────────────────────────────────────────
  //
  //  PARAGRAPH_BREAK        → riga vuota / gap verticale tra paragrafi
  //  CHAPTER_BREAK_PREFIX   → prefisso dei token-capitolo, seguito dal titolo
  //
  static readonly PARAGRAPH_BREAK = '\x00\xB6';
  static readonly CHAPTER_BREAK_PREFIX = '\x00\xA7:';

  // ─── PDF.js Loading ───────────────────────────────────────────────────────

  async ensurePdfJs(): Promise<void> {
    if ((window as any).pdfjsLib) return;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc =
          'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve();
      };
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }

  // ─── PDF Document Loading ─────────────────────────────────────────────────

  async loadPdf(file: File | Blob): Promise<{ pdfDoc: any; numPages: number; outline: any[] }> {
    await this.ensurePdfJs();
    this.pageCache.clear();
    this.pdfDoc = null;

    const arrayBuffer = await file.arrayBuffer();
    const typedArray = new Uint8Array(arrayBuffer);
    const pdfDoc = await (window as any).pdfjsLib.getDocument({ data: typedArray }).promise;
    this.pdfDoc = pdfDoc;

    const outline = await this.processOutline(pdfDoc);
    return { pdfDoc, numPages: pdfDoc.numPages, outline };
  }

  private async processOutline(pdfDoc: any): Promise<any[]> {
    try {
      const raw = await pdfDoc.getOutline();
      if (!raw) return [];
      const processed: any[] = [];
      for (const item of raw) {
        let pageNum = 1;
        try {
          if (typeof item.dest === 'string') {
            const dest = await pdfDoc.getDestination(item.dest);
            pageNum = await pdfDoc.getPageIndex(dest[0]) + 1;
          } else if (Array.isArray(item.dest) && item.dest[0]) {
            pageNum = await pdfDoc.getPageIndex(item.dest[0]) + 1;
          }
        } catch { /* ignora errori di navigazione outline */ }
        processed.push({ title: item.title, page: pageNum });
      }
      return processed;
    } catch {
      return [];
    }
  }

  // ─── Structured Text Extraction ───────────────────────────────────────────

  /**
   * Estrae le parole di una pagina PDF inserendo token sentinella per:
   *  - Paragrafi : gap verticale > 1.8× l'interlinea tipica della pagina
   *  - Capitoli  : testo con font > 1.35× il corpo, o gap > 3× interlinea
   *
   * Il rilevamento usa dati grezzi del PDF (transform Y e height degli item)
   * anziché affidarsi all'outline, che nei PDF non è sempre presente.
   */
  async extractPageWordsWithStructure(pdfDoc: any, pageNum: number): Promise<string[]> {
    if (this.pageCache.has(pageNum)) return this.pageCache.get(pageNum)!;

    const PB = PdfParserService.PARAGRAPH_BREAK;
    const CB = PdfParserService.CHAPTER_BREAK_PREFIX;

    try {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items: any[] = textContent.items;

      if (!items.length) return [PB];

      // 1. Raccogli font-size di ogni item
      const fontSizes = items
        .map((it: any) => Math.abs(it.height) || Math.abs(it.transform?.[3]) || 0)
        .filter((s: number) => s > 1);
      const medianFont = this.median(fontSizes);
      const headingThreshold = medianFont * 1.35;   // font >= 35% più grande = intestazione

      // 2. Raggruppa items per riga (Y arrotondato a 2 px per tollerare sub-px)
      const lineMap = new Map<number, any[]>();
      for (const it of items) {
        const y = Math.round(it.transform[5] / 2) * 2;
        if (!lineMap.has(y)) lineMap.set(y, []);
        lineMap.get(y)!.push(it);
      }

      // Ordina top→bottom (Y decrescente nei PDF)
      const sortedLines = Array.from(lineMap.entries())
        .sort(([ya], [yb]) => yb - ya)
        .map(([y, lineItems]) => ({
          y,
          items: lineItems.sort((a: any, b: any) => a.transform[4] - b.transform[4]),
          maxFont: Math.max(
            ...lineItems.map((it: any) => Math.abs(it.height) || Math.abs(it.transform?.[3]) || 0)
          )
        }));

      // 3. Calcola interlinea tipica (mediana dei gap consecutivi)
      const gaps: number[] = [];
      for (let i = 1; i < sortedLines.length; i++) {
        const g = sortedLines[i - 1].y - sortedLines[i].y;
        if (g > 0 && g < 200) gaps.push(g);
      }
      const typicalGap = this.median(gaps) || 14;
      const paragraphThreshold = typicalGap * 1.8;
      const chapterThreshold = typicalGap * 3.0;

      // 4. Salta header/footer (prima e ultima riga)
      const content = sortedLines.length > 4
        ? sortedLines.slice(1, sortedLines.length - 1)
        : sortedLines;

      // 5. Costruisci il token array
      const result: string[] = [];

      const pushPB = () => {
        if (result.length > 0 && result[result.length - 1] !== PB) result.push(PB);
      };

      for (let i = 0; i < content.length; i++) {
        const line = content[i];

        // Costruisci il testo della riga gestendo la spaziatura orizzontale tra item PDF
        let lineText = '';
        for (let j = 0; j < line.items.length; j++) {
          const it = line.items[j];
          if (j > 0) {
            const prev = line.items[j - 1];
            const prevEnd = prev.transform[4] + (prev.width || 0);
            const currStart = it.transform[4];
            const gap = currStart - prevEnd;
            const charHeight = Math.abs(it.height) || Math.abs(it.transform?.[3]) || 12;
            const alreadySpaced = prev.str.endsWith(' ') || it.str.startsWith(' ');
            if (!alreadySpaced && gap > charHeight * 0.18) {
              lineText += ' ';
            }
          }
          lineText += it.str;
        }

        const text = lineText.trim();
        if (!text) { pushPB(); continue; }   // riga vuota esplicita nel PDF

        if (i > 0) {
          const gap = content[i - 1].y - line.y;
          const isHeadingFont = line.maxFont >= headingThreshold && text.length < 200;

          if (gap > chapterThreshold || (gap > paragraphThreshold && isHeadingFont)) {
            if (isHeadingFont) {
              // Titolo capitolo: emetti CHAPTER token e non aggiungere le parole
              pushPB();
              result.push(`${CB}${this.cleanText(text)}`);
              continue;
            }
            pushPB();
          } else if (gap > paragraphThreshold) {
            pushPB();
          }
        } else if (i === 0 && line.maxFont >= headingThreshold && text.length < 200) {
          // Prima riga della pagina con font grande
          result.push(`${CB}${this.cleanText(text)}`);
          continue;
        }

        // Riga di testo normale → parole pulite
        const rawWords = this.cleanText(text).split(/\s+/).filter(w => w.length > 0);
        result.push(...rawWords);
      }

      const processed = this.processTokens(result);
      const final = processed.length > 0 ? processed : ['[Pagina vuota]'];
      this.pageCache.set(pageNum, final);
      return final;
    } catch {
      return ['[Errore caricamento pagina]'];
    }
  }

  /** Alias per retrocompatibilità — ora delega a extractPageWordsWithStructure */
  async extractPageWords(pdfDoc: any, pageNum: number): Promise<string[]> {
    return this.extractPageWordsWithStructure(pdfDoc, pageNum);
  }

  private median(arr: number[]): number {
    if (!arr.length) return 12;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  /**
   * Pulisce e normalizza il testo:
   * - Normalizzazione Unicode NFC (fonde caratteri composti tipo e + ` in è)
   * - Preserva TUTTI i caratteri accentati (à, è, é, ì, ò, ù, À, È, É...) tramite \p{L}\p{M}
   * - Normalizza apostrofi tipografici (’, ‘, ʼ, `, ´) in apostrofo standard '
   * - Ricongiunge apostrofi distanziati dalla parola precedente (es. "dell ' arte" -> "dell' arte", "po '" -> "po'")
   */
  private cleanText(text: string): string {
    return text
      .normalize('NFC')
      .replace(/[\u00AD]/g, '')
      .replace(/[-\u2010]\s*\n\s*/g, '')
      .replace(/\n/g, ' ')
      .replace(/[\u2018\u2019\u02BC\u00B4`]/g, "'")
      .replace(/(?<=\p{L}|\p{N})\s+'/gu, "'")
      .replace(/[^\p{L}\p{M}\p{N}\s'\-.,!?;:()\[\]{}"“”«»…—–\/]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Post-processing delle parole estratte:
   * 1. Unisce apostrofi isolati ("'") alla parola precedente (es. ["dell", "'", "arte"] -> ["dell'", "arte"])
   * 2. Sposta apostrofi iniziali sulla parola precedente (es. ["dell", "'arte"] -> ["dell'", "arte"])
   * 3. Preserva le sentinelle PARAGRAPH e CHAPTER
   */
  private processTokens(words: string[]): string[] {
    const result: string[] = [];
    const PB = PdfParserService.PARAGRAPH_BREAK;
    const CB = PdfParserService.CHAPTER_BREAK_PREFIX;

    for (let i = 0; i < words.length; i++) {
      let w = words[i].trim();
      if (!w) continue;

      if (w === PB || w.startsWith(CB)) {
        result.push(w);
        continue;
      }

      // Caso 1: token è apostrofo isolato "'"
      if (w === "'") {
        if (result.length > 0) {
          const prev = result[result.length - 1];
          if (prev !== PB && !prev.startsWith(CB)) {
            if (!prev.endsWith("'")) {
              result[result.length - 1] = prev + "'";
            }
            continue;
          }
        }
        continue;
      }

      // Caso 2: token inizia con apostrofo (es. "'albero", "'arte") preceduto da parola
      if (w.startsWith("'") && w.length > 1 && result.length > 0) {
        const prev = result[result.length - 1];
        if (prev !== PB && !prev.startsWith(CB) && /[\p{L}\p{N}]$/u.test(prev)) {
          if (!prev.endsWith("'")) {
            result[result.length - 1] = prev + "'";
          }
          w = w.slice(1);
        }
      }

      result.push(w);
    }

    return result;
  }

  clearCache(): void {
    this.pageCache.clear();
  }

  // ─── ePub Support ─────────────────────────────────────────────────────────

  async loadEpub(file: File | Blob): Promise<{ sections: string[][]; totalSections: number; title?: string }> {
    await this.ensureEpubJs();

    const arrayBuffer = await file.arrayBuffer();
    const book = (window as any).ePub(arrayBuffer);
    await book.ready;

    const title = book.packaging?.metadata?.title;
    const spine = book.spine;
    const sections: string[][] = [];
    const PB = PdfParserService.PARAGRAPH_BREAK;
    const CB = PdfParserService.CHAPTER_BREAK_PREFIX;

    for (const item of spine.items) {
      try {
        const section = book.spine.get(item.href);
        if (!section) continue;
        const doc = await section.load(book.load.bind(book));
        const body = (doc as Document).body;
        if (!body) continue;

        const words: string[] = [];
        const blockTags = new Set(['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
          'BLOCKQUOTE', 'LI', 'SECTION', 'ARTICLE']);

        body.querySelectorAll('*').forEach((el: Element) => {
          if (!blockTags.has(el.tagName)) return;
          const text = ((el as HTMLElement).innerText ?? el.textContent ?? '').trim();
          if (!text) return;

          if (/^H[1-6]$/.test(el.tagName)) {
            words.push(`${CB}${this.cleanText(text)}`);
          } else {
            if (words.length > 0 && words[words.length - 1] !== PB) words.push(PB);
            const ws = this.cleanText(text).split(/\s+/).filter(w => w.length > 0);
            words.push(...ws);
          }
        });

        const processed = this.processTokens(words);
        if (processed.length > 0) sections.push(processed);
      } catch { /* skip section */ }
    }

    return { sections, totalSections: sections.length, title };
  }

  // ─── Plain Text Support ───────────────────────────────────────────────────

  async loadTxt(file: File | Blob, defaultTitle?: string): Promise<{ words: string[][]; totalPages: number; title: string }> {
    const rawText = await file.text();
    const PB = PdfParserService.PARAGRAPH_BREAK;
    const CB = PdfParserService.CHAPTER_BREAK_PREFIX;

    const lines = rawText.split(/\r?\n/);
    const pages: string[][] = [];
    let currentPageWords: string[] = [];
    const WORDS_PER_PAGE_TARGET = 350;

    let detectedTitle = defaultTitle;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (!line) {
        if (currentPageWords.length > 0 && currentPageWords[currentPageWords.length - 1] !== PB) {
          currentPageWords.push(PB);
        }
        continue;
      }

      // Rilevamento capitolo o intestazione
      const isMdHeading = /^#{1,3}\s+(.+)$/.test(line);
      const isChapterKeyword = /^(?:capitolo|chapter|parte|sezione)\s+[\w\d]+/i.test(line);
      const isAllUpperHeading = line.length < 60 && line === line.toUpperCase() && /[A-Z]/.test(line);

      if (isMdHeading || isChapterKeyword || isAllUpperHeading) {
        const cleanHeading = line.replace(/^#{1,3}\s+/, '');
        if (!detectedTitle) {
          detectedTitle = cleanHeading;
        }

        if (currentPageWords.length > 100) {
          pages.push(this.processTokens(currentPageWords));
          currentPageWords = [];
        }

        currentPageWords.push(`${CB}${this.cleanText(cleanHeading)}`);
        continue;
      }

      // Parola normale
      const cleaned = this.cleanText(line);
      const words = cleaned.split(/\s+/).filter(w => w.length > 0);
      currentPageWords.push(...words);

      // Paginazione a fine paragrafo
      const isNextEmpty = i + 1 < lines.length && !lines[i + 1].trim();
      if (currentPageWords.length >= WORDS_PER_PAGE_TARGET && (isNextEmpty || i === lines.length - 1)) {
        pages.push(this.processTokens(currentPageWords));
        currentPageWords = [];
      }
    }

    if (currentPageWords.length > 0) {
      pages.push(this.processTokens(currentPageWords));
    }

    if (pages.length === 0) {
      pages.push(['[Testo vuoto]']);
    }

    const title = detectedTitle || (file instanceof File ? file.name.replace(/\.[^.]+$/, '') : 'Testo incollato');
    return {
      words: pages,
      totalPages: pages.length,
      title
    };
  }

  private async ensureEpubJs(): Promise<void> {
    if ((window as any).ePub) return;
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/epubjs/dist/epub.min.js';
      script.onload = () => resolve();
      script.onerror = reject;
      document.body.appendChild(script);
    });
  }
}
