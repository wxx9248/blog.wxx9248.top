const avPattern = /^av(?<number>\d+)$/iu;
const bvPattern = /^BV1[A-Za-z0-9]{9}$/iu;

const prefix = "BV1";
const alphabet = "FcwAPNKTMug3GV5Lj7EJnHpWsx4tb8haYeviqBz6rkCy12mUSDQX9RdoZf";
const base = BigInt(alphabet.length);
// Where each digit sits after the prefix, least significant first
// eslint-disable-next-line no-magic-numbers -- a fixed layout, not quantities
const digitPositions = [8, 7, 0, 5, 1, 3, 2, 4, 6] as const;
// AV ids fit in 51 bits; a BV id also sets the bit above them
const avLimit = 2251799813685248n;
const avMask = 2251799813685247n;
const xorMask = 23442827791579n;
const notFound = -1;

function avToBv(av: bigint): string | null {
  if (av >= avLimit) {
    return null;
  }
  let encoded = (avLimit | av) ^ xorMask;
  const digits = digitPositions.map(() => "");
  for (const position of digitPositions) {
    digits[position] = alphabet.charAt(Number(encoded % base));
    encoded /= base;
  }
  return `${prefix}${digits.join("")}`;
}

function bvToAv(bv: string): string | null {
  const digits = bv.slice(prefix.length);
  let encoded = 0n;
  for (const position of digitPositions.toReversed()) {
    const digit = alphabet.indexOf(digits.charAt(position));
    if (digit === notFound) {
      return null;
    }
    encoded = encoded * base + BigInt(digit);
  }
  return `av${(encoded & avMask) ^ xorMask}`;
}

/** Converts an AV id to its BV id and back; null if it's neither. */
export function convertBilibiliId(id: string): string | null {
  const trimmed = id.trim();
  const av = avPattern.exec(trimmed)?.groups?.number;
  if (av) {
    return avToBv(BigInt(av));
  }
  return bvPattern.test(trimmed) ? bvToAv(trimmed) : null;
}
