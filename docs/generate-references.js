import { generate } from 'moxygen'

const pages = await generate({
  directory: '../../../ros-workspace/rmf2_ws/src/vda5050_core/docs/api/xml',
  language: 'cpp',
})

for (const page of pages) {
  console.log(page.slug, page.title, page.kind)
  console.log(page.markdown) // rendered markdown body
}
