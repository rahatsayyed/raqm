export interface VoiceTx {
  amount: number | null;
  merchant: string;
  categoryText: string;
}

const ONES: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
  seventeen: 17, eighteen: 18, nineteen: 19,
};
const TENS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const SCALES: Record<string, number> = {
  k: 1000, thousand: 1000, lakh: 100000, lac: 100000, crore: 10000000,
};
const PREPOSITIONS = new Set(['at', 'on', 'for', 'to', 'from']);
const FILLER = new Set([
  'spent', 'paid', 'pay', 'bought', 'buy', 'at', 'on', 'for', 'to', 'from', 'in', 'of', 'the',
  'a', 'an', 'rupees', 'rupee', 'rs', 'inr', 'only', 'and', 'using', 'with',
]);

interface Candidate {
  value: number;
  start: number;
  end: number;
  digits: boolean;
}

const isNumberWord = (w: string | undefined) =>
  w !== undefined && (ONES[w] !== undefined || TENS[w] !== undefined);

function parseDigits(tokens: string[], i: number): Candidate | null {
  const t = tokens[i] ?? '';
  if (!/^\d/.test(t)) return null;
  let value = parseFloat(t);
  let end = i + 1;
  const scale = SCALES[tokens[end] ?? ''];
  if (scale !== undefined) {
    value *= scale;
    end++;
  } else if (tokens[end] === 'hundred') {
    value *= 100;
    end++;
  }
  return { value, start: i, end, digits: true };
}

function parseWords(tokens: string[], i: number): Candidate | null {
  let total = 0;
  let current = 0;
  let j = i;
  let seen = false;
  let prevSingleOnes = false;
  while (j < tokens.length) {
    const w = tokens[j] ?? '';
    const ones = ONES[w];
    const tens = TENS[w];
    const scale = SCALES[w];
    if (w === 'and' && seen && tokens[j + 1] === 'a' && tokens[j + 2] === 'half') {
      current += 0.5;
      j += 3;
      prevSingleOnes = false;
      continue;
    }
    if (w === 'and' && seen && isNumberWord(tokens[j + 1])) {
      j++;
      continue;
    }
    if (ones !== undefined || tens !== undefined) {
      const v = (ones ?? tens) as number;
      // "two fifty" is colloquial for 250
      if (prevSingleOnes && v >= 10 && current >= 1 && current <= 9) current = current * 100 + v;
      else current += v;
      prevSingleOnes = ones !== undefined && ones >= 1 && ones <= 9 && current === ones;
    } else if (w === 'hundred') {
      current = (current || 1) * 100;
      prevSingleOnes = false;
    } else if (scale !== undefined && w !== 'k') {
      total += (current || 1) * scale;
      current = 0;
      prevSingleOnes = false;
    } else {
      break;
    }
    seen = true;
    j++;
  }
  if (!seen) return null;
  return { value: total + current, start: i, end: j, digits: false };
}

const titleCase = (s: string) => s.replace(/\b[a-z]/g, (c) => c.toUpperCase());

export function parseVoiceTx(text: string): VoiceTx {
  const tokens =
    text
      .toLowerCase()
      .replace(/₹/g, ' rs ')
      .replace(/(\d),(?=\d)/g, '$1')
      .match(/\d+(?:\.\d+)?|[a-z]+/g) ?? [];

  const candidates: Candidate[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const c = parseDigits(tokens, i) ?? parseWords(tokens, i);
    if (c) {
      candidates.push(c);
      i = c.end - 1;
    }
  }
  const picked = candidates.find((c) => c.digits) ?? candidates[candidates.length - 1] ?? null;

  const rest = tokens.filter((_, idx) => !picked || idx < picked.start || idx >= picked.end);
  let lastPrep = -1;
  rest.forEach((w, idx) => {
    if (PREPOSITIONS.has(w)) lastPrep = idx;
  });
  const afterPrep = lastPrep >= 0 ? rest.slice(lastPrep + 1) : rest;
  const clean = (ws: string[]) => ws.filter((w) => !FILLER.has(w) && !isNumberWord(w));
  const merchantWords = clean(afterPrep).length ? clean(afterPrep) : clean(rest);

  return {
    amount: picked ? picked.value : null,
    merchant: titleCase(merchantWords.join(' ')),
    categoryText: rest.filter((w) => !FILLER.has(w)).join(' '),
  };
}
