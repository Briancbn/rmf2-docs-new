import path from 'path'
import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import {
  groupIconMdPlugin,
  groupIconVitePlugin,
} from 'vitepress-plugin-group-icons'
import { generateSidebar } from '@rmf2-docs/api-docs'

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
            text: 'Module Documentation',
            items: [
              { text: 'Simulation (UE5)', link: '/guide/simulation' },
              { text: 'VDA5050 — Master & Client', link: '/guide/vda5050' },
              { text: 'MAPF (unified)', link: '/guide/mapf' },
              {
                text: 'Task & Task Orchestrator',
                link: '/guide/task-orchestrator',
              },
              { text: 'Scheduler', link: '/guide/scheduler' },
              { text: 'UI', link: '/guide/ui' },
            ],
          },
          {
            text: 'How-tos',
            items: [
              { text: 'Launch scripts', link: '/guide/launch-scripts' },
              { text: 'Create a workflow', link: '/guide/create-workflow' },
            ],
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
              text: 'RMF2 Scheduler',
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
