// Haedurio payment links: order lookup, payment verification and PortOne webhooks.
// Deploy with JWT verification OFF (PortOne webhooks don't send a Supabase JWT).
// Secrets: PORTONE_API_SECRET (required), PORTONE_WEBHOOK_SECRET (only for webhooks).
import { createClient } from 'npm:@supabase/supabase-js@2';

const STORE_ID = 'store-ad018163-85b1-44bf-8aa1-8b38c4efc77a';
const API_SECRET = Deno.env.get('PORTONE_API_SECRET') ?? '';
const WEBHOOK_SECRET = Deno.env.get('PORTONE_WEBHOOK_SECRET') ?? '';

const sb = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
  auth: { persistSession: false },
});

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const CODE_RE = /^[a-z0-9]{6,20}$/;
const PID_RE = /^hd-([a-z0-9]{6,20})-[a-z0-9]{4,16}$/;
const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

type Order = Record<string, any>;

function publicOrder(o: Order) {
  const expired = o.status === 'open' && new Date(o.expires_at).getTime() < Date.now();
  const status = expired ? 'expired' : o.status;
  const base = { code: o.code, title: o.title, amount: o.amount, currency: o.currency, status, test: o.test, lang: o.lang };
  if (status === 'open') {
    return { ...base, name: o.customer_name ?? '', email: o.customer_email ?? '', phone: o.customer_phone ?? '' };
  }
  if (status === 'paid') return { ...base, paidAt: o.paid_at };
  return base;
}

async function getOrder(code: string): Promise<Order | null> {
  const { data, error } = await sb.from('pay_orders').select('*').eq('code', code).maybeSingle();
  if (error) throw error;
  return data;
}

async function portone(path: string, init: RequestInit = {}) {
  const r = await fetch('https://api.portone.io' + path, {
    ...init,
    headers: { Authorization: `PortOne ${API_SECRET}`, 'Content-Type': 'application/json' },
  });
  const body = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, body };
}

async function refund(paymentId: string, reason: string) {
  return portone(`/payments/${encodeURIComponent(paymentId)}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ storeId: STORE_ID, reason }),
  });
}

async function note(order: Order, text: string) {
  await sb.from('pay_orders').update({ last_error: text.slice(0, 300) }).eq('id', order.id);
}

// Ask PortOne for the payment and mark the order paid only if it really is.
async function verifyAndMark(order: Order, paymentId: string) {
  if (order.status === 'paid' && order.payment_id === paymentId) {
    return { ok: true, status: 'paid', order: publicOrder(order) };
  }
  const { ok, status, body: p } = await portone(
    `/payments/${encodeURIComponent(paymentId)}?storeId=${encodeURIComponent(STORE_ID)}`,
  );
  if (!ok) return { ok: false, error: status === 404 ? 'payment_not_found' : 'lookup_failed' };
  if (p.status !== 'PAID') return { ok: false, error: 'not_paid', paymentStatus: p.status };

  const total = p.amount?.total;
  const channelType = p.channel?.type;
  const matches = total === order.amount && p.currency === 'KRW' && (order.test || channelType === 'LIVE');
  if (!matches) {
    const r = await refund(paymentId, 'Amount or channel does not match the order');
    await note(order, `Refunded ${paymentId}: paid ${total} ${p.currency} via ${channelType}, expected ${order.amount} KRW (refund ${r.ok ? 'ok' : 'FAILED'})`);
    return { ok: false, error: 'mismatch' };
  }

  if (order.status === 'paid') {
    // Paid twice. Keep the first payment and flag the second for a manual refund.
    await note(order, `Second payment ${paymentId} received after ${order.payment_id}. Refund it in PortOne.`);
    return { ok: true, status: 'paid', order: publicOrder(order) };
  }
  if (order.status !== 'open') {
    const r = await refund(paymentId, 'Order was cancelled');
    await note(order, `Payment ${paymentId} arrived for a ${order.status} order and was refunded (refund ${r.ok ? 'ok' : 'FAILED'})`);
    return { ok: false, error: 'closed', order: publicOrder(order) };
  }

  const { data, error } = await sb
    .from('pay_orders')
    .update({
      status: 'paid',
      payment_id: paymentId,
      paid_at: p.paidAt ?? new Date().toISOString(),
      pay_method: p.method?.type ?? null,
      last_error: null,
    })
    .eq('id', order.id)
    .eq('status', 'open')
    .select('*')
    .maybeSingle();
  if (error) throw error;
  const fresh = data ?? (await getOrder(order.code));
  return { ok: true, status: 'paid', order: publicOrder(fresh!) };
}

// Standard Webhooks signature, as used by PortOne V2.
async function webhookIsValid(req: Request, raw: string) {
  const id = req.headers.get('webhook-id');
  const ts = req.headers.get('webhook-timestamp');
  const sig = req.headers.get('webhook-signature');
  if (!id || !ts || !sig || !WEBHOOK_SECRET) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const secret = WEBHOOK_SECRET.startsWith('whsec_') ? WEBHOOK_SECRET.slice(6) : WEBHOOK_SECRET;
  const keyBytes = Uint8Array.from(atob(secret), (ch) => ch.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${ts}.${raw}`)));
  const expected = btoa(String.fromCharCode(...mac));
  return sig.split(' ').some((part) => part.split(',')[1] === expected);
}

async function handleWebhook(req: Request) {
  const raw = await req.text();
  if (!(await webhookIsValid(req, raw))) return json({ ok: false }, 400);
  const event = JSON.parse(raw);
  const paymentId = event?.data?.paymentId;
  const m = typeof paymentId === 'string' ? paymentId.match(PID_RE) : null;
  if (event?.type === 'Transaction.Paid' && m) {
    const order = await getOrder(m[1]);
    if (order) await verifyAndMark(order, paymentId);
  }
  return json({ ok: true });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'method' }, 405);
  try {
    if (req.headers.get('webhook-id')) return await handleWebhook(req);

    const body = await req.json().catch(() => ({}));
    const code = clip(body.code, 20).toLowerCase();
    if (!CODE_RE.test(code)) return json({ ok: false, error: 'not_found' }, 404);
    const order = await getOrder(code);
    if (!order) return json({ ok: false, error: 'not_found' }, 404);

    if (body.action === 'get') return json({ ok: true, order: publicOrder(order) });

    const paymentId = clip(body.paymentId, 60);
    const m = paymentId.match(PID_RE);
    if (!m || m[1] !== code) return json({ ok: false, error: 'bad_payment_id' }, 400);

    if (body.action === 'start') {
      const view = publicOrder(order);
      if (view.status !== 'open') return json({ ok: false, error: 'closed', order: view }, 409);
      await sb.from('pay_orders').update({
        last_payment_id: paymentId,
        customer_name: clip(body.name, 60) || order.customer_name,
        customer_email: clip(body.email, 120) || order.customer_email,
        customer_phone: clip(body.phone, 30) || order.customer_phone,
      }).eq('id', order.id);
      return json({ ok: true });
    }

    if (body.action === 'complete') {
      if (!API_SECRET) return json({ ok: false, error: 'not_configured' }, 500);
      const result = await verifyAndMark(order, paymentId);
      return json(result, result.ok ? 200 : 409);
    }

    return json({ ok: false, error: 'action' }, 400);
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: 'server' }, 500);
  }
});
