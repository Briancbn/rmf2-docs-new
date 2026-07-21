import { registerCustomTemplateHandlers } from './custom-template-handlers'

// Register the custom Handlebars helpers and partial before any rendering.
registerCustomTemplateHandlers()

export { doxygenGenerator } from './doxygen-generator'
