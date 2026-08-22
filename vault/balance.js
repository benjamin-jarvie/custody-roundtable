// Watch-only network data. This module never accepts seed words, a passphrase,
// an xprv, or any private-key material. Only a public Bitcoin address is sent.

const API_BASE = "https://mempool.space/api";
const DEMO_ADDRESS = "bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu";
const SESSION_KEY = "bitcoin-butlers.watch-address";

function validAddressShape(address){
  return typeof address === "string"
    && address.length >= 26
    && address.length <= 90
    && /^[A-Za-z0-9]+$/.test(address);
}

export function resolveWatchAddress({ allowDemo = false } = {}){
  const supplied = new URLSearchParams(location.search).get("address")?.trim();
  if (supplied && validAddressShape(supplied)){
    sessionStorage.setItem(SESSION_KEY, supplied);
    return { address: supplied, source: "connected" };
  }
  const remembered = sessionStorage.getItem(SESSION_KEY);
  if (remembered && validAddressShape(remembered)){
    return { address: remembered, source: "connected" };
  }
  return allowDemo ? { address: DEMO_ADDRESS, source: "demo" } : null;
}

export function addressBalanceFromStats(data){
  const confirmed = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
  const unconfirmed = data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum;
  const totalSats = Math.max(0, confirmed + unconfirmed);
  return {
    confirmedSats: confirmed,
    unconfirmedSats: unconfirmed,
    totalSats,
    btc: totalSats / 100_000_000,
    txCount: data.chain_stats.tx_count + data.mempool_stats.tx_count
  };
}

async function requestJson(url, signal){
  const response = await fetch(url, {
    signal,
    cache: "no-store",
    credentials: "omit",
    referrerPolicy: "no-referrer"
  });
  if (!response.ok){
    const error = new Error(response.status === 429 ? "Mempool rate limit reached" : "Mempool request failed");
    error.status = response.status;
    throw error;
  }
  return response.json();
}

export async function loadWatchBalance({ allowDemo = false, timeoutMs = 8000 } = {}){
  const watch = resolveWatchAddress({ allowDemo });
  if (!watch) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const addressUrl = API_BASE + "/address/" + encodeURIComponent(watch.address);
    const [addressResult, priceResult] = await Promise.allSettled([
      requestJson(addressUrl, controller.signal),
      requestJson(API_BASE + "/v1/prices", controller.signal)
    ]);
    if (addressResult.status === "rejected") throw addressResult.reason;
    const balance = addressBalanceFromStats(addressResult.value);
    const usdPrice = priceResult.status === "fulfilled" && Number.isFinite(priceResult.value.USD)
      ? priceResult.value.USD
      : null;
    return {
      ...watch,
      ...balance,
      usdPrice,
      usdValue: usdPrice === null ? null : balance.btc * usdPrice,
      fetchedAt: Date.now()
    };
  } finally {
    clearTimeout(timer);
  }
}

export function formatBtc(value){
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 8,
    maximumFractionDigits: 8
  }) + " BTC";
}

export function formatUsd(value){
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(value);
}

export { DEMO_ADDRESS };
