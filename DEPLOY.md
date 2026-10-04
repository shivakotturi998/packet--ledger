# Pocket Ledger — deploy to GitHub Pages (free HTTPS hosting)

# Your app files (no build step needed):
# index.html  style.css  script.js  sw.js  manifest.webmanifest  icons/

# ---- 3 commands to go live ----

# 1) Init + first commit (run ONCE inside this folder):
#   git init -b main
#   git add index.html style.css script.js sw.js manifest.webmanifest icons capacitor.config.json package.json
#   git commit -m "Pocket Ledger v1"

# 2) Create repo on github.com (in browser) named e.g. pocket-ledger,
#    then link + push (replace YOUR-USERNAME):
#   git remote add origin https://github.com/YOUR-USERNAME/pocket-ledger.git
#   git push -u origin main

# 3) Turn on Pages: repo > Settings > Pages > Source: Deploy from branch > main / root > Save.
#    Live URL in ~1 min:
#    https://YOUR-USERNAME.github.io/pocket-ledger/

# ---- Phone: install for PC-off + offline use ----
# 1. Open the live URL once ONLINE.
# 2. Android Chrome: ⋮ > Add to Home screen / Install app.
#    iPhone Safari: Share > Add to Home Screen.
# 3. After that: PC can be OFF, phone can be on airplane mode — app still opens.
#    Data stays in localStorage on each device (PC and phone do NOT auto-sync;
#    use Export CSV on one + Import CSV on the other to copy).

# ---- Update after edits ----
#   git add -A
#   git commit -m "update"
#   git push
# (Service worker is v2 with SKIP_WAITING + navigation fallback, so phones
#  get the new version on next online open.)
