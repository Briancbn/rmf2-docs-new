import type { GenerateContext } from './generate-context'

// A pluggable generator for one documentation `type` (doxygen for C++ today;
// sphinx for Python, rustdoc for Rust in future). Each implements this interface
// and registers itself.
export interface ApiDocsGenerator {
  readonly type: string
  generate(context: GenerateContext): Promise<void>
}
