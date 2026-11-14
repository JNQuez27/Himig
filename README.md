# Himig

Himig is a karaoke app for Android. Pick any song on your phone and Himig removes the
vocals, finds or writes the lyrics, and shows them in time with the music. Downloaded
songs work with no internet. Friends can join a room with a code, share one queue, and
put the lyrics on a TV. Built for people who want karaoke at home without a karaoke machine.

## Features
- Auto-generated karaoke: the server separates vocals from the music (HTDemucs), so every song has a Karaoke track and a With vocals track you can switch between mid-song.
- Synced lyrics: fetched from LRCLIB when available, otherwise transcribed from the vocals with Whisper and marked as auto-generated.
- Offline library: prepared songs download to the phone and play fully offline, with size shown and delete.
- Add your own song: choose an audio file on the phone; it is prepared and lands in your Library by itself.
- Rooms: start or join with a 4-letter code, shared queue, play, pause and skip for everyone. No account needed.
- Big screen: open `/tv` on a smart TV or laptop to show lyrics, the queue, and a QR code. Guests without the app scan it to add songs from their browser.
- Optional account: use the app as a guest, or create a local account stored on the device.
- Party mode with no internet: run the server on a laptop and point phones at it from Profile.

## Tech Stack
- **Mobile app:** React Native (Expo SDK 51), React Navigation, react-native-svg, expo-av, expo-file-system, expo-document-picker, AsyncStorage
- **Server:** Python, FastAPI, WebSockets, ONNX Runtime (`demucs-onnx` for separation, Whisper for lyrics)
- **Database:** SQLite (one file, created automatically in `server/data/`)
- **Big screen and web remote:** plain HTML and JavaScript served by the same server

## Installation

Prerequisites: Node.js and npm, Android Studio with an SDK and emulator (or a physical
device), and Python 3.11 or newer. No accounts or API keys are required.

```bash
# Clone the repository
git clone https://github.com/JNQuez27/Himig.git

# Navigate into the directory
cd Himig

# Install app dependencies
npm install

# Create the app environment file and set the server address
cp .env.example .env
# edit .env -> EXPO_PUBLIC_KARAOKE_URL=http://<server-address>:8000

# Set up the server
cd server
python -m venv .venv
.venv/Scripts/python -m pip install -r requirements.txt   # macOS/Linux: .venv/bin/python
```

The first song you prepare downloads the separation and lyrics models (about 600 MB),
so that run needs internet. After that the server works offline.

## Usage

```bash
# Start the server (from the server/ folder). It prints the addresses to use.
.venv/Scripts/python -m uvicorn app:app --host 0.0.0.0 --port 8000

# Start the Metro bundler (from the project root)
npm start

# Build and run on a connected Android device or emulator
npm run android
```

On an emulator, forward the server port once per boot: `adb reverse tcp:8000 tcp:8000`.
On a real phone, use the server's network address (shown when it starts) in `.env`, or
type it in Profile under Karaoke server.

In the app: skip or create an account, then tap **Add a song** and choose an audio file.
Preparing a song takes about four minutes on a laptop CPU; it then appears in your
Library and plays offline. Tap **Sing together** to start a room and share the code.
For a big screen, open `http://<server-address>:8000/tv` in any browser. Songs can also
be added from a computer at `http://<server-address>:8000/`.

Checks: `python server/rooms.py`, `python server/transcribe.py` and
`node src/data/lrc.check.mjs` each run a small self-test.

Only add songs you have the right to use. Removing vocals creates a modified copy of a
recording, which some licenses do not allow.

## Contributing
Contributions, issues, and feature requests are welcome. Feel free to open an issue or
submit a pull request.

## License
This project is licensed under the MIT License - see the LICENSE file for details.
