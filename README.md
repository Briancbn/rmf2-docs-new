# RMF Industrial Developer Documentation

Documentation site for the **RMF Industrial**.

<https://dev.rmf-industrial.org/latest>

Built with [VitePress](https://vitepress.dev).

## Source Installation

Install `pnpm` (10 and later) and `NodeJS` (22 and later)

```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
source ~/.bashrc
pnpm env use --global 24
```

Install Git LFS (Large File Storage)

```bash
sudo apt install git-lfs
```

Clone the repo and pull the lfs

```bash
git clone https://github.com/ros-industrial/rmf2-docs.git
git lfs pull
cd rmf2-docs
```

Install dependencies

```bash
pnpm install
```

### Module API Documentation Generation

Install `UV`.

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Install Rust toolschains.

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Install Doxgen

```bash
sudo apt install doxygen graphviz
```

Generate Module API documentation

```bash
pnpm docs:generate-api
```

### Quick Start

Start the live dev server (hot reload) → <http://localhost:5173>

```bash
pnpm docs:dev
```

Open the printed URL in a browser; edits to any `.md` file reload instantly.

### Build & preview the static site

```bash
pnpm docs:build      # outputs static HTML to docs/.vitepress/dist/
pnpm docs:preview    # serve the built site locally to check it
```

`docs:build` fails on broken internal links, so a green build means every cross-page
link resolves.

## Project layout

```
docs/
├── index.md                   # home page (hero + module overview)
├── public/                    # guides
│   ├── <image-name>.png       # assets
│   └── ...
├── guide/                     # guides
│   ├── <page-name>.md         # individual guide pages
│   └── ...
├── references/                # API references
└── .vitepress/config.ts       # nav, sidebar, search
```

## Editing tips

- **Add a page:** create a `.md` file, then add it to the `sidebar` (and `nav` if
  top-level) in `docs/.vitepress/config.ts`.
- **Internal links** use root-absolute paths without the `.md` extension, e.g.
  `[MAPF](/guide/mapf)`.
- **Callouts:** `::: tip` / `::: warning` / `::: danger` blocks are supported.
