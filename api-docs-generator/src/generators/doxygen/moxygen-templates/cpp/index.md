# API Reference

{{#if filtered.compounds}}
| Name | Description |
|------|-------------|
{{#each filtered.compounds}}| [`{{name}}`](#{{cleanId refid name}}) | {{cell summary}} |
{{/each}}
{{/if}}

{{#each filtered.sections}}

## {{label}}

{{#each members}}

{{cleanAnchor refid name}}

#### {{name}}

```cpp
{{signatureNoInlineRmf2Docs}}
```

{{fixLinksRmf2Docs briefdescription}}

{{#if enumvalue}}
| Value | Description |
|-------|-------------|
{{#each enumvalue}}| `{{name}}` | {{summary}} |
{{/each}}
{{/if}}

{{fixLinksRmf2Docs detaileddescription}}

{{/each}}
{{/each}}
