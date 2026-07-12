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

---

## 🛠️ Tech Stack
*   **Frontend**: React, TypeScript, Tailwind CSS, Lucide icons
*   **Desktop Wrapper**: Tauri (Rust backend wrapping native system WebViews)
*   **Local DB & Graph Engine**: Supermemory Local (vector and knowledge search)
*   **Local LLM Integration**: Ollama (Llama 3/3.1 default, fully local)

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have the following installed on your host system:
*   [Node.js](https://nodejs.org/) (v18+)
*   [Rust & Cargo](https://www.rust-lang.org/tools/install) (for Tauri compilation)
*   [Ollama](https://ollama.com/) (running locally on port `11434`)
*   [Supermemory Server](https://github.com/supermemoryai/supermemory) (running locally on port `6767`)

### 2. Sandbox Setup (Outbound Telemetry Block)
To ensure complete offline isolation and prevent analytics leaks, add the following to your system host files:
```hosts
127.0.0.1 us.i.posthog.com
```

### 3. Installation & Run
Clone the repository, install node modules, and run the Tauri developer environment:
```bash
# Clone the repository
git clone <your-repo-link>
cd vaultmind

# Install dependencies
npm install

# Run the Tauri application in developer mode
npm run tauri dev
```

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
