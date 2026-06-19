{{cleanAnchor refid name}}

# {{name}}

{{#if (eq kind "group")}}
{{summary}}
{{else}}
{{fixLinks briefdescription}}

{{fixLinks detaileddescription}}
{{/if}}

{{#with (compoundsOfKind filtered.compounds "namespace") as |namespaces|}}
{{#if namespaces}}
### Namespaces

| Name | Description |
|------|-------------|
{{#each namespaces}}| {{inheritedName name refid}} | {{cell summary}} |
{{/each}}
{{/if}}
{{/with}}

{{#with (compoundsOfKind filtered.compounds "class" "struct" "interface") as |types|}}
{{#if types}}
### Classes

| Name | Description |
|------|-------------|
{{#each types}}| {{inheritedName name refid}} | {{cell summary}} |
{{/each}}
{{/if}}
{{/with}}

{{#with (compoundsOfKind filtered.compounds "enum") as |enums|}}
{{#if enums}}
### Enumerations

| Name | Description |
|------|-------------|
{{#each enums}}| {{inheritedName name refid}} | {{cell summary}} |
{{/each}}
{{/if}}
{{/with}}

{{#each filtered.sections}}
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

{{#each members}}

---

{{cleanAnchor refid name}}

#### {{name}}

{{badgesNoInline}}

```cpp
{{signatureNoInline}}
```

{{fixLinks briefdescription}}

{{fixLinks detaileddescription}}

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
