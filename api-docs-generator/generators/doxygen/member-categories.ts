// Split a compound's members into the documentation categories doxygen uses
// (typedefs, enums, constructors/destructors, functions, data). Categorized by
// member kind so it works for both classes and namespaces.

import { FUNCTION_KINDS } from './constants.ts'

const asArray = (value: unknown): any[] => (Array.isArray(value) ? value : [])

// A constructor shares the class's short name; a destructor starts with `~`.
function shortClassName(fullName: unknown): string {
  return (String(fullName).split('<')[0].split('::').pop() || '').trim()
}
function isConstructorOrDestructor(member: any, className: unknown): boolean {
  const name = String(member.name ?? '')
  return name === shortClassName(className) || name.startsWith('~')
}

export function typedefMembers(members: unknown): any[] {
  return asArray(members).filter((m) => m.kind === 'typedef')
}

export function enumMembers(members: unknown): any[] {
  return asArray(members).filter((m) => m.kind === 'enum')
}

export function constructorMembers(
  members: unknown,
  className: unknown
): any[] {
  return asArray(members).filter(
    (m) => FUNCTION_KINDS.has(m.kind) && isConstructorOrDestructor(m, className)
  )
}

export function functionMembers(members: unknown, className: unknown): any[] {
  return asArray(members).filter(
    (m) =>
      FUNCTION_KINDS.has(m.kind) && !isConstructorOrDestructor(m, className)
  )
}

export function dataMembers(members: unknown): any[] {
  return asArray(members).filter((m) => m.kind === 'variable')
}
