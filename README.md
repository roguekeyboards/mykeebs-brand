# mykeebs-brand

mykeebs' logo, icons and design tokens. They have their own repo because the brand belongs to the whole system, not one client: [kbdb](https://github.com/roguekeyboards/kbdb)'s sign-in page, [mykeebs-web](https://github.com/roguekeyboards/mykeebs-web) and [mykeebs.com](https://github.com/roguekeyboards/mykeebs.com) all use it.

- **Source of truth:** `tokens.json` (colours and font stacks), the designs in `src/logo.js` and the fonts in `fonts/`.
- **Generated:** everything in `dist/`, by `mise run gen`. Never edit `dist/` by hand.
- **npm:** `@roguekeyboards/mykeebs-brand` on GitHub Packages, published when a release is. Renovate bumps it in each consumer.

## Files

| File                                                                        | Use                                                                                                          |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `logo-horizontal-on-dark.svg` / `-on-light.svg`                             | Mark beside the wordmark: headers, nav bars                                                                  |
| `logo-stacked-on-dark.svg` / `-on-light.svg`                                | Mark above the wordmark: square spaces, social cards                                                         |
| `mark-on-dark.svg` / `-on-light.svg`                                        | The mark alone                                                                                               |
| `favicon.svg`, `favicon.ico` (16/32/48), `favicon-16.png`, `favicon-32.png` | Browser tab icons, drawn on the pixel grid at 16 and 32                                                      |
| `apple-touch-icon.png` (180)                                                | iOS home screen                                                                                              |
| `icon-192.png`, `icon-512.png`                                              | Web app manifest                                                                                             |
| `discord-avatar.png` (1024)                                                 | Prod Discord application icon. Discord crops it to a circle; the mark fits inside.                           |
| `discord-avatar-dev.png` (1024)                                             | Dev Discord application icon: the same with a blue "DEV" banner                                              |
| `fonts.css`                                                                 | `@font-face` rules for JetBrains Mono (400-700) and Inter (400-600), latin subset                            |
| `fonts/*.woff2`, `fonts/*-OFL.txt`                                          | The fonts `fonts.css` loads and their licenses. Keep the licenses with the fonts wherever they're served.    |
| `tokens.css`                                                                | `tokens.json` as CSS custom properties: theme tokens as `--accent` etc., logo colours as `--logo-amber` etc. |

In the SVGs the wordmark's text is converted to outlines, so they render the same without JetBrains Mono installed.

## Local setup

Tooling is pinned with [mise](https://mise.jdx.dev). The generator's one dependency, `opentype.js`, reads the font; it draws and encodes the images itself, so there's nothing native to install.

```sh
mise install
npm ci
mise run gen      # regenerate dist/
mise run test     # node --test
mise run lint     # prettier, eslint and actionlint
```

## Using it

```ts
import favicon from '@roguekeyboards/mykeebs-brand/favicon.svg';
```

```css
@import '@roguekeyboards/mykeebs-brand/fonts.css';
@import '@roguekeyboards/mykeebs-brand/tokens.css';
```

## Changing the brand

1. Edit `tokens.json` or a design in `src/logo.js`.
2. `mise run gen`, look at `dist/`, commit both.
3. The PR needs a `feat` or `fix` title so merging leads to a release, which publishes the package.

`mise run check-generated` compares `dist/`'s SVG and CSS files byte for byte. PNG and ICO bytes can vary with the zlib doing the compressing, so the tests compare those pixel by pixel instead.

### By hand, after a release that changes the icons

These don't update themselves:

- [ ] Discord prod application icon (Developer Portal → General Information): `discord-avatar.png`
- [ ] Discord dev application icon: `discord-avatar-dev.png`
- [ ] Stytch email template logo, if one is set

## License

The generator's code is [MIT](LICENSE-MIT). The name, logo and artwork aren't; see [`LICENSE`](LICENSE). The fonts are under the SIL Open Font License, with each license beside its font in [`fonts/`](fonts/).
