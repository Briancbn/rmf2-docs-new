import { doxygenGenerator } from './doxygen'
import { lazydocsGenerator } from './lazydocs'
import type { ApiDocsGenerator, DocsConfig } from '../types'

export const GENERATORS = new Map<string, ApiDocsGenerator>()

// Register a generator for its docs `type`.
export function registerGenerator(generator: ApiDocsGenerator): void {
  GENERATORS.set(generator.type, generator)
}

// Built-in generators.
registerGenerator(doxygenGenerator)
registerGenerator(lazydocsGenerator)
