# Himig Karaoke - Reorganization Plan (v2)

Status: BUILT. Phases 0-5 are done (2026-11-14). Kept as the design record; see README.md for how to run it.

Changes from v1: offline is now a main feature; research on vocal separation and
music sources is included (section 3); a list of what to remove (section 7); and
a lighter stack that replaces Supabase, PHP and MySQL with one small service
(section 5).

## 1. What Himig becomes

A karaoke app. Songs are prepared once (vocals removed, lyrics synced), downloaded
to the phone, and from then on work with no internet. Friends join a room, a TV
or any screen shows the lyrics, and people take turns singing.

Main features:

1. Karaoke - auto-generated instrumental, original/instrumental toggle, synced lyrics.
2. Offline - every downloaded song plays fully offline: audio, instrumental, lyrics.
3. Multiplayer rooms - join by code or QR, shared queue, turns.
4. Big-screen display - smart TV, laptop, tablet, or another phone.

## 2. The offline rule

Internet is needed for exactly two things: getting a new song, and joining a room
hosted over the internet. Everything else is local.

| Action | Needs internet |
|---|---|
| Browse the online catalog, add a new song, prepare its karaoke version | Yes |
| Download a prepared song (instrumental + original + lyrics + cover) | Yes, once |
| Play, sing, switch instrumental/original, read lyrics, manage library | No |
| Party room on the same Wi-Fi with a laptop as host (section 4.3) | No |
| Room with people in other places | Yes |

Vocal separation is not done on the phone. The model needs about 1.1 GB of RAM
and would make the app large and slow; it runs once on the server, then the
result is downloaded. That keeps the app light and still fully offline afterwards.

## 3. Research

Findings from a web search on 2026-11-14. Speed figures are vendor or blog
numbers, not my own measurements, so a test on our hardware is step one of Phase 1.

### 3.1 Vocal / instrumental separation

| Tool | Quality | Cost to run | Status | Verdict |
|---|---|---|---|---|
| HTDemucs via `demucs-onnx` | Good | About 1.1 GB RAM; reported ~22 s per 3-min song on an Apple M4 Pro CPU; no PyTorch needed; has a `--karaoke` mode | Active | Recommended |
| HTDemucs fine-tuned (`htdemucs_ft`) | Better | ~4x slower, ~4 GB RAM | Active (same package) | Optional quality setting |
| BS-RoFormer / Mel-RoFormer | Best vocal scores on public leaderboards | Heavier; speed varies a lot by implementation; realistically wants a GPU | Active (community) | Later upgrade |
| Spleeter | Weakest | Fastest | Unmaintained since 2022 | Avoid |
| Original Demucs (PyTorch) | Good | Heavy PyTorch install | Repo read-only since Jan 2025 | Use the ONNX build instead |
| Paid APIs (LALAL.AI and similar) | Good | Per-song fee, no server needed | Commercial | Only if we refuse to host a worker |

Choice: `demucs-onnx` with the single-file `htdemucs` model. Lightest install,
runs on CPU, and one command produces the instrumental.

### 3.2 Sources of songs

| Source | What it gives | Catch |
|---|---|---|
| User's own audio files | Any song the user has as MP3/M4A | User must have the file |
| Jamendo API | Full-length Creative Commons tracks, searchable, free client ID for non-commercial apps | License differs per track (see note) |
| Free Music Archive | Full-length CC downloads | Download site, no practical API; use for a hand-picked starter pack |
| Spotify API | Metadata and cover art only | No audio at all - cannot be a song source |
| iTunes Search | 30-second previews | Too short for karaoke |

License note: removing vocals creates a modified version of the track. Creative
Commons "NoDerivatives" (ND) licenses forbid that, so the Jamendo filter must
exclude ND tracks. Jamendo's free tier is non-commercial; fine for a school
project, not for a paid release.

Choice: user's own files + Jamendo (ND excluded) for the online catalog.
Popular commercial songs are only available if the user supplies the file.

### 3.3 Lyrics

LRCLIB: free API, no key for lookups, returns time-synced lyrics matched by title,
artist and duration. Not every song is covered, so a paste-your-own-lyrics
fallback is needed.

## 4. How each feature works

### 4.1 Karaoke

1. User picks a song from the catalog or adds an audio file.
2. The server separates it once and looks up synced lyrics.
3. The phone downloads a song pack: `original.mp3`, `instrumental.mp3`,
   `lyrics.lrc`, `cover.jpg`.
4. The player offers Original / Instrumental; lyrics highlight by playback time.

A prepared song is cached on the server, so the next person skips step 2.

### 4.2 Offline library

Song packs live in the app's private storage with a small local index. The
library screen shows downloaded songs, size on disk, and a delete button. With no
connection the catalog tab is hidden and only the library is shown.

### 4.3 Multiplayer rooms

- Host creates a room, gets a code and QR; guests join with just a name.
- Shared: member list, queue, current singer, play/pause/skip.
- Everyone is in the same place as the screen, so voices are not streamed.
- Offline party: the same server program can run on a laptop on the local Wi-Fi.
  Phones and the TV page connect to the laptop, and no internet is used.
- Singing with people in other places (voice over WebRTC) is deferred.

### 4.4 Big-screen display

A web page served by the server. Idle: room code and QR. During a song: lyrics,
cover, current singer, queue, and it plays the audio. Works in any browser, so
smart TVs, laptops on HDMI and tablets all work without a TV app.

## 5. Lightweight stack

Goal: fewest languages, fewest services, nothing that needs an account to keep alive.

| Part | Choice | Why it is light |
|---|---|---|
| Phone app | Keep React Native + Expo (JavaScript) | Already built; no rewrite |
| Server | One Python service (FastAPI) | Python is required for separation anyway, so it also does catalog, lyrics, downloads and rooms |
| Realtime rooms | WebSockets inside the same service | No separate realtime product |
| Database | SQLite (one file) | No database server to install or secure |
| File storage | A folder on the server | No cloud storage account |
| TV display | Plain HTML + JavaScript, no framework | Nothing to build or update |
| Phone storage | Existing AsyncStorage index + file system for audio | One new module |

Two languages in total: JavaScript and Python. One server process. One database file.

This replaces the v1 suggestion of Supabase. With offline and LAN party mode as
goals, a single self-contained service is simpler than an external platform,
and it can run on a laptop with no internet.

Not recommended:

- Rewriting the app in Flutter or native Kotlin: months of work for no feature gain.
- Keeping PHP on Freehostia: it cannot run the model or WebSockets.
- A JavaScript server alongside Python: a third runtime for no benefit.

Hosting: the server needs any host that runs a Python or Docker app with about
2 GB of RAM. Development and demos can run on your PC.

New app modules needed (each means one APK rebuild): `expo-file-system`
(downloads), `expo-document-picker` (add your own file), `expo-camera` (scan the
room QR).

## 6. Screens after the change

| Tab | Content |
|---|---|
| Home | Start a room, Join a room, recently sung |
| Catalog | Search online songs (hidden when offline) |
| Library | Downloaded songs, add your own file, delete |
| Profile | Name, storage used, settings |

Plus: Karaoke player, Room lobby/queue, and the TV web page.

## 7. What gets removed

Nothing is deleted until you confirm this plan.

| Remove | Reason |
|---|---|
| `api/` (all PHP: `spotify.php`, `artists.php`, `api.php`, `build_snapshot.php`, `nettest.php`, JSON snapshots, `.htaccess`) | Replaced by the Python service |
| `database/himig.sql` | MySQL replaced by SQLite |
| Spotify credentials and the Pinay artist allowlist | Spotify supplies no audio |
| `ArtistScreen`, `ArtistFormScreen`, `DetailScreen`, `TrendingScreen` | Artist-spotlight screens no longer used |
| Artist CRUD in `AppContext` and `storage.js` | Replaced by the song library |
| `src/assets/demo.wav` | Placeholder audio |
| Freehostia / DuckDNS deployment | Cannot host the new server |

Kept: theme, gradient background, bottom navigation, onboarding, sign-in screens,
`PlayerContext` and the player UI (extended with lyrics and the vocal toggle).

## 8. Phases

| Phase | Deliverable |
|---|---|
| 0. Test | Run `demucs-onnx` on 3 songs on your PC; measure time and listen to quality |
| 1. Solo karaoke | Server prepares a song; app plays it with synced lyrics and vocal toggle |
| 2. Offline library | Download packs, play with airplane mode on, delete, storage view |
| 3. Rooms | Create/join, shared queue, playback control |
| 4. TV display | Web page with QR join, lyrics, audio; LAN party mode on a laptop |
| 5. Cleanup | Remove section 7 items, update README |
| Later | Remote singing, pitch scoring, better separation model |

## 9. Risks

- Separation leaves faint vocals or artifacts on some songs.
- Speed, measured in Phase 0 on this PC (i5-12500H, CPU only): about 4 minutes
  per 3-minute song (245-250 s), roughly 11x slower than the vendor figure.
  Thread tuning gains about 15%. DirectML on the RTX 3050 Ti (4 GB) and the Iris Xe
  both fail with out-of-memory. So preparation is a background job with a progress
  state, done once per song and cached. CUDA is untested.
- LRCLIB will miss some songs, especially lesser-known OPM.
- Song packs are large: roughly 8-10 MB per song for both audio files.
- Copyright: user-supplied commercial songs are acceptable for a school demo,
  not for public distribution.

## 10. Decisions needed

1. Song sources: user's own files + Jamendo (no ND tracks)?
2. Separation: `demucs-onnx` on our own server, not a paid API?
3. Stack: one Python service with SQLite, replacing PHP, MySQL and Supabase?
4. Same-place party mode first; remote singing later?
5. TV as a web page, not a native TV app?
6. Approve the removal list in section 7?
7. Any deadline or rubric (for example CRUD + third-party API)? Library and queue
   give CRUD; Jamendo and LRCLIB are the third-party APIs.

## Sources

- https://stemsplit.github.io/demucs-onnx/
- https://pypi.org/project/demucs-onnx/
- https://dev.to/codesugar_lin_037a57b06a4/htdemucs-vs-bs-roformer-vs-spleeter-a-2026-audio-source-separation-benchmark-2ll8
- https://dev.to/stevecase430/spleeter-is-dead-heres-why-everyones-switching-to-demucs-in-2026-j6e
- https://mvsep.com/news
- https://arxiv.org/pdf/2310.01809
- https://freeapihub.com/apis/jamendo-api
- https://support-licensing.jamendo.com/individual-licenses
- https://toolradar.com/compare/jamendo-vs-free-music-archive
- https://lrclib.net/docs
- https://www.npmjs.com/package/lrclib-api
