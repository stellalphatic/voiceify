export type WebHandler = (request: Request) => Response | Promise<Response>;

type VercelRequest = {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
  setHeader: (key: string, value: string) => void;
  write: (chunk: Buffer) => void;
  end: () => void;
  headersSent?: boolean;
};

function buildWebRequest(req: VercelRequest): Request {
  const host = req.headers.host ?? 'localhost';
  const url = `https://${host}${req.url ?? '/'}`;
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    if (Array.isArray(value)) {
      for (const part of value) headers.append(key, part);
    } else {
      headers.set(key, value);
    }
  }

  const method = req.method ?? 'GET';
  let body: string | undefined;
  if (method !== 'GET' && method !== 'HEAD' && req.body != null) {
    body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  return new Request(url, { method, headers, body });
}

async function sendWebResponse(res: VercelResponse, webRes: Response): Promise<void> {
  res.status(webRes.status);
  webRes.headers.forEach((value, key) => {
    if (key.toLowerCase() === 'content-encoding') return;
    res.setHeader(key, value);
  });

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
}

/** Bridge Web-standard handlers to Vercel Node.js (req, res) functions. */
export function vercelHandler(handler: WebHandler) {
  return async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    try {
      const webReq = buildWebRequest(req);
      const webRes = await handler(webReq);
      await sendWebResponse(res, webRes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Internal server error';
      if (!res.headersSent) {
        res.status(500).json({ error: msg });
      } else {
        res.end();
      }
    }
  };
}
