// The custom Handlebars helpers and the shared member-detail partial used by the
// doxygen (C++) templates. Call `registerCustomTemplateHandlers()` to wire them
// onto the Handlebars singleton moxygen renders with.
//
// The helpers are thin: each delegates to a pure function in ./formatters or
// ./member-categories. Only the badge helpers live here, since they call
// moxygen's own runtime `badges` helper.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import Handlebars from 'handlebars'
import type { Member } from 'moxygen'
import {
  includePath,
  fixDescriptionLinks,
  linkName,
  formatSignature,
  tableArgs,
  orderSections,
} from './formatters'
import {
  typedefMembers,
  enumMembers,
  constructorMembers,
  functionMembers,
  dataMembers,
} from './member-categories'

// Render moxygen's built-in `badges` (bound to the current member) with some
// qualifiers removed. `inline` is always dropped (noise); callers can hide
// more — e.g. `const` where the rendered signature already shows it.
function filterBadges(member: unknown, hidden: Set<string>): string {
  return String(Handlebars.helpers.badges.call(member))
    .split(' ')
    .filter((badge) => badge && !hidden.has(badge))
    .join(' ')
}

// `suffix` namespaces the helper/partial names away from moxygen's built-ins.
// The bundled templates reference the default ("Rmf2Docs"); pass a different
// value only with matching custom templates.
export function registerCustomTemplateHandlers(
  suffix: string = 'Rmf2Docs'
): void {
  Handlebars.registerHelper(`incPath${suffix}`, (location, fallback) =>
    includePath(location, fallback)
  )

  // SafeString keeps the markdown from being HTML-escaped on the way out.
  Handlebars.registerHelper(
    `fixLinks${suffix}`,
    (text) => new Handlebars.SafeString(fixDescriptionLinks(String(text ?? '')))
  )

  Handlebars.registerHelper(`inheritedName${suffix}`, (name, refid) =>
    linkName(name, refid)
  )

  // Name-only places (no signature): keep `const` etc., drop `inline`.
  Handlebars.registerHelper(`badgesNoInline${suffix}`, function (this: Member) {
    return filterBadges(this, new Set(['`inline`']))
  })

  // Places that already render the full signature: also drop `const` to avoid
  // showing it twice.
  Handlebars.registerHelper(
    `signatureBadges${suffix}`,
    function (this: Member) {
      return filterBadges(this, new Set(['`inline`', '`const`']))
    }
  )

  Handlebars.registerHelper(
    `signatureNoInline${suffix}`,
    function (this: Member) {
      return formatSignature(this, () =>
        String(Handlebars.helpers.signature.call(this))
      )
    }
  )

  Handlebars.registerHelper(`tableArgs${suffix}`, (argsstring) =>
    tableArgs(argsstring)
  )

  Handlebars.registerHelper(`orderedSections${suffix}`, (sections) =>
    orderSections(sections)
  )

  Handlebars.registerHelper(`typedefMembers${suffix}`, (m) => typedefMembers(m))
  Handlebars.registerHelper(`enumMembers${suffix}`, (m) => enumMembers(m))
  Handlebars.registerHelper(`constructorMembers${suffix}`, (m, className) =>
    constructorMembers(m, className)
  )
  Handlebars.registerHelper(`functionMembers${suffix}`, (m, className) =>
    functionMembers(m, className)
  )
  Handlebars.registerHelper(`dataMembers${suffix}`, (m) => dataMembers(m))

  // The per-member detail block, shared by every documentation category.
  // Registered as a partial so the categories can each render it via
  // {{> memberDetailRmf2Docs}}. Precompiled (noEscape, non-strict) so missing fields
  // don't throw.
  Handlebars.registerPartial(
    `memberDetail${suffix}`,
    Handlebars.compile(
      readFileSync(
        join(
          import.meta.dirname,
          'moxygen-templates',
          'cpp',
          'partials',
          'member-detail.md'
        ),
        'utf8'
      ),
      { noEscape: true }
    )
  )
}
