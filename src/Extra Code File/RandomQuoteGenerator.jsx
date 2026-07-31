import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Download, Camera, X, Loader2, ImageOff } from "lucide-react";

// ---------------------------------------------------------------------------
// Paste your Unsplash "Access Key" (from unsplash.com/oauth/applications) here.
// If left blank, the gallery will prompt for it in the UI instead (kept only
// in memory for this session — never persisted).
// ---------------------------------------------------------------------------
const UNSPLASH_ACCESS_KEY = "";

const DEFAULT_QUERY = "editorial photography";
const PER_PAGE = 20;

function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function ImageGallery() {
  const [apiKey, setApiKey] = useState(UNSPLASH_ACCESS_KEY);
  const [keyDraft, setKeyDraft] = useState("");
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 500);
  const [photos, setPhotos] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | error | ready
  const [errorMsg, setErrorMsg] = useState("");
  const [downloadingId, setDownloadingId] = useState(null);
  const requestId = useRef(0);

  const fetchPhotos = useCallback(
    async (searchTerm) => {
      if (!apiKey) return;
      const thisRequest = ++requestId.current;
      setStatus("loading");
      setErrorMsg("");
      try {
        const term = searchTerm && searchTerm.trim() ? searchTerm.trim() : DEFAULT_QUERY;
        const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
          term
        )}&per_page=${PER_PAGE}`;
        const res = await fetch(url, {
          headers: { Authorization: `Client-ID ${apiKey}` },
        });
        if (!res.ok) {
          if (res.status === 401) throw new Error("Invalid access key. Check your Unsplash key.");
          if (res.status === 403) throw new Error("Rate limit reached. Try again shortly.");
          throw new Error(`Unsplash request failed (${res.status}).`);
        }
        const data = await res.json();
        if (thisRequest !== requestId.current) return; // stale response, ignore
        setPhotos(data.results || []);
        setStatus("ready");
      } catch (err) {
        if (thisRequest !== requestId.current) return;
        setErrorMsg(err.message || "Something went wrong fetching images.");
        setStatus("error");
      }
    },
    [apiKey]
  );

  useEffect(() => {
    if (apiKey) fetchPhotos(debouncedQuery);
  }, [debouncedQuery, apiKey, fetchPhotos]);

  const handleDownload = async (photo) => {
    setDownloadingId(photo.id);
    try {
      // Unsplash API guidelines: ping download_location to register the download,
      // then use the returned url to actually fetch the file.
      let downloadUrl = photo.urls.full;
      if (apiKey && photo.links && photo.links.download_location) {
        const res = await fetch(photo.links.download_location, {
          headers: { Authorization: `Client-ID ${apiKey}` },
        });
        if (res.ok) {
          const data = await res.json();
          downloadUrl = data.url || downloadUrl;
        }
      }
      const imgRes = await fetch(downloadUrl);
      const blob = await imgRes.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${photo.id}-${(photo.alt_description || "unsplash-photo").replace(/\s+/g, "-").slice(0, 40)}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(photo.links?.html || photo.urls.full, "_blank");
    } finally {
      setDownloadingId(null);
    }
  };

  // -------------------------------------------------------------------------
  // Key-entry gate
  // -------------------------------------------------------------------------
  if (!apiKey) {
    return (
      <div className="min-h-screen bg-white text-zinc-900 flex items-center justify-center px-6">
        <div className="max-w-md w-full border border-zinc-200 rounded-xl p-8 shadow-sm">
          <div className="flex items-center gap-2 text-zinc-400 mb-4 tracking-widest text-xs uppercase">
            <Camera size={14} /> Contact Sheet
          </div>
          <h1 className="text-2xl font-semibold mb-3 tracking-tight">
            Connect your Unsplash key
          </h1>
          <p className="text-zinc-500 text-sm mb-6 leading-relaxed">
            This gallery pulls images live from the Unsplash API. Paste your
            Access Key below to start browsing. It's kept only in this
            session's memory.
          </p>
          <input
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
            placeholder="Unsplash Access Key"
            className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2.5 mb-4 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
          />
          <button
            onClick={() => keyDraft.trim() && setApiKey(keyDraft.trim())}
            className="w-full bg-zinc-900 text-white py-2.5 rounded-lg text-sm font-medium tracking-wide hover:bg-zinc-700 transition-colors"
          >
            Enter gallery
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Main gallery
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <header className="border-b border-zinc-200 sticky top-0 z-20 bg-white/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-7">
          <div className="flex items-center gap-2 text-zinc-400 text-xs uppercase tracking-[0.2em] mb-2">
            <Camera size={14} /> Contact Sheet
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900">
              A grid of borrowed light.
            </h1>
            <span className="text-xs text-zinc-400 uppercase tracking-widest">
              {status === "ready" ? `${photos.length} frames` : "\u00A0"}
            </span>
          </div>

          <div className="relative mt-6 max-w-xl">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search photos... (showing "${DEFAULT_QUERY}" by default)`}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-lg pl-10 pr-9 py-2.5 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors placeholder:text-zinc-400"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {status === "loading" && (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-400 gap-3">
            <Loader2 className="animate-spin" size={24} />
            <span className="text-sm tracking-wide">Developing the film…</span>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
            <ImageOff size={28} className="text-zinc-300" />
            <p className="text-zinc-900">{errorMsg}</p>
            <button
              onClick={() => fetchPhotos(debouncedQuery)}
              className="mt-2 text-xs uppercase tracking-widest border border-zinc-300 px-4 py-2 rounded-lg hover:border-zinc-900 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {status === "ready" && photos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center gap-2">
            <ImageOff size={28} className="text-zinc-300" />
            <p className="text-zinc-900">No frames match "{query}".</p>
            <p className="text-sm text-zinc-400">Try a different word — a place, a mood, a color.</p>
          </div>
        )}

        {status === "ready" && photos.length > 0 && (
          <div
            className="grid gap-5"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}
          >
            {photos.map((photo) => (
              <figure
                key={photo.id}
                className="group relative overflow-hidden rounded-xl bg-zinc-50 border border-zinc-200 flex flex-col shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <div className="relative w-full aspect-[3/4] overflow-hidden">
                  <img
                    src={photo.urls.small}
                    alt={photo.alt_description || "Unsplash photo"}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <button
                    onClick={() => handleDownload(photo)}
                    disabled={downloadingId === photo.id}
                    className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/95 border border-zinc-200 text-zinc-900 text-xs px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 transition-all duration-300 hover:bg-zinc-900 hover:text-white disabled:opacity-60 shadow-sm"
                  >
                    {downloadingId === photo.id ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Download size={13} />
                    )}
                    {downloadingId === photo.id ? "Saving" : "Download"}
                  </button>
                </div>
                <figcaption className="px-3 py-2.5 flex items-center justify-between gap-2">
                  <span className="text-xs text-zinc-500 truncate">
                    {photo.user?.name || "Unknown"}
                  </span>
                  <span
                    className="w-3 h-3 rounded-full border border-zinc-200 shrink-0"
                    style={{ backgroundColor: photo.color || "#e4e4e7" }}
                    title={photo.color}
                  />
                </figcaption>
              </figure>
            ))}
          </div>
        )}
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-8 text-center text-[10px] uppercase tracking-[0.2em] text-zinc-400">
        Images courtesy of Unsplash contributors
      </footer>
    </div>
  );
}