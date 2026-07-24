import { doxygenGenerator } from './doxygen'
import { griffeGenerator } from './griffe'
import { markdownGenerator } from './markdown'
import { rustdocGenerator } from './rustdoc'
import type { ApiDocsGenerator, DocsConfig } from '../types'

export const GENERATORS = new Map<string, ApiDocsGenerator>()

// Register a generator for its docs `type`.
export function registerGenerator(generator: ApiDocsGenerator): void {
  GENERATORS.set(generator.type, generator)
}

// Built-in generators.
registerGenerator(doxygenGenerator)
registerGenerator(griffeGenerator)
registerGenerator(markdownGenerator)
registerGenerator(rustdocGenerator)
