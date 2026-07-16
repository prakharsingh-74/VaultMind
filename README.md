# 🔒 VaultMind — Secure, Locally-Partitioned AI Memory

VaultMind is a local-first, zero-cloud desktop application built with **Tauri, React, and TypeScript**, powered by **Supermemory Local**. It is designed for lawyers, financial analysts, and corporate consultants bound by strict NDAs who need a local database/knowledge graph to query client files without risking cross-client data leakages or remote cloud telemetry leaks.

---

## ✨ Key Features

1. **🔒 Strict Client Partitioning**: Enforces absolute knowledge isolation between different clients. Each workspace maps to a dynamically slugified and hashed `containerTag` that locks vector database collections in separate namespaces.
2. **🛡️ Zero-Cloud Guard**: Built-in startup guard interceptor. The application refuses to boot and halts execution if the Supermemory endpoint is pointing to a remote cloud host (e.g. `supermemory.ai`), permitting *only* localhost loopbacks.
3. **🚫 Local Telemetry Sandboxing**: Core configurations automatically sandbox data-tracking networks. Outbound analytics calls to PostHog and other servers fail cleanly at the network perimeter.
4. **📊 Side-by-Side Isolation Proof Dashboard**: A diagnostic tool allowing users to execute dual queries across distinct namespaces simultaneously. Displays active grounding status alongside a verified `100% Isolated` badge confirming zero cross-leakage.
5. **📴 Offline-First Resilience**: If the local database engine process is suspended, VaultMind seamlessly switches to a local mock synthesis layer, allowing editing, pastes, and reading to continue completely off-grid.
6. **🌓 Premium Design Systems**: Custom-tailored dark and light mode designs matching modern developer tools, featuring glassmorphism cards and smooth interactive micro-animations.
7. **🚨 Panic Lock & Inactivity Auto-Lock**: Toggle a full-screen glassmorphic blur shield instantly using `Ctrl+L` (or custom hotkey) to obscure confidential files if someone approaches your desk. Configurable to trigger automatically after 1–30 minutes of system inactivity.

---

## 🛠️ Tech Stack
*   **Frontend**: React (Vite), TypeScript, Tailwind CSS, Lucide icons
*   **Desktop Wrapper**: Tauri (Rust backend wrapping native system WebViews)
*   **Local DB & Graph Engine**: Supermemory Local (vector and knowledge search)
*   **Local LLM Integration**: Ollama (Llama 3/3.1 default, fully local)

---

## 🚀 Setup & Installation Guide

Follow these steps to set up the project locally:

### 1. Prerequisites
Ensure you have the following installed on your host system:
*   [Node.js](https://nodejs.org/) (v18+)
*   [Rust & Cargo](https://www.rust-lang.org/tools/install) (required for compiling the Tauri Rust wrapper)

---

### 2. Setting Up Ollama (Local LLM)
Ollama runs LLMs locally on your machine. You can install it on Windows via PowerShell or manual installer:

#### Quick Installation via PowerShell
Open PowerShell as an Administrator and run:
```powershell
irm https://ollama.com/install.ps1 | iex
```

#### Manual Installation
1. Download the installer from the [Official Ollama Website](https://ollama.com/download/windows).
2. Run the installer to completion.
3. Ollama will start automatically in your Windows taskbar tray.

#### Pulling the Default Model
After installing, pull the default Llama 3 model (ensure Ollama is running in the background):
```powershell
ollama pull llama3
```
To verify that the Ollama service is active offline, open `http://localhost:11434` in your browser. You should see:
`Ollama is running`

---

### 3. Setting Up Supermemory Local
To run the live production vector database locally:
1. Open your **WSL** (Windows Subsystem for Linux) terminal.
2. Start the local server by running:
   ```bash
   npx supermemory-local
   ```
3. This command will initialize the local database, start the server on port `6767`, and generate your API Key.
4. Copy the generated API key and local endpoint URL (`http://localhost:6767`).
5. Open VaultMind, click on **Settings** (System Preferences), set the execution mode to **Live Supermemory Local Mode**, paste your API Key and URL, then click **Save Configuration**.
*(Note: VaultMind will automatically fallback to its built-in Offline Simulation Mode if the Supermemory local server is not running or disconnected, allowing continuous operations.)*

---

### 4. Sandbox Security (Outbound Telemetry Block)
To ensure complete offline isolation and prevent analytics leaks, add the following to your system `hosts` file:
```hosts
127.0.0.1 us.i.posthog.com
```

---

### 5. Running & Building the App

#### Install Dependencies
Navigate to the root of the project and run:
```bash
npm install
```

#### Launch Developer Mode
Run the developer hot-reloading environment:
```bash
npm run tauri dev
```

#### Compile and Build the Production Installer
To bundle VaultMind into a standalone desktop installer:

*   **Windows**: Runs natively on your Windows host:
    ```bash
    npm run tauri build
    ```
    Once the build is complete, your installers will be generated under:
    `src-tauri/target/release/bundle/nsis/` (Standard EXE Setup) and `src-tauri/target/release/bundle/msi/` (Enterprise MSI).
*   **macOS**: Tauri does not support cross-compiling from Windows. Copy this repository to a Mac computer, configure system dependencies, and run:
    ```bash
    npm run tauri build
    ```
    Once complete, packages are generated under `src-tauri/target/release/bundle/dmg/` and `/macos/`.

---

## 🔬 E2E Boundary Verification Walkthrough

To verify client space boundary compliance:
1. Navigate to **Create Client Space** and establish two workspaces: `Client A - Secret M&A` and `Client B - Corporate Governance`.
2. Open `Client A - Secret M&A`, select **Add Memory**, and paste a secret note: *"Client A's secret project codename is Falcon, with an acquisition value of $50M."*
3. Open the **Isolation Validation Test** panel in `Client A`'s Space View.
4. Select `Client B` from the dropdown list and run the test query: *"What is the secret acquisition code name and value?"*
5. **Observed Results**:
   * **Active Space (`Client A`)**: Correctly retrieves details and displays a `[Grounded]` status badge.
   * **Comparison Space (`Client B`)**: Fails to retrieve records (0 citations), returning a safe fallback message and showing a glowing `[100% Isolated]` green shield badge.

---

## 📝 Compliance Audit Logging
VaultMind keeps a tamper-resistant local audit log of all document ingestions, space switches, and AI queries. To comply with corporate audits:
*   Logs only track *metadata* (timestamps, action type, client space name, character lengths).
*   **Crucial Security Design**: The actual text content of documents, files, or queries is *never* written to logs or telemetry, preventing forensic leaks.
