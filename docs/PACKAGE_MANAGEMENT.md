# Package Management Guide

This project uses **npm** as the package manager. Please follow these guidelines to avoid dependency conflicts.

## ✅ Correct Usage

```bash
# Install dependencies
npm install

# Add a new dependency
npm install package-name

# Add a dev dependency
npm install --save-dev package-name

# Remove a dependency
npm uninstall package-name

# Run scripts
npm run dev
npm run build
npm run test
```

## ❌ Avoid These Commands

Do not use other package managers in this project:

```bash
# DON'T use these:
yarn install
pnpm install
bun install
```

## 🔍 Checking for Conflicts

Run this command to check for multiple lockfiles:

```bash
npm run check-lockfiles
```

If you see multiple lockfiles, clean them up:

```bash
npm run clean-lockfiles
npm install
```

## 🚨 Troubleshooting

### VS Code Warning: "Multiple lockfiles found"

This warning appears when VS Code detects multiple package manager lockfiles (package-lock.json, yarn.lock, pnpm-lock.yaml, bun.lockb) in your project.

**Solution:**
1. Run `npm run check-lockfiles` to see which lockfiles exist
2. Run `npm run clean-lockfiles` to remove non-npm lockfiles
3. Run `npm install` to ensure package-lock.json is up to date
4. Restart VS Code

### Dependencies Out of Sync

If you encounter dependency issues:

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# Or on Windows
rmdir /s node_modules
del package-lock.json
npm install
```

## 📋 Best Practices

1. **Always use npm** for this project
2. **Commit package-lock.json** to version control
3. **Don't commit node_modules** (already in .gitignore)
4. **Run `npm run check-lockfiles`** before committing
5. **Use exact versions** for critical dependencies

## 🔧 Scripts Available

- `npm run check-lockfiles` - Check for multiple lockfiles
- `npm run clean-lockfiles` - Remove non-npm lockfiles
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Run linting

## 📁 Files to Ignore

The following files are ignored in .gitignore to prevent conflicts:

```
# Other package manager lockfiles
yarn.lock
pnpm-lock.yaml
bun.lockb
.pnpm-store
```

## 🆘 Getting Help

If you encounter package management issues:

1. Check this guide first
2. Run `npm run check-lockfiles`
3. Try a clean install
4. Check the project's GitHub issues
5. Ask the development team
