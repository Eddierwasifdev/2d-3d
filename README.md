# Roomify | AI-powered Architectural Visualization

Roomify is an AI-powered SaaS that transforms 2D floor plans into photorealistic 3D renders.

## ✨ Features

- **2D-to-3D Visualization**: Instant architectural rendering using AI.
- **Persistent Media Hosting**: Permanent file storage via Puter.
- **Dynamic Project Gallery**: Workspace to track visualization history.
- **Side-by-Side Comparison**: Interactive before/after visualization.
- **Global Community Feed**: Public discovery engine for shared projects.

## ⚙️ Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS
- **Backend/Infrastructure**: Puter (Workers, KV, Storage)
- **AI Models**: Claude, Gemini

## 🤸 Quick Start

### Prerequisites

- Git, Node.js, npm

### Installation

```bash
git clone https://github.com/Eddierwasifdev/2d-3d
cd 2d-3d
npm install
```

### Environment Variables

Create a `.env` file in the root:

```env
VITE_PUTER_WORKER_URL="your_puter_worker_url"
```

Get your worker URL by creating a worker at [Puter.com](https://puter.com).

### Running

```bash
npm run dev
```
