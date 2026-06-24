{{cleanAnchor refid name}}

# {{name}}

{{#if (eq kind "group")}}
{{summary}}
{{else}}
{{fixLinks briefdescription}}
{{/if}}

{{#with (compoundsOfKind filtered.compounds "namespace") as |namespaces|}}
{{#if namespaces}}

### Namespaces

| Name                 | Description                  |
| -------------------- | ---------------------------- | ---------------- |
| {{#each namespaces}} | {{inheritedName name refid}} | {{cell summary}} |

{{/each}}
{{/if}}
{{/with}}

{{#with (compoundsOfKind filtered.compounds "class" "struct" "interface") as |types|}}
{{#if types}}

### Classes

| Name            | Description                  |
| --------------- | ---------------------------- | ---------------- |
| {{#each types}} | {{inheritedName name refid}} | {{cell summary}} |

{{/each}}
{{/if}}
{{/with}}

{{#with (compoundsOfKind filtered.compounds "enum") as |enums|}}
{{#if enums}}

### Enumerations

| Name            | Description                  |
| --------------- | ---------------------------- | ---------------- |
| {{#each enums}} | {{inheritedName name refid}} | {{cell summary}} |

{{/each}}
{{/if}}
{{/with}}

{{#each (orderedSections filtered.sections)}}

### {{label}}

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
{{#if detaileddescription}}

## Detailed Description

{{fixLinks detaileddescription}}

{{/if}}
{{#each (typedefMembers filtered.members)}}
{{#if @first}}## Typedef Documentation

{{/if}}
{{> memberDetail}}
{{/each}}
{{#each (enumMembers filtered.members)}}
{{#if @first}}## Enumeration Documentation

{{/if}}
{{> memberDetail}}
{{/each}}
{{#each (functionMembers filtered.members "")}}
{{#if @first}}## Function Documentation

{{/if}}
{{> memberDetail}}
{{/each}}
{{#each (dataMembers filtered.members)}}
{{#if @first}}## Variable Documentation

{{/if}}
{{> memberDetail}}
{{/each}}
