import { WORDS } from "./vendor/bip39-en.js";

export async function entropyToMnemonic(entropy){
  if (!(entropy instanceof Uint8Array) || entropy.length !== 16){
    throw new TypeError("BIP-39 demo entropy must be 128 bits");
  }
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", entropy));
  let bits = "";
  for (const byte of entropy) bits += byte.toString(2).padStart(8, "0");
  bits += (hash[0] >> 4).toString(2).padStart(4, "0");
  const words = [];
  for (let offset = 0; offset < 132; offset += 11){
    words.push(WORDS[parseInt(bits.slice(offset, offset + 11), 2)]);
  }
  return words;
}

export async function generateMnemonic(){
  const entropy = crypto.getRandomValues(new Uint8Array(16));
  return { entropy, words: await entropyToMnemonic(entropy) };
}

export async function validLastWords(first11){
  const indexes = first11.map(word => WORDS.indexOf(word));
  if (indexes.some(index => index < 0)) return [];
  let bits = "";
  for (const index of indexes) bits += index.toString(2).padStart(11, "0");
  const options = [];
  for (let value = 0; value < 128; value++){
    const entropyBits = bits + value.toString(2).padStart(7, "0");
    const entropy = new Uint8Array(16);
    for (let index = 0; index < 16; index++){
      entropy[index] = parseInt(entropyBits.slice(index * 8, index * 8 + 8), 2);
    }
    const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", entropy));
    options.push(WORDS[(value << 4) | (hash[0] >> 4)]);
  }
  return options;
}

export async function validMnemonic(words){
  if (!Array.isArray(words) || words.length !== 12) return false;
  const indexes = words.map(word => WORDS.indexOf(word));
  if (indexes.some(index => index < 0)) return false;
  let bits = "";
  for (const index of indexes) bits += index.toString(2).padStart(11, "0");
  const entropyBits = bits.slice(0, 128);
  const checksumBits = bits.slice(128);
  const entropy = new Uint8Array(16);
  for (let index = 0; index < 16; index++){
    entropy[index] = parseInt(entropyBits.slice(index * 8, index * 8 + 8), 2);
  }
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", entropy));
  return checksumBits === hash[0].toString(2).padStart(8, "0").slice(0, 4);
}

export { WORDS };
