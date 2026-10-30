FoxLaunch transforms your Firefox New Tab page into a container-aware workspace launchpad designed specifically for Firefox Multi-Account Containers. 

Organize your shortcuts into color-coded container swimlanes and launch tabs directly into isolated container contexts with a single click. Built with sub-10ms cold render performance, zero external dependencies, and absolute privacy.

## ✨ Key Features

- **Container-Aware Swimlanes**: Automatically detects your Firefox Multi-Account Containers and organizes shortcuts into collapsible, container-themed swimlanes.
- **1-Click Container Dispatch**: Open links directly in their designated container context (Personal, Work, Banking, Shopping) without manual switching.
  - Left-Click: Opens in the foreground.
  - Middle-Click or Ctrl/Cmd + Click: Opens in the background while keeping your launchpad ready.
- **Instant Search & Filter**: Press `/` from anywhere on the New Tab page to instantly filter shortcuts across all container swimlanes.
- **Shortcut Management**: Add, edit, reorder via drag-and-drop, and delete shortcuts with a 5-second undo toast notification.
- **Offline Procedural Avatars**: Dynamic letter avatars are generated locally on-the-fly as SVG data URIs with WCAG AA luminance contrast.
- **Customizable Experience**: Choose between light, dark, or system default themes, and configure whether the launcher tab auto-closes after opening a shortcut.
- **Guided Onboarding**: A 4-step interactive walkthrough helps you get the most out of your container setup on first run.

## 🔒 Privacy & Architecture First

FoxLaunch is built with strict privacy and security principles:
- **Zero External Network Requests**: Never connects to third-party CDNs, external APIs, or analytics servers.
- **Zero Telemetry & Zero Tracking**: Your browsing habits, container names, and shortcut URLs never leave your computer.
- **Strict Manifest V3 Content Security Policy**: Zero runtime code evaluation, zero innerHTML usage, and scripts restricted to internal extension bundles.

## ⌨️ Keyboard Shortcuts

- `/` : Focus shortcut search bar instantly.
- `Escape` : Clear search query or close active modal / drawer.
- `Ctrl + Left-Click` / `Cmd + Left-Click` : Launch shortcut in background container tab.

## 📋 Permissions Explained

FoxLaunch only requests the minimum permissions required to function:
- `contextualIdentities`: Required to read your Firefox Multi-Account Containers (names, colors, icons) and create container swimlanes.
- `cookies`: Required by Firefox WebExtensions API in conjunction with contextualIdentities to associate tabs with specific container cookie stores.
- `storage`: Required to save your customized shortcuts, layouts, and display preferences locally in your browser.
- `tabs`: Required to dispatch new tabs into target container contexts and handle background/foreground tab behavior.

---

Open source under the MIT License. Contributions and bug reports are welcome on GitHub:
https://github.com/melkorCBA/fox-launch
