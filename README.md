# SysDesign Simulator

Interactive system design simulator built with React + Vite.  
Create architecture graphs, simulate request traffic, and inspect bottlenecks, latency, throughput, and error rates.

## Features

- Drag-and-drop architecture canvas with connectable components
- Built-in templates:
  - Basic Web App
  - Scalable System
  - WhatsApp-like
- Add/remove nodes and create custom connections
- Simulate failures per node
- Configure traffic (`users`, `requests/second`)
- Live metrics:
  - Health score
  - End-to-end latency
  - Effective throughput
  - Error rate
- Optimization suggestions based on bottlenecks

## Tech Stack

- React 19
- Vite 8
- ESLint 9

## Getting Started

### Prerequisites

- Node.js 18+ (recommended)
- npm

### Install

```bash
npm install
```

### Run in development

```bash
npm run dev
```

Open the local URL shown in terminal (usually `http://localhost:5173`).

### Build for production

```bash
npm run build
```

### Preview production build

```bash
npm run preview
```

### Lint

```bash
npm run lint
```

## Project Structure

```text
.
├── public/
├── src/
│   ├── App.jsx        # Main simulator UI and simulation logic
│   ├── main.jsx       # React entry point
│   └── index.css      # Global styles
├── index.html
├── package.json
└── vite.config.js
```

## How to Use

1. Pick a template from the sidebar.
2. Add components from the component tab.
3. Connect nodes using the `⊕` port on each node.
4. Set traffic parameters.
5. Click `Simulate`.
6. Review KPIs, node status, and optimization suggestions.

## Notes

- Node status legend:
  - `healthy`: load < 70%
  - `stressed`: load 70-100%
  - `bottleneck`: load > 100%
  - `failed`: manually failed node
- This is a frontend simulation model for learning/exploration, not production capacity planning.
