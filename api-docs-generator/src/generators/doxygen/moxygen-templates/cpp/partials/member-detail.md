---

{{cleanAnchor refid name}}

#### {{name}}

{{badgesNoInlineRmf2Docs}}

```cpp
{{signatureNoInlineRmf2Docs}}
```

{{#if (sourceLabel)}}{{#if (sourceHref)}}Defined in [{{sourceLabel}}]({{sourceHref}}){{else}}Defined in {{sourceLabel}}{{/if}}
{{/if}}

{{fixLinksRmf2Docs briefdescription}}

{{fixLinksRmf2Docs detaileddescription}}

{{#if referencedBy}}

##### Referenced by

{{#each referencedBy}}- {{inheritedNameRmf2Docs name refid}}
{{/each}}

{{/if}}
{{#if references}}

##### References

{{#each references}}- {{inheritedNameRmf2Docs name refid}}
{{/each}}

{{/if}}
{{#if reimplements}}

##### Reimplements

{{#each reimplements}}- {{inheritedNameRmf2Docs name refid}}
{{/each}}

{{/if}}
{{#if reimplementedBy}}

##### Reimplemented by

{{#each reimplementedBy}}- {{inheritedNameRmf2Docs name refid}}
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
