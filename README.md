# Himig

Himig is an offline-first OPM (Original Pilipino Music) mobile app that spotlights
Filipina singers. It streams live artist profiles and song previews from Spotify
while keeping a personal, editable music library on the device, so it stays useful
even with no connection. Built for OPM fans on Android.

## Features
- Live artist profiles: popular Pinay singers with real photos, fetched from the Spotify Web API through a lightweight backend.
- Music player: streams real 30-second song previews with a waveform, play queue, and a persistent mini-player.
- Trending: the most popular Pinay tracks right now, loaded automatically when online and cached for offline use.
- Offline-first library with full CRUD: add, edit, delete, and favorite your own artists, saved on the device.
- Local accounts: onboarding plus sign-up / sign-in, stored on the device (no server login required).
- Persistent bottom navigation with an animated notch across every screen.

## Tech Stack
- **Mobile app:** React Native (Expo SDK 51), React Navigation, react-native-svg, expo-av, AsyncStorage
- **Backend API:** PHP proxy to the Spotify Web API and iTunes (for previews), keeping the Spotify secret server-side
- **Database:** MySQL (personal library storage; schema in `database/himig.sql`)

## Installation

Prerequisites: Node.js and npm, Android Studio with an SDK and emulator (or a physical
device), PHP 7.4+ with the cURL extension, and MySQL. You will also need a free Spotify
developer app for the Client ID and Secret.

```bash
# Clone the repository
git clone https://github.com/<your-username>/himig.git

# Navigate into the directory
cd himig

# Install app dependencies
npm install

# Create the app environment file and set the API host
cp .env.example .env
# edit .env -> EXPO_PUBLIC_API_URL=http://<your-api-host>

# Create the backend environment file and set your Spotify credentials
cp api/.env.example api/.env
# edit api/.env -> SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET

# Create the database and import the schema
mysql -u root -e "CREATE DATABASE IF NOT EXISTS himig;"
mysql -u root himig < database/himig.sql
```

Serve the `api/` folder with any PHP host (for local testing you can run
`php -S localhost:8000 -t api`), then point `EXPO_PUBLIC_API_URL` at that address.
The database connection is configured in `api/api.php` (defaults to `localhost` /
`himig` / `root`); adjust it for your host.

## Usage

```bash
# Start the Metro bundler
npm start

# Build and run on a connected Android device or emulator
npm run android
```

Once the app is running, open it on the device: complete the short onboarding, create
a local account, and the Home screen loads live Pinay artists from the API. Tap an
artist to play previews, browse Trending, or open the library tab to manage your own
artists.

## Contributing
Contributions, issues, and feature requests are welcome. Feel free to open an issue or
submit a pull request.

## License
This project is licensed under the MIT License - see the LICENSE file for details.
