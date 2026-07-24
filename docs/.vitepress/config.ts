import path from 'path'
import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import {
  groupIconMdPlugin,
  groupIconVitePlugin,
} from 'vitepress-plugin-group-icons'
import { generateSidebar, homePageTitle } from '@rmf2-docs/api-docs'

// https://vitepress.dev/reference/site-config
export default withMermaid(
  defineConfig({
    title: 'RMF-Industrial',
    description: 'RMF2 Documentation',
    // localhost URLs in module docs are runtime endpoints, not site links
    ignoreDeadLinks: [/^https?:\/\/localhost/],
    themeConfig: {
      // https://vitepress.dev/reference/default-theme-config
      siteTitle: 'RMF Industrial',
      nav: [
        { text: 'Guide', link: '/guide/what-is-rmf2' },
        { text: 'Modules', link: '/modules/' },
        { text: 'References', link: '/references/overview' },
        {
          text: process.env.VITE_DOCS_VERSION ?? 'latest',
          items: [
            {
              text: 'latest',
              link: 'http://dev.rmf-industrial.org',
            },
          ],
        },
      ],

      sidebar: {
        // Sidebar config for `guide` directory
        '/guide/': [
          {
            text: 'Introduction',
            items: [
              { text: 'What is RMF-Industrial?', link: '/guide/what-is-rmf2' },
              { text: 'Architecture', link: '/guide/architecture' },
              { text: 'Getting Started', link: '/guide/getting-started' },
              { text: 'Demos', link: '/guide/demos' },
            ],
          },
          {
            text: 'How-tos',
            items: [
              { text: 'Launch scripts', link: '/guide/launch-scripts' },
              { text: 'Create a workflow', link: '/guide/create-workflow' },
            ],
          },
          {
            text: 'Tutorials',
            items: [
              {
                text: 'Simulation (UE5)',
                link: '/guide/tutorials/simulation',
              },
              {
                text: 'VDA5050 — Master & Client',
                link: '/guide/tutorials/vda5050',
              },
              { text: 'MAPF (unified)', link: '/guide/tutorials/mapf' },
              {
                text: 'Task & Task Orchestrator',
                link: '/guide/tutorials/task-orchestrator',
              },
              { text: 'Scheduler', link: '/guide/tutorials/scheduler' },
              { text: 'UI', link: '/guide/tutorials/ui' },
            ],
          },
          { text: 'Module Documentation', link: '/modules/' },
          { text: 'Config & API References', link: '/references/overview' },
        ],

        // Sidebar config for `modules` directory
        '/modules/': [
          { text: 'Overview', link: '/modules/' },
          {
            text: 'Simulation',
            items: [{ text: 'Simulation (UE5)', link: '/modules/simulation' }],
          },
          {
            text: 'Fleet Interface',
            items: [
              { text: 'VDA5050 — Master & Client', link: '/modules/vda5050' },
            ],
          },
          {
            text: 'Planning & Execution',
            items: [{ text: 'MAPF (unified)', link: '/modules/mapf' }],
          },
          {
            text: 'Task Orchestration',
            base: '/modules/task-orchestrator/',
            // Generated from the rmf2_task_orchestrator repo (README -> home
            // page, plus its docs/ folder) by `pnpm docs:generate-api`. The
            // home page's sidebar title comes from its `homePageTitle`.
            items: [
              {
                text: homePageTitle(
                  path.resolve(__dirname, '../modules/task-orchestrator')
                ),
                link: 'index.md',
              },
              ...(await generateSidebar(
                path.resolve(__dirname, '../modules/task-orchestrator'),
                { separator: '/', groupDepth: 1 }
              )),
            ],
          },
          {
            text: 'Scheduling',
            items: [{ text: 'Scheduler', link: '/modules/scheduler' }],
          },
          {
            text: 'Interfaces',
            items: [{ text: 'UI', link: '/modules/ui' }],
          },
          { text: 'Config & API References', link: '/references/overview' },
        ],
        '/references': {
          base: '/references/',
          items: [
            { text: 'Overview', link: 'overview' },
            {
              text: 'VDA5050 Core',
              items: [
                {
                  text: 'C++',
                  collapsed: true,
                  base: '/references/vda5050_core/cpp/',
                  // `.md` so VitePress normalizes the link to `.../cpp/` and
                  // marks the item active on the index page (a bare `index`
                  // stays `.../cpp/index` and never matches).
                  link: 'index.md',
                  items: await generateSidebar(
                    path.resolve(__dirname, '../references/vda5050_core/cpp')
                  ),
                },
              ],
            },
            {
              text: 'RES MAPF',
              items: [
                {
                  text: 'Python',
                  collapsed: true,
                  base: '/references/res_mapf/python/',
                  link: 'index.md',
                  items: await generateSidebar(
                    path.resolve(__dirname, '../references/res_mapf/python'),
                    // Full module-tree nesting (Python names have no separator
                    // inside a segment, unlike C++ template args), bounded by
                    // the levels left after the "RES MAPF" > "Python" wrappers
                    // — the theme silently drops anything deeper.
                    {
                      separator: '.',
                      fromFilename: true,
                      groupDepth: Infinity,
                      maxDepth: 4,
                    }
                  ),
                },
              ],
            },
            {
              text: 'Task Orchestrator',
              items: [
                {
                  text: 'Rust',
                  collapsed: true,
                  base: '/references/rmf2_task_orchestrator/rust/',
                  link: 'index.md',
                  items: await generateSidebar(
                    path.resolve(
                      __dirname,
                      '../references/rmf2_task_orchestrator/rust'
                    ),
                    // Rust paths use `::` like C++, so the default grouping
                    // applies; bounded by the levels left after the
                    // "Task Orchestrator" > "Rust" wrappers.
                    { maxDepth: 4 }
                  ),
                },
              ],
            },
            {
              text: 'Scheduler',
              items: [
                {
                  text: 'C++',
                  collapsed: true,
                  base: '/references/rmf2_scheduler/cpp/',
                  link: 'index.md',
                  items: await generateSidebar(
                    path.resolve(__dirname, '../references/rmf2_scheduler/cpp')
                  ),
                },
              ],
            },
          ],
        },
      },

      footer: {
        message: 'Released under the Apache-2.0 License.',
        copyright: 'Copyright (C) 2026 ROS-Industrial Consortium Asia Pacific',
      },

      socialLinks: [
        {
          icon: 'github',
          link: 'https://github.com/ros-industrial/rmf_industrial',
        },
      ],
    },
    mermaid: {},
    markdown: {
      config(md) {
        md.use(groupIconMdPlugin)
      },
    },
    vite: {
      plugins: [groupIconVitePlugin()],
    },
  })
)
