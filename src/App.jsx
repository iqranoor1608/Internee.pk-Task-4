import { useState, useEffect } from "react";

/**
 * ============================================================
 *  RANDOM QUOTE GENERATOR TASK -> "Grid-Based Image Gallery with Search"
 * ============================================================
 *
 *  What this app does:
 *  1. Fetches photos from the real Unsplash API.
 *  2. Lets you search/filter photos by typing a keyword.
 *  3. Shows the photos in a responsive CSS Grid layout.
 *  4. Lets you download any photo with one click (the "challenge").
 *
 *  How it's organized (read top to bottom, just like a recipe):
 *  - A few constants/styles
 *  - The <ImageGallery /> component, which holds all the logic
 *  - Small helper components (PhotoCard, StatusMessage) at the bottom
 *
 *  You need a free Unsplash "Access Key" for this to work.
 *  Get one here: https://unsplash.com/developers
 *  (Create an app on Unsplash -> copy the "Access Key" -> paste it
 *   into the input box at the top of the page.)
 * ============================================================
 */

// How many photos we ask Unsplash for at once.
const PHOTOS_PER_PAGE = 20;

export default function ImageGallery() {
  // ---------- STATE ----------
  // The user's personal Unsplash Access Key (kept only in memory).
  const [apiKey, setApiKey] = useState("");
  // The text currently typed in the search box.
  const [searchTerm, setSearchTerm] = useState("");
  // The search term we actually last searched for (used to trigger fetches).
  const [activeQuery, setActiveQuery] = useState("");
  // The list of photo objects returned by Unsplash.
  const [photos, setPhotos] = useState([]);
  // Whether we are currently waiting on the network.
  const [isLoading, setIsLoading] = useState(false);
  // Any error message to show the user.
  const [errorMessage, setErrorMessage] = useState("");

  // ---------- FETCHING PHOTOS ----------
  // This runs whenever the API key or the active search query changes.
  useEffect(() => {
    // Don't try to fetch anything until the user has entered a key.
    if (!apiKey.trim()) {
      setPhotos([]);
      return;
    }

    // Build the correct Unsplash endpoint:
    // - if there's a search term, use the "search" endpoint
    // - otherwise, use the endpoint that just lists recent photos
    const baseUrl = activeQuery.trim()
      ? `https://api.unsplash.com/search/photos?query=${encodeURIComponent(
          activeQuery
        )}&per_page=${PHOTOS_PER_PAGE}`
      : `https://api.unsplash.com/photos?per_page=${PHOTOS_PER_PAGE}`;

    // An AbortController lets us cancel the request if the component
    // re-runs this effect before the old request finishes.
    const controller = new AbortController();

    async function fetchPhotos() {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const response = await fetch(baseUrl, {
          headers: {
            Authorization: `Client-ID ${apiKey.trim()}`,
          },
          signal: controller.signal,
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("That Access Key was rejected. Double-check it.");
          }
          throw new Error(`Unsplash returned an error (${response.status}).`);
        }

        const data = await response.json();
        // The "search" endpoint wraps results in a `results` array.
        // The "list photos" endpoint returns a plain array.
        const photoList = Array.isArray(data) ? data : data.results;
        setPhotos(photoList || []);
      } catch (error) {
        // Ignore the error that fires when we intentionally cancel a request.
        if (error.name !== "AbortError") {
          setErrorMessage(error.message);
          setPhotos([]);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchPhotos();

    // Cleanup: cancel the request if this effect re-runs or unmounts.
    return () => controller.abort();
  }, [apiKey, activeQuery]);

  // ---------- EVENT HANDLERS ----------
  function handleSearchSubmit() {
    setActiveQuery(searchTerm);
  }

  function handleSearchKeyDown(event) {
    if (event.key === "Enter") {
      handleSearchSubmit();
    }
  }

  function handleClearSearch() {
    setSearchTerm("");
    setActiveQuery("");
  }

  // Downloads a photo to the user's device.
  async function handleDownload(photo) {
    try {
      const response = await fetch(photo.urls.full);
      const imageBlob = await response.blob();
      const blobUrl = URL.createObjectURL(imageBlob);

      // Create a temporary, invisible link and "click" it to start the download.
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `unsplash-${photo.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Free up memory once the browser has used the blob URL.
      URL.revokeObjectURL(blobUrl);
    } catch {
      alert("Sorry, that download didn't work. Please try again.");
    }
  }

  // ---------- RENDER ----------
  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <p style={styles.eyebrow}>SEARCH &amp; SAVE</p>
        <h1 style={styles.title}>QUOTE GENERATOR</h1>
        <p style={styles.subtitle}>
          A grid-based photo gallery powered by the Unsplash API.
        </p>
      </header>

      {/* API key input — only needed once per visit */}
      <section style={styles.apiKeyBox}>
        <label htmlFor="api-key" style={styles.apiKeyLabel}>
          Unsplash Access Key
        </label>
        <input
          id="api-key"
          type="password"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          placeholder="Paste your key from unsplash.com/developers"
          style={styles.apiKeyInput}
        />
      </section>

      {/* Search bar */}
      <section style={styles.searchBar}>
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder="Search photos, e.g. mountains, coffee, cats..."
          style={styles.searchInput}
        />
        <button onClick={handleSearchSubmit} style={styles.searchButton}>
          Search
        </button>
        {activeQuery && (
          <button onClick={handleClearSearch} style={styles.clearButton}>
            Clear
          </button>
        )}
      </section>

      {/* Status messages */}
      {!apiKey.trim() && (
        <StatusMessage text="Add your Unsplash Access Key above to load photos." />
      )}
      {apiKey.trim() && isLoading && <StatusMessage text="Loading photos..." />}
      {errorMessage && <StatusMessage text={errorMessage} isError />}
      {apiKey.trim() && !isLoading && !errorMessage && photos.length === 0 && (
        <StatusMessage text="No photos found. Try a different search term." />
      )}

      {/* The responsive photo grid */}
      <section style={styles.grid}>
        {photos.map((photo, index) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            index={index}
            onDownload={handleDownload}
          />
        ))}
      </section>
    </div>
  );
}

// A single photo tile in the grid.
function PhotoCard({ photo, index, onDownload }) {
  const photographerName = photo.user?.name || "Unknown photographer";
  const photographerLink = `${photo.user?.links?.html || "https://unsplash.com"}?utm_source=contact_sheet_app&utm_medium=referral`;

  return (
    <figure style={styles.card}>
      <span style={styles.cardIndex}>{String(index + 1).padStart(2, "0")}</span>
      <img
        src={photo.urls.small}
        alt={photo.alt_description || "Unsplash photo"}
        style={styles.cardImage}
        loading="lazy"
      />
      <figcaption style={styles.cardFooter}>
        <a
          href={photographerLink}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.credit}
        >
          {photographerName}
        </a>
        <button
          onClick={() => onDownload(photo)}
          style={styles.downloadButton}
          aria-label={`Download photo by ${photographerName}`}
        >
          Download
        </button>
      </figcaption>
    </figure>
  );
}

// A simple centered status/error line.
function StatusMessage({ text, isError }) {
  return (
    <p style={{ ...styles.status, ...(isError ? styles.statusError : {}) }}>
      {text}
    </p>
  );
}

// ---------- STYLES ----------
// Plain JS objects instead of a CSS file, so beginners can see every
// rule right next to the component that uses it.
const styles = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#14161A",
    color: "#EDEAE3",
    fontFamily:
      "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
    padding: "48px 24px 80px",
    boxSizing: "border-box",
  },
  header: {
    maxWidth: 720,
    margin: "0 auto 40px",
    textAlign: "center",
  },
  eyebrow: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 12,
    letterSpacing: "0.2em",
    color: "#7FA8AD",
    marginBottom: 12,
  },
  title: {
    fontFamily: "Georgia, 'Times New Roman', serif",
    fontSize: "clamp(36px, 6vw, 56px)",
    margin: "0 0 12px",
    fontWeight: 700,
  },
  subtitle: {
    fontSize: 16,
    color: "#B7B2A6",
    margin: 0,
  },
  apiKeyBox: {
    maxWidth: 640,
    margin: "0 auto 20px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  apiKeyLabel: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 12,
    letterSpacing: "0.08em",
    color: "#7FA8AD",
    textTransform: "uppercase",
  },
  apiKeyInput: {
    padding: "12px 14px",
    borderRadius: 8,
    border: "1px solid #33363D",
    backgroundColor: "#1D2027",
    color: "#EDEAE3",
    fontSize: 14,
    outline: "none",
  },
  searchBar: {
    maxWidth: 640,
    margin: "0 auto 32px",
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  searchInput: {
    flex: "1 1 240px",
    padding: "12px 14px",
    borderRadius: 8,
    border: "1px solid #33363D",
    backgroundColor: "#1D2027",
    color: "#EDEAE3",
    fontSize: 15,
    outline: "none",
  },
  searchButton: {
    padding: "12px 20px",
    borderRadius: 8,
    border: "none",
    backgroundColor: "#4A7C82",
    color: "#0E1013",
    fontWeight: 600,
    fontSize: 14,
    cursor: "pointer",
  },
  clearButton: {
    padding: "12px 20px",
    borderRadius: 8,
    border: "1px solid #33363D",
    backgroundColor: "transparent",
    color: "#B7B2A6",
    fontSize: 14,
    cursor: "pointer",
  },
  status: {
    textAlign: "center",
    color: "#B7B2A6",
    fontSize: 14,
    marginBottom: 24,
  },
  statusError: {
    color: "#E28C6C",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 20,
    maxWidth: 1200,
    margin: "0 auto",
  },
  card: {
    margin: 0,
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#1B1E24",
    border: "1px solid #2A2D34",
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  cardIndex: {
    position: "absolute",
    top: 10,
    left: 10,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 11,
    color: "#EDEAE3",
    backgroundColor: "rgba(0,0,0,0.55)",
    padding: "2px 6px",
    borderRadius: 4,
  },
  cardImage: {
    width: "100%",
    height: 200,
    objectFit: "cover",
    display: "block",
  },
  cardFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    padding: "10px 12px",
  },
  credit: {
    fontSize: 13,
    color: "#B7B2A6",
    textDecoration: "none",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  downloadButton: {
    flexShrink: 0,
    padding: "6px 10px",
    borderRadius: 6,
    border: "1px solid #4A7C82",
    backgroundColor: "transparent",
    color: "#7FA8AD",
    fontSize: 12,
    cursor: "pointer",
  },
};