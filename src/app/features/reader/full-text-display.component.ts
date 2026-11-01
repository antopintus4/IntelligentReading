import {
  Component, Input, Output, EventEmitter, ElementRef,
  ViewChild, OnChanges, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { PdfParserService } from '../../core/services/pdf-parser.service';

interface DisplayBlock {
  type: 'chapter' | 'paragraph';
  title?: string;
  tokens: { word: string; index: number; boldPart?: string; restPart?: string }[];
}

@Component({
  selector: 'app-full-text-display',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fulltext-container" #container>
      <div class="fulltext-content">
        @for (block of blocks; track $index) {
          @if (block.type === 'chapter') {
            <h2 class="block-chapter">{{ block.title }}</h2>
          } @else {
            <p class="block-paragraph">
              @for (tok of block.tokens; track tok.index) {
                <span
                  class="tok-word"
                  [class.active]="currentIndex === tok.index"
                  [class.read]="tok.index < currentIndex"
                  [attr.data-idx]="tok.index"
                  (click)="onWordClick(tok.index)"
                >
                  @if (bionicEnabled && tok.boldPart) {
                    <b class="bionic-lead">{{ tok.boldPart }}</b>{{ tok.restPart }}
                  } @else {
                    {{ tok.word }}
                  }
                </span>
                <span class="tok-space"> </span>
              }
            </p>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .fulltext-container {
      width: 100%;
      height: 100%;
      max-height: calc(100vh - 180px);
      overflow-y: auto;
      padding: 32px 24px;
      display: flex;
      justify-content: center;
      scroll-behavior: smooth;
    }

    .fulltext-content {
      width: 100%;
      max-width: 720px;
      line-height: 1.85;
      font-size: 19px;
      color: var(--text-primary);
      user-select: text;
    }

    .block-chapter {
      font-size: 24px;
      font-weight: 800;
      color: var(--accent);
      margin: 32px 0 16px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
    }

    .block-paragraph {
      margin: 0 0 20px 0;
      text-align: justify;
      hyphens: auto;
    }

    .tok-word {
      cursor: pointer;
      border-radius: 4px;
      padding: 1px 3px;
      transition: background-color 0.15s ease, color 0.15s ease, transform 0.1s ease;
      display: inline-block;
    }

    .tok-word:hover {
      background: color-mix(in srgb, var(--accent) 15%, transparent);
      text-decoration: underline;
    }

    .tok-word.read {
      opacity: 0.65;
    }

    .tok-word.active {
      opacity: 1;
      background: var(--accent);
      color: #ffffff !important;
      font-weight: 700;
      box-shadow: 0 0 14px color-mix(in srgb, var(--accent) 50%, transparent);
      transform: scale(1.05);
      border-radius: 6px;
    }

    .tok-word.active .bionic-lead {
      color: #ffffff;
    }

    .bionic-lead {
      font-weight: 800;
      color: var(--text-primary);
    }

    .tok-space {
      display: inline;
    }

    @media (max-width: 600px) {
      .fulltext-container { padding: 16px 12px; }
      .fulltext-content { font-size: 17px; line-height: 1.75; }
    }
  `]
})
export class FullTextDisplayComponent implements OnChanges {
  @Input() words: string[] = [];
  @Input() currentIndex = 0;
  @Input() isPlaying = false;
  @Input() bionicEnabled = true;

  @Output() wordClick = new EventEmitter<number>();

  @ViewChild('container') containerRef?: ElementRef<HTMLDivElement>;

  blocks: DisplayBlock[] = [];

  private lastScrolledIndex = -1;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['words'] || changes['bionicEnabled']) {
      this.rebuildBlocks();
    }

    if (changes['currentIndex']) {
      this.handleAutoScroll();
    }
  }

  private rebuildBlocks(): void {
    const PB = PdfParserService.PARAGRAPH_BREAK;
    const CB = PdfParserService.CHAPTER_BREAK_PREFIX;

    const blocks: DisplayBlock[] = [];
    let currentTokens: { word: string; index: number; boldPart?: string; restPart?: string }[] = [];

    const flushParagraph = () => {
      if (currentTokens.length > 0) {
        blocks.push({ type: 'paragraph', tokens: currentTokens });
        currentTokens = [];
      }
    };

    for (let i = 0; i < this.words.length; i++) {
      const w = this.words[i];
      if (w === PB) {
        flushParagraph();
      } else if (w.startsWith(CB)) {
        flushParagraph();
        blocks.push({
          type: 'chapter',
          title: w.slice(CB.length),
          tokens: []
        });
      } else {
        let boldPart: string | undefined;
        let restPart: string | undefined;

        if (this.bionicEnabled && w.length > 0) {
          const splitPoint = Math.ceil(w.length * 0.45);
          boldPart = w.slice(0, splitPoint);
          restPart = w.slice(splitPoint);
        }

        currentTokens.push({
          word: w,
          index: i,
          boldPart,
          restPart
        });
      }
    }

    flushParagraph();
    this.blocks = blocks;
  }

  private handleAutoScroll(): void {
    if (!this.containerRef) return;

    // Throttle scroll per evitare scatti continui
    if (Math.abs(this.currentIndex - this.lastScrolledIndex) < 4 && !this.isPlaying) return;

    const container = this.containerRef.nativeElement;
    const activeEl = container.querySelector(`[data-idx="${this.currentIndex}"]`) as HTMLElement;

    if (activeEl) {
      this.lastScrolledIndex = this.currentIndex;
      const elTop = activeEl.offsetTop - container.offsetTop;
      const containerHeight = container.clientHeight;
      const targetScroll = elTop - (containerHeight / 2) + 20;

      container.scrollTo({
        top: Math.max(0, targetScroll),
        behavior: this.isPlaying ? 'smooth' : 'auto'
      });
    }
  }

  onWordClick(index: number): void {
    this.wordClick.emit(index);
  }
}
