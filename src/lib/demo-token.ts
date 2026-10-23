import { createHmac, timingSafeEqual } from "node:crypto";
export function signDemo(id: string, secret: string, now = Date.now()) {
  const payload = `${id}.${now + 86400000}`;
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("hex")}`;
}
export function verifyDemo(token: string, secret: string, now = Date.now()) {
  const [id, expires, signature, ...extra] = token.split(".");
  if (
    extra.length ||
    !/^demo-[a-f0-9-]{36}$/.test(id ?? "") ||
    !/^\d+$/.test(expires ?? "") ||
    Number(expires) <= now ||
    Number(expires) > now + 86400000 ||
    !signature ||
    !/^[a-f0-9]{64}$/.test(signature)
  )
    return null;
  const expected = createHmac("sha256", secret)
    .update(`${id}.${expires}`)
    .digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex")) ? id : null;
}
