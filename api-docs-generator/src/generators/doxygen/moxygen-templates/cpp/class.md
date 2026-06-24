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

{{/each}}
{{#each inheritedMemberGroups}}

### Inherited from {{inheritedName name refid}}

| Kind              | Name       | Description                                     |
| ----------------- | ---------- | ----------------------------------------------- | ----------------------------- |
| {{#each members}} | `{{kind}}` | {{inheritedName name refid}} {{badgesNoInline}} | {{cell (memberSummary this)}} |

{{/each}}

{{/each}}
{{#if detaileddescription}}

## Detailed Description

{{fixLinks detaileddescription}}

{{/if}}
{{#each (typedefMembers filtered.members)}}
{{#if @first}}## Member Typedef Documentation

{{/if}}
{{> memberDetail}}
{{/each}}
{{#each (enumMembers filtered.members)}}
{{#if @first}}## Member Enumeration Documentation

{{/if}}
{{> memberDetail}}
{{/each}}
{{#each (constructorMembers filtered.members name)}}
{{#if @first}}## Constructor & Destructor Documentation

{{/if}}
{{> memberDetail}}
{{/each}}
{{#each (functionMembers filtered.members name)}}
{{#if @first}}## Member Function Documentation

{{/if}}
{{> memberDetail}}
{{/each}}
{{#each (dataMembers filtered.members)}}
{{#if @first}}## Member Data Documentation

{{/if}}
{{> memberDetail}}
{{/each}}
