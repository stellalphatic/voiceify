import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteDocumentPoints } from "./qdrant";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("deleteDocumentPoints", () => {
  it("deletes all vectors scoped to the document", async () => {
    vi.stubEnv("QDRANT_URL", "http://qdrant:6333");
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await deleteDocumentPoints("org-1", "doc-1");

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, request] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "http://qdrant:6333/collections/voiceify_kb_v2_org-1/points/delete?wait=true",
    );
    expect(request.method).toBe("POST");
    expect(JSON.parse(String(request.body))).toEqual({
      filter: {
        must: [{ key: "docId", match: { value: "doc-1" } }],
      },
    });
  });

  it("does nothing when Qdrant is not configured", async () => {
    vi.stubEnv("QDRANT_URL", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await deleteDocumentPoints("org-1", "doc-1");

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
