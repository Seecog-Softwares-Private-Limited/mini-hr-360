# Development Setup - Auto Reload

This project is now configured for automatic server restart and live development.

## How It Works

1. **Nodemon** watches for file changes and automatically restarts the server
2. **Handlebars caching is disabled** in development mode
3. **Static file caching is disabled** in development mode

## Usage

### Start Development Server

```bash
npm run dev
```

This will:
- Watch for changes in `.js`, `.hbs`, `.json`, `.css`, `.html` files
- Automatically restart the server when files change
- Disable caching so you see changes immediately

### What Gets Watched

- `src/` directory (all JavaScript and Handlebars files)
- `public/` directory (static assets)
- `database/` directory (migrations, seeders)

### Browser Refresh

**Important:** The server will restart automatically, but you still need to **refresh your browser** (F5 or Cmd+R) to see the changes.

### Tips

1. **Keep the terminal open** - You'll see when the server restarts
2. **Watch for restart messages** - Nodemon will show "restarting due to changes..."
3. **Hard refresh if needed** - Use Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac) to clear cache

### Troubleshooting

If changes aren't appearing:

1. Check the terminal - Is nodemon restarting?
2. Hard refresh the browser (Ctrl+Shift+R / Cmd+Shift+R)
3. Check browser console for errors
4. Verify you're running `npm run dev` (not `npm start`)

### Production

For production, use:
```bash
npm start
```

This runs without nodemon and with caching enabled for better performance.
