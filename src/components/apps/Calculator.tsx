'use client';

import { useState, useEffect, useCallback } from 'react';
import { History, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useOS } from '@/lib/os/store';
import type { WindowInstance } from '@/lib/os/types';

type Mode = 'std' | 'sci';
interface HistoryItem {
  id: number;
  expr: string;
  result: string;
}

// === Safe expression evaluator (recursive descent parser) ===

type Token =
  | { t: 'num'; v: number }
  | { t: 'op'; v: '+' | '-' | '*' | '/' | '^' | '%' }
  | { t: 'lparen' }
  | { t: 'rparen' }
  | { t: 'func'; v: string }
  | { t: 'const'; v: 'pi' | 'e' };

function tokenize(s: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ' || c === ',') {
      i++;
      continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i;
      let dots = 0;
      while (j < s.length && /[0-9.]/.test(s[j])) {
        if (s[j] === '.') {
          dots++;
          if (dots > 1) break;
        }
        j++;
      }
      const num = parseFloat(s.slice(i, j));
      if (Number.isNaN(num)) throw new Error('Invalid number');
      tokens.push({ t: 'num', v: num });
      i = j;
      continue;
    }
    if (c === 'π') {
      tokens.push({ t: 'const', v: 'pi' });
      i++;
      continue;
    }
    if (/[a-zA-Z]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
      const name = s.slice(i, j).toLowerCase();
      if (name === 'e') tokens.push({ t: 'const', v: 'e' });
      else tokens.push({ t: 'func', v: name });
      i = j;
      continue;
    }
    if (c === '+') tokens.push({ t: 'op', v: '+' });
    else if (c === '-' || c === '−') tokens.push({ t: 'op', v: '-' });
    else if (c === '*' || c === '×') tokens.push({ t: 'op', v: '*' });
    else if (c === '/' || c === '÷') tokens.push({ t: 'op', v: '/' });
    else if (c === '^') tokens.push({ t: 'op', v: '^' });
    else if (c === '%') tokens.push({ t: 'op', v: '%' });
    else if (c === '(') tokens.push({ t: 'lparen' });
    else if (c === ')') tokens.push({ t: 'rparen' });
    else throw new Error(`Unexpected character: ${c}`);
    i++;
  }
  return tokens;
}

function evaluate(expr: string, mode: 'deg' | 'rad'): number {
  const tokens = tokenize(expr);
  if (tokens.length === 0) return 0;
  let pos = 0;
  const peek = () => tokens[pos];
  const advance = () => tokens[pos++];

  function parseExpr(): number {
    let left = parseTerm();
    while (peek() && peek()!.t === 'op' && (peek()!.v === '+' || peek()!.v === '-')) {
      const op = advance()!.v as '+' | '-';
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }
  function parseTerm(): number {
    let left = parseFactor();
    while (true) {
      const tk = peek();
      if (!tk) break;
      if (tk.t === 'op' && (tk.v === '*' || tk.v === '/')) {
        advance();
        const right = parseFactor();
        left = tk.v === '*' ? left * right : left / right;
      } else if (tk.t === 'num' || tk.t === 'const' || tk.t === 'lparen' || tk.t === 'func') {
        // implicit multiplication, e.g. 2π or 2(3)
        const right = parseFactor();
        left = left * right;
      } else break;
    }
    return left;
  }
  function parseFactor(): number {
    const tk = peek();
    if (tk && tk.t === 'op' && (tk.v === '-' || tk.v === '+')) {
      advance();
      const val = parseFactor();
      return tk.v === '-' ? -val : val;
    }
    return parsePower();
  }
  function parsePower(): number {
    const base = parsePrimary();
    const tk = peek();
    if (tk && tk.t === 'op' && tk.v === '^') {
      advance();
      const exp = parseFactor(); // right associative
      return Math.pow(base, exp);
    }
    return base;
  }
  function parsePrimary(): number {
    const tk = peek();
    if (!tk) throw new Error('Unexpected end of expression');
    let val: number;
    if (tk.t === 'num') {
      val = tk.v;
      advance();
    } else if (tk.t === 'const') {
      val = tk.v === 'pi' ? Math.PI : Math.E;
      advance();
    } else if (tk.t === 'lparen') {
      advance();
      val = parseExpr();
      const close = advance();
      if (!close || close.t !== 'rparen') throw new Error('Missing )');
    } else if (tk.t === 'func') {
      advance();
      const open = advance();
      if (!open || open.t !== 'lparen') throw new Error('Expected ( after function');
      const arg = parseExpr();
      const close = advance();
      if (!close || close.t !== 'rparen') throw new Error('Missing )');
      val = applyFunc(tk.v, arg, mode);
    } else {
      throw new Error('Unexpected token');
    }
    // postfix percent: 50% => 0.5
    while (peek() && peek()!.t === 'op' && peek()!.v === '%') {
      advance();
      val = val / 100;
    }
    return val;
  }
  function applyFunc(name: string, arg: number, m: 'deg' | 'rad'): number {
    const toRad = (x: number) => (m === 'deg' ? (x * Math.PI) / 180 : x);
    const fromRad = (x: number) => (m === 'deg' ? (x * 180) / Math.PI : x);
    switch (name) {
      case 'sin': return Math.sin(toRad(arg));
      case 'cos': return Math.cos(toRad(arg));
      case 'tan': return Math.tan(toRad(arg));
      case 'asin': return fromRad(Math.asin(arg));
      case 'acos': return fromRad(Math.acos(arg));
      case 'atan': return fromRad(Math.atan(arg));
      case 'log': return Math.log10(arg);
      case 'ln': return Math.log(arg);
      case 'sqrt': return Math.sqrt(arg);
      case 'abs': return Math.abs(arg);
      case 'exp': return Math.exp(arg);
      default: throw new Error(`Unknown function: ${name}`);
    }
  }

  const result = parseExpr();
  if (pos < tokens.length) throw new Error('Unexpected trailing tokens');
  return result;
}

function formatNumber(n: number): string {
  if (Number.isNaN(n)) return '错误';
  if (!isFinite(n)) return n > 0 ? '∞' : '-∞';
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-9 || abs >= 1e15)) return n.toExponential(6);
  const rounded = parseFloat(n.toPrecision(12));
  return String(rounded);
}

export function Calculator({ win }: { win: WindowInstance }) {
  const accent = useOS((s) => s.settings.accent);
  const [mode, setMode] = useState<Mode>('std');
  const [degRad, setDegRad] = useState<'deg' | 'rad'>('deg');
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState('0');
  const [final, setFinal] = useState(false);
  const [memory, setMemory] = useState(0);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Live preview of the current expression as the user types.
  // This is a derived value that must be stored in state so the display
  // can show the last valid preview while the user types a partial expr.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (final) return;
    if (!expr) {
      setResult('0');
      return;
    }
    try {
      const v = evaluate(expr, degRad);
      setResult(formatNumber(v));
    } catch {
      // partial expression — keep previous preview
    }
  }, [expr, degRad, final]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const append = useCallback(
    (c: string) => {
      if (final) {
        const isOperator = /^[+\-×÷^%]$/.test(c);
        const isCleanNumber = result !== '错误' && isFinite(parseFloat(result));
        if (isOperator && isCleanNumber) {
          setExpr(result + c);
        } else {
          setExpr(c);
        }
        setFinal(false);
      } else {
        setExpr((p) => (p === '错误' ? c : p + c));
      }
    },
    [final, result],
  );

  const clearAll = useCallback(() => {
    setExpr('');
    setResult('0');
    setFinal(false);
  }, []);

  const backspace = useCallback(() => {
    if (final) {
      setFinal(false);
      return;
    }
    setExpr((p) => {
      const m = p.match(/(asin|acos|atan|sin|cos|tan|log|ln|sqrt|abs|exp)\($/);
      if (m) return p.slice(0, -m[0].length);
      return p.slice(0, -1);
    });
  }, [final]);

  const equals = useCallback(() => {
    if (!expr) return;
    try {
      const v = evaluate(expr, degRad);
      const r = formatNumber(v);
      setResult(r);
      setFinal(true);
      setHistory((h) => [{ id: Date.now() + Math.floor(Math.random() * 1000), expr, result: r }, ...h].slice(0, 50));
    } catch {
      setResult('错误');
      setFinal(true);
    }
  }, [expr, degRad]);

  const toggleSign = useCallback(() => {
    if (final) {
      // negate the result and start fresh
      const v = parseFloat(result);
      if (isFinite(v)) {
        setExpr(formatNumber(-v));
        setFinal(false);
      }
      return;
    }
    setExpr((prev) => {
      if (!prev) return '-';
      if (prev.startsWith('-(') && prev.endsWith(')')) return prev.slice(2, -1);
      return `-(${prev})`;
    });
  }, [final, result]);

  // Memory ops
  const memClear = () => setMemory(0);
  const memRecall = () => {
    if (final) {
      setExpr(formatNumber(memory));
      setFinal(false);
    } else {
      setExpr((p) => p + formatNumber(memory));
    }
  };
  const memAdd = () => {
    try {
      const v = expr ? evaluate(expr, degRad) : 0;
      setMemory((m) => m + v);
    } catch {
      /* ignore */
    }
  };
  const memSub = () => {
    try {
      const v = expr ? evaluate(expr, degRad) : 0;
      setMemory((m) => m - v);
    } catch {
      /* ignore */
    }
  };

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (useOS.getState().activeWindowId !== win.id) return;
      const k = e.key;
      if (/^[0-9]$/.test(k)) {
        append(k);
        e.preventDefault();
      } else if (k === '.') {
        append('.');
        e.preventDefault();
      } else if (k === '+') {
        append('+');
        e.preventDefault();
      } else if (k === '-') {
        append('-');
        e.preventDefault();
      } else if (k === '*') {
        append('×');
        e.preventDefault();
      } else if (k === '/') {
        append('÷');
        e.preventDefault();
      } else if (k === '^') {
        append('^');
        e.preventDefault();
      } else if (k === '%') {
        append('%');
        e.preventDefault();
      } else if (k === '(' || k === ')') {
        append(k);
        e.preventDefault();
      } else if (k === 'Enter' || k === '=') {
        equals();
        e.preventDefault();
      } else if (k === 'Backspace') {
        backspace();
        e.preventDefault();
      } else if (k === 'Escape') {
        clearAll();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [append, equals, backspace, clearAll, win.id]);

  const insertResult = (r: string) => {
    setExpr(r);
    setFinal(false);
    setHistoryOpen(false);
  };

  const sciButtons: { l: string; v: string }[] = [
    { l: 'sin', v: 'sin(' },
    { l: 'cos', v: 'cos(' },
    { l: 'tan', v: 'tan(' },
    { l: 'log', v: 'log(' },
    { l: 'ln', v: 'ln(' },
    { l: '√', v: 'sqrt(' },
    { l: 'x²', v: '^2' },
    { l: 'xʸ', v: '^' },
    { l: 'π', v: 'π' },
    { l: 'e', v: 'e' },
    { l: '(', v: '(' },
    { l: ')', v: ')' },
  ];

  type Btn = {
    l: string;
    v?: string;
    act?: () => void;
    variant?: 'num' | 'op' | 'fn' | 'accent';
  };
  const mainButtons: Btn[] = [
    { l: 'C', act: clearAll, variant: 'fn' },
    { l: '⌫', act: backspace, variant: 'fn' },
    { l: '%', v: '%', variant: 'op' },
    { l: '÷', v: '÷', variant: 'op' },
    { l: '7', v: '7' },
    { l: '8', v: '8' },
    { l: '9', v: '9' },
    { l: '×', v: '×', variant: 'op' },
    { l: '4', v: '4' },
    { l: '5', v: '5' },
    { l: '6', v: '6' },
    { l: '−', v: '-', variant: 'op' },
    { l: '1', v: '1' },
    { l: '2', v: '2' },
    { l: '3', v: '3' },
    { l: '+', v: '+', variant: 'op' },
    { l: '±', act: toggleSign, variant: 'fn' },
    { l: '0', v: '0' },
    { l: '.', v: '.' },
    { l: '=', act: equals, variant: 'accent' },
  ];

  return (
    <div className="h-full w-full flex flex-col bg-background text-foreground p-3 gap-2">
      {/* Top control bar */}
      <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
        <div className="inline-flex rounded-md border bg-muted/40 p-0.5 text-xs">
          <button
            onClick={() => setMode('std')}
            className={cn(
              'px-2.5 py-1 rounded transition-colors',
              mode === 'std' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            标准
          </button>
          <button
            onClick={() => setMode('sci')}
            className={cn(
              'px-2.5 py-1 rounded transition-colors',
              mode === 'sci' ? 'bg-background shadow-sm font-medium' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            科学
          </button>
        </div>
        {mode === 'sci' && (
          <button
            onClick={() => setDegRad((d) => (d === 'deg' ? 'rad' : 'deg'))}
            className="px-2 py-1 text-xs font-medium rounded-md border bg-muted/40 hover:bg-muted transition-colors"
            title="切换角度/弧度"
          >
            {degRad.toUpperCase()}
          </button>
        )}
        <div className="ml-auto flex items-center gap-1">
          {(['MC', 'MR', 'M+', 'M-'] as const).map((label, i) => {
            const fn = [memClear, memRecall, memAdd, memSub][i];
            return (
              <button
                key={label}
                onClick={fn}
                disabled={i === 0 && memory === 0}
                className={cn(
                  'px-2 py-1 text-xs rounded-md border bg-muted/30 hover:bg-muted transition-colors',
                  memory !== 0 && 'font-semibold',
                  i === 0 && memory === 0 && 'opacity-40 cursor-not-allowed',
                )}
              >
                {label}
              </button>
            );
          })}
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            className={cn(
              'p-1.5 rounded-md border bg-muted/30 hover:bg-muted transition-colors',
              historyOpen && 'bg-muted',
            )}
            title="历史记录"
          >
            <History className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {memory !== 0 && (
        <div className="text-xs text-muted-foreground -mt-1 shrink-0">
          M = {formatNumber(memory)}
        </div>
      )}

      {/* Display */}
      <div className="rounded-lg border bg-muted/30 p-3 shrink-0">
        <div className="text-right text-xs text-muted-foreground min-h-[1rem] truncate font-mono break-all">
          {expr || '\u00A0'}
        </div>
        <div
          className={cn(
            'text-right text-3xl font-mono font-semibold truncate tabular-nums',
            result === '错误' && 'text-destructive',
          )}
        >
          {result}
        </div>
      </div>

      {/* Buttons area + history panel */}
      <div className="flex-1 flex gap-2 min-h-0">
        <div className="flex-1 flex flex-col gap-2 min-h-0 overflow-y-auto">
          {mode === 'sci' && (
            <div className="grid grid-cols-3 gap-1.5 shrink-0">
              {sciButtons.map((b) => (
                <CalcKey key={b.l} variant="fn" onClick={() => append(b.v)}>
                  {b.l}
                </CalcKey>
              ))}
            </div>
          )}
          <div className="grid grid-cols-4 grid-rows-5 gap-1.5 flex-1 min-h-0">
            {mainButtons.map((b, i) => (
              <CalcKey
                key={i}
                variant={b.variant}
                accent={b.variant === 'accent' ? accent : undefined}
                onClick={() => (b.act ? b.act() : append(b.v!))}
              >
                {b.l}
              </CalcKey>
            ))}
          </div>
        </div>

        {historyOpen && (
          <div className="w-32 shrink-0 border-l pl-2 flex flex-col gap-1 min-h-0">
            <div className="flex items-center justify-between shrink-0">
              <span className="text-xs font-medium">历史</span>
              <button
                onClick={() => setHistory([])}
                className="text-muted-foreground hover:text-foreground"
                title="清空历史"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <ScrollArea className="flex-1 min-h-0">
              <div className="flex flex-col gap-1 pr-1">
                {history.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4">暂无历史</div>
                ) : (
                  history.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => insertResult(h.result)}
                      className="text-left rounded-md p-1.5 hover:bg-muted transition-colors"
                      title="点击插入结果"
                    >
                      <div className="text-xs text-muted-foreground truncate font-mono">{h.expr}</div>
                      <div className="text-sm font-mono font-semibold truncate">= {h.result}</div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}

function CalcKey({
  children,
  onClick,
  variant = 'num',
  accent,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'num' | 'op' | 'fn' | 'accent';
  accent?: string;
}) {
  const base =
    'rounded-lg text-sm font-medium transition-all active:scale-95 flex items-center justify-center select-none cursor-pointer min-h-[44px]';
  const variants: Record<string, string> = {
    num: 'bg-muted hover:bg-muted/70 text-foreground',
    op: 'bg-secondary hover:bg-secondary/70 text-foreground font-semibold',
    fn: 'bg-muted/40 hover:bg-muted text-foreground',
    accent: 'text-white shadow-lg hover:brightness-110 font-semibold',
  };
  return (
    <button
      className={cn(base, variants[variant])}
      onClick={onClick}
      style={
        variant === 'accent' && accent
          ? { backgroundColor: accent, borderColor: accent }
          : undefined
      }
    >
      {children}
    </button>
  );
}
