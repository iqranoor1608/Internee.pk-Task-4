import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Download, Camera, X, Loader2, ImageOff } from "lucide-react";
import "./index.css"; // Imports your custom zinc and white stylesheet

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
  const [status, setStatus] = useState("idle"); 
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
        const url = `https://unsplash.com{encodeURIComponent(
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
        if (thisRequest !== requestId.current) return; 
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
  // Key-entry gate (Auth Screen)
  // -------------------------------------------------------------------------
  if (!apiKey) {
    return (
      <div className="gallery-auth-screen">
        <div className="gallery-auth-card">
          <div className="gallery-badge">
            <Camera size={14} /> Contact Sheet
          </div>
          <h1 className="gallery-title">Connect your Unsplash key</h1>
          <p className="gallery-description">
            This gallery pulls images live from the Unsplash API. Paste your
            Access Key below to start browsing. It's kept only in this
            session's memory.
          </p>
          <input
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
            placeholder="Unsplash Access Key"
            className="gallery-input"
          />
          <button
            onClick={() => keyDraft.trim() && setApiKey(keyDraft.trim())}
            className="gallery-btn-primary"
          >
            Enter gallery
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Main gallery screen
  // -------------------------------------------------------------------------
  return (
    <div className="gallery-main-layout">
      <header className="gallery-header">
        <div className="gallery-header-container">
          <div className="gallery-badge">
            <Camera size={14} /> Contact Sheet
          </div>
          <div className="gallery-header-flex">
            <h1 className="gallery-hero-heading">A grid of borrowed light.</h1>
            <span className="gallery-frames-counter">
              {status === "ready" ? `${photos.length} frames` : "\u00A0"}
            </span>
          </div>

          <div className="gallery-search-box">
            <Search size={16} className="gallery-search-icon" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search photos... (showing "${DEFAULT_QUERY}" by default)`}
              className="gallery-search-input"
            />
            {query && (
              <button onClick={() => setQuery("")} className="gallery-clear-btn" aria-label="Clear search">
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="gallery-grid-container">
        {status === "loading" && (
          <div className="gallery-state-loading">
            <Loader2 className="animate-spin" size={24} />
            <span>Developing the film…</span>
          </div>
        )}

        {status === "error" && (
          <div className="gallery-state-error">
            <ImageOff size={28} />
            <p>{errorMsg}</p>
          </div>
        )}

        {status === "ready" && (
          <div className="gallery-photo-grid">
            {photos.map((photo) => (
              <div key={photo.id} className="gallery-photo-card group">
                <div className="gallery-photo-wrapper">
                  <img
                    src={photo.urls.regular}
                    alt={photo.alt_description || "Unsplash image"}
                  />
                  <div className="gallery-photo-overlay opacity-0">
                    <span className="gallery-photo-author">By {photo.user?.name || "Unsplash"}</span>
                    <button onClick={() => handleDownload(photo)} aria-label="Download image">
                      {downloadingId === photo.id ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
