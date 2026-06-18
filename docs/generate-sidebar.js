import fs from 'fs/promises'
import path from 'path'

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

// Usage
generateSidebarInfo('./references/vda5050_core').then((result) => {
  console.log(result)
})
