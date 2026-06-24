{{cleanAnchor refid name}}

# {{name}}

```cpp
{{#if includes}}
#include <{{incPathRmf2Docs location includes}}>

{{/if}}
{{#if templateParams}}template<{{#each templateParams}}{{type}}{{#if name}} {{name}}{{/if}}{{#if defaultValue}} = {{defaultValue}}{{/if}}{{#unless @last}}, {{/unless}}{{/each}}>
{{/if}}{{#if (eq kind "interface")}}class{{else}}{{kind}}{{/if}} {{name}}
```

{{#if (sourceLabel)}}{{#if (sourceHref)}}Defined in [{{sourceLabel}}]({{sourceHref}}){{else}}Defined in {{sourceLabel}}{{/if}}
{{/if}}

{{#if basecompoundref}}> **Inherits:** {{#each basecompoundref}}{{inheritedNameRmf2Docs name refid}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}
{{#if derivedcompoundref}}> **Subclassed by:** {{#each derivedcompoundref}}{{inheritedNameRmf2Docs name refid}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}

{{fixLinksRmf2Docs briefdescription}}

{{#each (orderedSectionsRmf2Docs filtered.sections)}}

### {{#if (eq section "public-func")}}Public Member Functions{{else}}{{label}}{{/if}}

{{#if (hasReturnColumn section)}}
| Name | Description |
|------|-------------|
{{#each members}}| {{#if (returnTypeShort)}}{{returnTypeShort}} {{/if}}[`{{name}}{{#if argsstring}} {{tableArgsRmf2Docs argsstring}}{{/if}}`](#{{cleanId refid name}}) {{signatureBadgesRmf2Docs}} | {{cell (memberSummary this)}} |
{{/each}}
{{else}}
| Name | Description |
|------|-------------|
{{#each members}}| [`{{name}}{{#if argsstring}} {{argsstring}}{{/if}}`](#{{cleanId refid name}}) {{badgesNoInlineRmf2Docs}} | {{cell (memberSummary this)}} |
{{/each}}
{{/if}}

{{/each}}
{{#each inheritedMemberGroups}}
### Inherited from {{inheritedNameRmf2Docs name refid}}

| Kind | Name | Description |
|------|------|-------------|
{{#each members}}| `{{kind}}` | {{inheritedNameRmf2Docs name refid}} {{badgesNoInlineRmf2Docs}} | {{cell (memberSummary this)}} |
{{/each}}

{{/each}}
{{#if detaileddescription}}

## Detailed Description

{{fixLinksRmf2Docs detaileddescription}}

{{/if}}
{{#each (typedefMembersRmf2Docs filtered.members)}}
{{#if @first}}## Member Typedef Documentation

{{/if}}
{{> memberDetailRmf2Docs}}
{{/each}}
{{#each (enumMembersRmf2Docs filtered.members)}}
{{#if @first}}## Member Enumeration Documentation

{{/if}}
{{> memberDetailRmf2Docs}}
{{/each}}
{{#each (constructorMembersRmf2Docs filtered.members name)}}
{{#if @first}}## Constructor & Destructor Documentation

{{/if}}
{{> memberDetailRmf2Docs}}
{{/each}}
{{#each (functionMembersRmf2Docs filtered.members name)}}
{{#if @first}}## Member Function Documentation

{{/if}}
{{> memberDetailRmf2Docs}}
{{/each}}
{{#each (dataMembersRmf2Docs filtered.members)}}
{{#if @first}}## Member Data Documentation

{{/if}}
{{> memberDetailRmf2Docs}}
{{/each}}
