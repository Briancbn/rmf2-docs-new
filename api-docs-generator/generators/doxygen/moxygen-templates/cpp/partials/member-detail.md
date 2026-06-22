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
