// Real BIP-39/BIP-32 root math, self-contained. Enough to derive the
// master key, its fingerprint and its xprv from a mnemonic + passphrase.
// No external requests; WebCrypto for PBKDF2/HMAC/SHA-256, plain JS for
// secp256k1 and RIPEMD-160.

const te = new TextEncoder();

export async function mnemonicToSeed(words, passphrase = ""){
  const km = await crypto.subtle.importKey("raw", te.encode(words.join(" ")),
    "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-512", iterations: 2048,
      salt: te.encode("mnemonic" + passphrase) }, km, 512);
  return new Uint8Array(bits);
}

async function hmac512(key, data){
  const k = await crypto.subtle.importKey("raw", key,
    { name: "HMAC", hash: "SHA-512" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}

// ---- secp256k1 compressed public key from a private key ----
const P = (1n << 256n) - (1n << 32n) - 977n;
const N = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141n;
const G = [0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81798n,
           0x483ADA7726A3C4655DA4FBFC0E1108A8FD17B448A68554199C47D08FFB10D4B8n];
const mod = (a, m = P) => ((a % m) + m) % m;
function inv(a, m = P){ let [g, x] = [m, 0n], [r, s] = [mod(a, m), 1n];
  while (r) { const q = g / r; [g, r] = [r, g - q*r]; [x, s] = [s, x - q*s]; }
  return mod(x, m); }
function padd(p, q){
  if (!p) return q; if (!q) return p;
  const [px, py] = p, [qx, qy] = q;
  if (px === qx && mod(py + qy) === 0n) return null;
  const l = px === qx ? mod(3n*px*px * inv(2n*py)) : mod((qy - py) * inv(qx - px));
  const x = mod(l*l - px - qx);
  return [x, mod(l*(px - x) - py)];
}
function pmul(k, p = G){ let r = null;
  while (k > 0n){ if (k & 1n) r = padd(r, p); p = padd(p, p); k >>= 1n; }
  return r; }
function pubkeyCompressed(privBytes){
  let k = 0n; for (const b of privBytes) k = (k << 8n) | BigInt(b);
  k = mod(k, N);
  const [x, y] = pmul(k);
  const out = new Uint8Array(33);
  out[0] = (y & 1n) ? 3 : 2;
  for (let i = 0; i < 32; i++) out[32 - i] = Number((x >> BigInt(i*8)) & 0xFFn);
  return out;
}

// ---- RIPEMD-160 ----
function ripemd160(msg){
  const rl=[[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15],[7,4,13,1,10,6,15,3,12,0,9,5,2,14,11,8],[3,10,14,4,9,15,8,1,2,7,0,6,13,11,5,12],[1,9,11,10,0,8,12,4,13,3,7,15,14,5,6,2],[4,0,5,9,7,12,2,10,14,1,3,8,11,6,15,13]];
  const rr=[[5,14,7,0,9,2,11,4,13,6,15,8,1,10,3,12],[6,11,3,7,0,13,5,10,14,15,8,12,4,9,1,2],[15,5,1,3,7,14,6,9,11,8,12,2,10,0,4,13],[8,6,4,1,3,11,15,0,5,12,2,13,9,7,10,14],[12,15,10,4,1,5,8,7,6,2,13,14,0,3,9,11]];
  const sl=[[11,14,15,12,5,8,7,9,11,13,14,15,6,7,9,8],[7,6,8,13,11,9,7,15,7,12,15,9,11,7,13,12],[11,13,6,7,14,9,13,15,14,8,13,6,5,12,7,5],[11,12,14,15,14,15,9,8,9,14,5,6,8,6,5,12],[9,15,5,11,6,8,13,12,5,12,13,14,11,8,5,6]];
  const sr=[[8,9,9,11,13,15,15,5,7,7,8,11,14,14,12,6],[9,13,15,7,12,8,9,11,7,7,12,7,6,15,13,11],[9,7,15,11,8,6,6,14,12,13,5,14,13,13,7,5],[15,5,8,11,14,14,6,14,6,9,12,9,12,5,15,8],[8,5,12,9,12,5,14,6,8,13,6,5,15,13,11,11]];
  const kl=[0,0x5a827999,0x6ed9eba1,0x8f1bbcdc,0xa953fd4e];
  const kr=[0x50a28be6,0x5c4dd124,0x6d703ef3,0x7a6d76e9,0];
  const f=(j,x,y,z)=> j===0?x^y^z : j===1?(x&y)|(~x&z) : j===2?(x|~y)^z : j===3?(x&z)|(y&~z) : x^(y|~z);
  const rot=(x,n)=>((x<<n)|(x>>>(32-n)))>>>0;
  const len=msg.length, withPad=((len+8)>>6<<6)+64;
  const m=new Uint8Array(withPad); m.set(msg); m[len]=0x80;
  const bitLen=len*8;
  m[withPad-8]=bitLen&0xff; m[withPad-7]=(bitLen>>>8)&0xff; m[withPad-6]=(bitLen>>>16)&0xff; m[withPad-5]=(bitLen>>>24)&0xff;
  let h=[0x67452301,0xefcdab89,0x98badcfe,0x10325476,0xc3d2e1f0];
  for(let off=0; off<withPad; off+=64){
    const X=new Array(16);
    for(let i=0;i<16;i++) X[i]=m[off+4*i]|(m[off+4*i+1]<<8)|(m[off+4*i+2]<<16)|(m[off+4*i+3]<<24);
    let [al,bl,cl,dl,el]=h,[ar,br,cr,dr,er]=h;
    for(let j=0;j<5;j++) for(let i=0;i<16;i++){
      let t=(al + f(j,bl,cl,dl) + X[rl[j][i]] + kl[j])>>>0;
      t=(rot(t,sl[j][i])+el)>>>0; al=el; el=dl; dl=rot(cl,10); cl=bl; bl=t;
      t=(ar + f(4-j,br,cr,dr) + X[rr[j][i]] + kr[j])>>>0;
      t=(rot(t,sr[j][i])+er)>>>0; ar=er; er=dr; dr=rot(cr,10); cr=br; br=t;
    }
    const t=(h[1]+cl+dr)>>>0;
    h=[t,(h[2]+dl+er)>>>0,(h[3]+el+ar)>>>0,(h[4]+al+br)>>>0,(h[0]+bl+cr)>>>0];
  }
  const out=new Uint8Array(20);
  for(let i=0;i<5;i++){ out[4*i]=h[i]&0xff; out[4*i+1]=(h[i]>>>8)&0xff; out[4*i+2]=(h[i]>>>16)&0xff; out[4*i+3]=(h[i]>>>24)&0xff; }
  return out;
}

const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
async function base58check(payload){
  const h1 = new Uint8Array(await crypto.subtle.digest("SHA-256", payload));
  const h2 = new Uint8Array(await crypto.subtle.digest("SHA-256", h1));
  const full = new Uint8Array(payload.length + 4);
  full.set(payload); full.set(h2.slice(0, 4), payload.length);
  let n = 0n; for (const b of full) n = (n << 8n) | BigInt(b);
  let s = ""; while (n > 0n){ s = B58[Number(n % 58n)] + s; n /= 58n; }
  for (const b of full){ if (b === 0) s = "1" + s; else break; }
  return s;
}

// master key from mnemonic: fingerprint + xprv, the real thing
export async function masterFromMnemonic(words, passphrase = ""){
  const seed = await mnemonicToSeed(words, passphrase);
  return masterFromSeed(seed);
}
export async function masterFromSeed(seed){
  const I = await hmac512(te.encode("Bitcoin seed"), seed);
  const key = I.slice(0, 32), chain = I.slice(32);
  const pub = pubkeyCompressed(key);
  const sha = new Uint8Array(await crypto.subtle.digest("SHA-256", pub));
  const fp = ripemd160(sha).slice(0, 4);
  const fpHex = [...fp].map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
  const payload = new Uint8Array(78);
  payload.set([0x04, 0x88, 0xAD, 0xE4]);        // xprv version
  // depth 0, parent 00000000, child 00000000 already zero
  payload.set(chain, 13);
  payload[45] = 0; payload.set(key, 46);
  const xprv = await base58check(payload);
  return { fp: fpHex, xprv };
}
