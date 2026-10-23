const buckets = new Map<string, { count: number; until: number }>();
export function limit(key: string, max = 30, windowMs = 60000) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (bucket && bucket.until > now) {
    if (bucket.count >= max)
      throw new Error("Demasiadas solicitudes. Espera un minuto.");
    bucket.count++;
    return;
  }
  if (buckets.size >= 5000) {
    for (const [k, v] of buckets) if (v.until <= now) buckets.delete(k);
    if (buckets.size >= 5000)
      throw new Error("El servicio está ocupado. Inténtalo más tarde.");
  }
  buckets.set(key, { count: 1, until: now + windowMs });
}
