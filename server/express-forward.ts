import type { Request, Response } from 'express';

// Aliases for the Web Fetch API types to avoid name collision with Express types
type WebRequest = globalThis.Request;
type WebResponse = globalThis.Response;

/** Forward Express POST JSON body to a Web API handler Response. */
export async function forwardPostHandler(
  req: Request,
  res: Response,
  handler: (webReq: WebRequest) => Promise<WebResponse>,
): Promise<void> {
  try {
    const webReq = new Request(`http://${req.headers.host}${req.originalUrl}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req.body ?? {}),
    });
    const webRes = await handler(webReq);
    res.status(webRes.status);
    webRes.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'content-encoding') return;
      res.setHeader(key, value);
    });
    if (webRes.headers.get('content-type')?.includes('ndjson')) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Accel-Buffering', 'no');
    }
    if (!webRes.body) {
      res.end();
      return;
    }
    const reader = webRes.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value?.byteLength) res.write(Buffer.from(value));
    }
    res.end();
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Request failed';
    if (!res.headersSent) res.status(500).json({ error: msg });
    else res.end();
  }
}
