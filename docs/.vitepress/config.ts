import fs from 'fs/promises'
import path from 'path'
import { defineConfig } from 'vitepress'
import type { DefaultTheme } from 'vitepress'
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
                  base: '/references/vda5050_core/',
                  items: await sidebarReferenceVDA5050(),
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

function removeFileExtension(filename) {
  return filename.substr(0, filename.lastIndexOf('.'))
}

function generateSidebarTitle(filename) {
  return filename.replaceAll('-', '::')
}

async function crawlDirectory(dirPath, callbackFn) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      // // Recursively crawl subdirectories
      // await crawlDirectory(fullPath, callbackFn);
      continue
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      callbackFn(dirPath, entry.name)
    }
  }
}

async function generateSidebarInfo(dirPath) {
  const sidebarInfo = []
  await crawlDirectory(dirPath, (dirName, filename) => {
    const filenameRaw = removeFileExtension(filename)
    const text = generateSidebarTitle(filenameRaw)
    const link = filenameRaw
    sidebarInfo.push({ text, link })
  })
  return sidebarInfo
}

async function sidebarReferenceVDA5050(): Promise<DefaultTheme.SidebarItem[]> {
  const docsDir = path.resolve(__dirname, '../references')
  const result = await generateSidebarInfo(`${docsDir}/vda5050_core`)
  const groupData = {}
  for (const page of result) {
    const nameList = page['text'].split('::')
    const groupIds = nameList.slice(0, 2)

    let textName = nameList.slice(2).join('::')
    const entry = groupIds.reduce((acc, value, index) => {
      if (acc[value] === undefined) {
        acc[value] = {}
      }
      return acc[value]
    }, groupData)
    if (textName === '') {
      entry['link'] = page['link']
      continue
    }

    if (entry['items'] == undefined) {
      entry['items'] = []
    }
    const item = {
      link: page['link'],
      text: textName,
    }
    entry['items'].push(item)
  }
  const sidebarInfo = {}
  generateGroupSidebarInfo(groupData, sidebarInfo)
  console.log(JSON.stringify(sidebarInfo, null, 2))
  return sidebarInfo['items']
}

function generateGroupSidebarInfo(groupData, sidebarInfo) {
  if ('items' in groupData) {
    sidebarInfo['link'] = groupData['link']
    sidebarInfo['items'] = groupData['items']
    sidebarInfo['collapsed'] = true
    return
  }
  for (const [key, value] of Object.entries(groupData)) {
    if (key === 'link') {
      sidebarInfo['link'] = value
      continue
    }
    if (sidebarInfo['items'] === undefined) {
      sidebarInfo['items'] = []
      sidebarInfo['collapsed'] = true
    }
    const sidebarItem = {
      text: key,
    }
    generateGroupSidebarInfo(value, sidebarItem)
    sidebarInfo['items'].push(sidebarItem)
  }
}
