import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'
import {
  groupIconMdPlugin,
  groupIconVitePlugin,
} from 'vitepress-plugin-group-icons'

// https://vitepress.dev/reference/site-config
export default withMermaid(
  defineConfig({
    title: 'RMF-Industrial',
    description: 'RMF2 Documentation',
    // localhost URLs in module docs are runtime endpoints, not site links
    ignoreDeadLinks: [/^https?:\/\/localhost/],
    head: [['link', { rel: 'icon', href: '/icons/logo-dark.svg' }]],
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
        '/references': [
          { text: 'Overview', link: '/references/overview' },
          { text: 'VDA5050 Core', link: '/references/vda5050_core' },
        ],
      },

      footer: {
        message:
          'For collaboration opportunities, please reach out to <a href="mailto:ros-i_asia@a-star.edu.sg">ros-i_asia@a-star.edu.sg</a>',
        copyright:
          'Released under the <a href="https://www.apache.org/licenses/LICENSE-2.0.html">Apache-2.0 License</a>  |  © 2026 <a href="https://rosindustrial.org/ric-apac">ROS-Industrial Consortium Asia Pacific</a>',
      },

      socialLinks: [
        {
          icon: {
            svg: '<svg width="1em" height="1em" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true" ><path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" /><path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" /></svg>',
          },
          link: 'mailto:ros-i_asia@a-star.edu.sg',
          ariaLabel: 'email',
        },
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
