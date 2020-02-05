# Hide TypeScript VS Code extension

TypeScript is a great tool to help the computer understand the programmer's intentions better. However, all those language features can make the code harder to understand for humans. Let's try to make TypeScript more readable, by hiding it!

## Features

The extension adds a `Hide TypeScript` command, which takes TypeScript code from the active editor and transforms it to modern JavaScript. The transformed code is then shown in a new editor tab.

Under the hood, this extension uses [Babel](https://babeljs.io/) to transform code.

## Extension Settings

There are currently no settings.

## Known Issues

- Transformed code does not reflect changes in source code, even when running the command again.
- Not all transformed code is equally readable.
- TSX is not supported.
