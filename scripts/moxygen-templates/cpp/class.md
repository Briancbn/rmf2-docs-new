{{cleanAnchor refid name}}

# {{name}}

```cpp
{{#if includes}}
#include <{{incPath location includes}}>

{{/if}}
{{#if templateParams}}template<{{#each templateParams}}{{type}}{{#if name}} {{name}}{{/if}}{{#if defaultValue}} = {{defaultValue}}{{/if}}{{#unless @last}}, {{/unless}}{{/each}}>
{{/if}}{{#if (eq kind "interface")}}class{{else}}{{kind}}{{/if}} {{name}}
```

{{#if (sourceLabel)}}{{#if (sourceHref)}}Defined in [{{sourceLabel}}]({{sourceHref}}){{else}}Defined in {{sourceLabel}}{{/if}}
{{/if}}

{{#if basecompoundref}}> **Inherits:** {{#each basecompoundref}}{{inheritedName name refid}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}
{{#if derivedcompoundref}}> **Subclassed by:** {{#each derivedcompoundref}}{{inheritedName name refid}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}

{{fixLinks briefdescription}}

{{fixLinks detaileddescription}}

{{#each inheritedMemberGroups}}
### Inherited from {{inheritedName name refid}}

| Kind | Name | Description |
|------|------|-------------|
{{#each members}}| `{{kind}}` | {{inheritedName name refid}} {{badgesNoInline}} | {{cell (memberSummary this)}} |
{{/each}}

{{/each}}
{{#each (orderedSections filtered.sections)}}
### {{#if (eq section "public-func")}}Public Member Functions{{else}}{{label}}{{/if}}

{{#if (hasReturnColumn section)}}
| Name | Description |
|------|-------------|
{{#each members}}| {{#if (returnTypeShort)}}{{returnTypeShort}} {{/if}}[`{{name}}{{#if argsstring}} {{tableArgs argsstring}}{{/if}}`](#{{cleanId refid name}}) {{signatureBadges}} | {{cell (memberSummary this)}} |
{{/each}}
{{else}}
| Name | Description |
|------|-------------|
{{#each members}}| [`{{name}}{{#if argsstring}} {{argsstring}}{{/if}}`](#{{cleanId refid name}}) {{badgesNoInline}} | {{cell (memberSummary this)}} |
{{/each}}
{{/if}}

{{#each members}}

---

{{cleanAnchor refid name}}

#### {{name}}

{{badgesNoInline}}

```cpp
{{signatureNoInline}}
```

{{#if (sourceLabel)}}{{#if (sourceHref)}}Defined in [{{sourceLabel}}]({{sourceHref}}){{else}}Defined in {{sourceLabel}}{{/if}}
{{/if}}

{{fixLinks briefdescription}}

{{fixLinks detaileddescription}}

{{#if referencedBy}}
##### Referenced by

{{#each referencedBy}}- {{inheritedName name refid}}
{{/each}}

{{/if}}
{{#if references}}
##### References

{{#each references}}- {{inheritedName name refid}}
{{/each}}

{{/if}}
{{#if reimplements}}
##### Reimplements

{{#each reimplements}}- {{inheritedName name refid}}
{{/each}}

{{/if}}
{{#if reimplementedBy}}
##### Reimplemented by

{{#each reimplementedBy}}- {{inheritedName name refid}}
{{/each}}

{{/if}}

{{#unless briefdescription}}
{{#unless detaileddescription}}
{{memberSummary this}}
{{/unless}}
{{/unless}}

{{#if (hasDocumentedParams params)}}
| Parameter | Type | Description |
|-----------|------|-------------|
{{#each (documentedParams params)}}| `{{name}}` | `{{type}}` | {{description}} |
{{/each}}
{{/if}}

{{#if enumvalue}}
| Value | Description |
|-------|-------------|
{{#each enumvalue}}| `{{name}}` | {{summary}} |
{{/each}}
{{/if}}

{{/each}}
{{/each}}
