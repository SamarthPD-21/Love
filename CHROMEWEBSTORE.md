# Chrome Web Store Listing — Love Cinema Sync

> Last Updated: 2026-07-13

## Store Listing

**Extension Name**
Love Cinema Sync

**Short Description**
Synchronize streaming tabs and HTML5 video playback in real-time with your partner.

**Detailed Description**
Love Cinema Sync is the ultimate watch-together companion for couples. It works as a lightweight browser extension that connects with your Love private dashboard to keep your playback status and tab navigation perfectly synchronized.

Simply open any video stream (on 1hd.art, YouTube, or other HTML5 video pages), and the extension will automatically keep your play, pause, and seek events synced with your partner. It also includes an optional tab URL tracker so you can automatically follow your partner when they load a new show or movie.

HOW TO USE IT:
1. Load your Love couple's web application dashboard. The extension will automatically sync credentials.
2. Toggle "Sync Tab URL" and "Sync Video Player" depending on your preferences.
3. Open any streaming video link in your browser.
4. Enjoy watching together in perfect unison without having to manually countdown!

**Category**
Social & Communication

**Single Purpose**
Synchronizes browser tabs and video player controls in real-time between relationship partners.

**Primary Language**
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128×128 PNG | ⬜ Not created | |
| Screenshot 1 | 1280×800 | ⬜ Not created | |

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | Stores sync preferences (e.g. video/tab URL sync toggles) and secure session credentials. |
| `tabs` | permissions | Reads the current active tab's URL to sync external movie sites and updates tab URLs on partner changes. |
| `activeTab` | permissions | Temporarily accesses the active tab to execute video element injections when synchronization is active. |
| `scripting` | permissions | Injects `content.js` dynamically to listen to HTML5 video events (play/pause/seek) and execute sync controls. |
| `<all_urls>` | host_permissions | Allows script execution on external movie streaming websites (like 1hd.art) to sync video player elements. |

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No. All communication (ephemeral video player actions and URLs) is passed in-memory through the self-hosted socket server and is not collected, stored, or sold.

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.0 | 2026-07-13 | Initial Release of Love Cinema Sync extension. | Draft |
