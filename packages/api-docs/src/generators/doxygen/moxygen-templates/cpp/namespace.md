---
outline: [2, 3]
---
{{cleanAnchor refid name}}

# {{name}}

{{#if (eq kind "group")}}
{{summary}}
{{else}}
{{fixLinksRmf2Docs briefdescription}}
{{/if}}

{{#with (compoundsOfKind filtered.compounds "namespace") as |namespaces|}}
{{#if namespaces}}
## Namespaces

| Name | Description |
|------|-------------|
{{#each namespaces}}| {{inheritedNameRmf2Docs name refid}} | {{cell summary}} |
{{/each}}
{{/if}}
{{/with}}

{{#with (compoundsOfKind filtered.compounds "class" "struct" "interface") as |types|}}
{{#if types}}
## Classes

| Name | Description |
|------|-------------|
{{#each types}}| {{inheritedNameRmf2Docs name refid}} | {{cell summary}} |
{{/each}}
{{/if}}
{{/with}}

{{#with (compoundsOfKind filtered.compounds "enum") as |enums|}}
{{#if enums}}
## Enumerations

| Name | Description |
|------|-------------|
{{#each enums}}| {{inheritedNameRmf2Docs name refid}} | {{cell summary}} |
{{/each}}
{{/if}}
{{/with}}

{{#each (orderedSectionsRmf2Docs filtered.sections)}}

## {{label}}

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
{{#if detaileddescription}}

## Detailed Description

{{fixLinksRmf2Docs detaileddescription}}

{{/if}}
{{#each (typedefMembersRmf2Docs filtered.members)}}
{{#if @first}}## Typedef Documentation

{{/if}}
{{> memberDetailRmf2Docs}}
{{/each}}
{{#each (enumMembersRmf2Docs filtered.members)}}
{{#if @first}}## Enumeration Documentation

{{/if}}
{{> memberDetailRmf2Docs}}
{{/each}}
{{#each (functionMembersRmf2Docs filtered.members "")}}
{{#if @first}}## Function Documentation

{{/if}}
{{> memberDetailRmf2Docs}}
{{/each}}
{{#each (dataMembersRmf2Docs filtered.members)}}
{{#if @first}}## Variable Documentation

{{/if}}
{{> memberDetailRmf2Docs}}
{{/each}}
