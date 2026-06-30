# Syncing with PennyWise Upstream

Source: https://github.com/sarim2000/pennywiseai-tracker/tree/main/parser-core

This TypeScript package is a faithful port of PennyWise's `parser-core` Kotlin module.

## When PennyWise adds a new bank parser

1. Find the new file in `parser-core/src/main/kotlin/.../bank/`
2. Translate to TypeScript (follow the pattern of any existing parser in `src/banks/`)
   - Regex patterns copy verbatim: `Regex("""p""")` → `/p/`
   - `BigDecimal` → `number`, strip commas with `parseFloat(str.replace(/,/g, ''))`
   - `?.` → `?.`, `?:` → `??`, `str.contains()` → `str.includes()`
   - Extend `BaseIndianBankParser` for Indian banks, `BankParser` for others
   - Never override `parse()` — let the base class template method call your protected extractors
3. Add `import` + `new ClassName()` to `src/BankParserFactory.ts` in the same position as the Kotlin factory list
4. Add re-export to `src/index.ts`
5. Run `npm test`

## When PennyWise updates an existing parser

1. Diff the changed `.kt` file against its `.ts` equivalent
2. New regex pattern: copy verbatim into the `.ts` file
3. New sender ID in `canHandle()`: copy the string exactly
4. Run `npm test`

## Translation reference

| Kotlin | TypeScript |
|--------|-----------|
| `Regex("""p""")` | `/p/` |
| `regex.find(str)?.groupValues[1]` | `str.match(/p/)?.[1] ?? null` |
| `str.contains("x")` | `str.includes('x')` |
| `str.lowercase()` | `str.toLowerCase()` |
| `x ?: default` | `x ?? default` |
| `BigDecimal` | `number` |
| `?.let { }` | `if (x) { }` |
| `(?i)` inline flag | Remove; use `/i` JS flag suffix |
| `(?im)` inline flag | Remove; use `/im` JS flag suffix |
| `override fun getBankName()` | `getBankName(): string` |
| `override fun canHandle(sender: String)` | `canHandle(sender: string): boolean` |
