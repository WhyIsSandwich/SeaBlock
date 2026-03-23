# Factorio Data Processing Scripts

Cross-platform scripts to extract, process, and optimize Factorio data for the SeaBlock project.

## Pipeline Structure (Fork)

The pipeline forms a **fork**. Graphics and the Processor chain are independent; they share output folder `generated/data/dev` but nothing else.

| Branch | Scripts | Input | Output |
|--------|---------|-------|--------|
| **Processor chain** | Extract → Process → Tooltips | Machine with Factorio, or script-output | data.json, locale, spritemap, en-tooltips.json |
| **Graphics chain** | copy-mod-graphics → convert-to-webp | Copy of Factorio folder (mods) | Mod PNGs → WebP → Cloudflare |

- **Extract** - Runs on machine with Factorio (needs exe)
- **Graphics** - Uses copy of Factorio folder (mods)
- **Process** - Uses script-output (from Extract or copy)
- **Tooltips** - Needs Processor output

See [CONTAINER.md](CONTAINER.md) for running in Docker/dev containers.

## Quick Start

### Processor Chain (JSON, spritemap, tooltips)

```bash
# 1. Extract (on machine with Factorio)
./scripts/extract-factorio-data.sh   # or .ps1 on Windows

# 2. Process (uses script-output)
node scripts/process-factorio-data.js --script-output /path/to/script-output

# 3. Tooltips (optional, reads process output)
node scripts/generate-tooltips.js
```

### Graphics Chain (mod PNGs)

```bash
node scripts/copy-mod-graphics.js -g /path/to/factorio -u /path/to/userdata -o ./generated/data/dev
```

## Available Scripts

### Processor Chain

- **`process-factorio-data.js`** - Core processor (data.json, locale, spritemap). Input: script-output.
- **`generate-tooltips.js`** - Generates en-tooltips.json from process output.
- **`convert-to-webp.js`** - PNG → WebP for graphics and spritemap. Per-file compression overrides via `--spritemap-quality`, `--spritemap-method`, or `fileOverrides` config.
- **`publish-generated-data.js`** - Publish to CDN (see `.env.example`).

### Graphics Chain

- **`copy-mod-graphics.js`** - Copy mod PNGs to `generated/data/dev`.
- **`convert-to-webp.js`** - PNG → WebP for graphics and spritemap.

### Extraction (needs Factorio on machine)

- **`extract-factorio-data.sh`** - Linux/macOS/Git Bash
- **`extract-factorio-data.ps1`** - Windows PowerShell (recommended)
- **`extract-factorio-data.cmd`** - Windows Command Prompt

### Deprecated

- **`productionize-spritemap-webp.js`** - Use `convert-to-webp.js --spritemap-only` instead.

## Usage

### Processor Scripts

#### process-factorio-data.js

```bash
node scripts/process-factorio-data.js --script-output /path/to/script-output [--output ./generated/data/dev] [--locale en] [--tooltips]
```

- `--script-output` - Path to Factorio script-output (required)
- `--output` - Output directory (default: generated/data/dev)
- `--tooltips` - Run generate-tooltips.js after processing

#### Tooltip Generator

**`generate-tooltips.js`** - Generates `en-tooltips.json` using the same rules as runtime details. Requires `data.json` and `locale-en.json` from `process-factorio-data.js`.

```bash
# Default: reads/writes generated/data/dev
node scripts/generate-tooltips.js

# Custom output path
node scripts/generate-tooltips.js --output ./generated/data/dev

# Or run after process-factorio-data
node scripts/process-factorio-data.js --script-output /path/to/script-output --tooltips
```

**Options:** `--output PATH`, `-o PATH`, `--verbose`, `-v`

#### WebP Converter (Graphics)

**`convert-to-webp.js`** - Converts PNG files in `*/graphics/*` directories to WebP. Default source: `generated/data/dev`. Use `--source` for custom paths.

```bash
node scripts/convert-to-webp.js
node scripts/convert-to-webp.js --source ./data-dumps/graphics
```

#### Mod Graphics Copier

**`copy-mod-graphics.js`** - Interactive script that copies all PNG files from Factorio mods to `generated/data/dev` following the **modname** naming pattern. Served by Vite at `/generated/data/dev` in dev. Shares the same output folder as process-factorio-data so entity graphics resolve correctly.

```bash
node scripts/copy-mod-graphics.js
```

**Features:**

- Auto-detects Factorio installation paths
- Handles core game data (data/core → **core**, data/base → **base**)
- Processes specific mods (space-age, quality, elevated-rails)
- Extracts user mods from zip files or folders
- Parses modinfo.json to get proper mod names
- Creates organized graphics directory structure
- Command-line parameter support

**Command-line Options:**

- `-g, --game-folder PATH` - Path to Factorio game folder
- `-u, --user-folder PATH` - Path to Factorio user folder (optional)
- `-o, --output PATH` - Output directory (default: `generated/data/dev`)
- `-h, --help` - Show help message

**Examples:**

```bash
# Interactive mode
node scripts/copy-mod-graphics.js

# Skip interactive prompts
node scripts/copy-mod-graphics.js -g /path/to/factorio

# With separate user folder
node scripts/copy-mod-graphics.js -g /factorio -u /userdata -o ./generated/data/dev

# Show help
node scripts/copy-mod-graphics.js --help
```

**What it does:**

1. **Core Graphics** - Copies PNG files from data/core and data/base
2. **Specific Mods** - Handles space-age, quality, and elevated-rails mods
3. **User Mods** - Extracts and processes mods from userdata or game folder
4. **Mod Name Extraction** - Reads modinfo.json to get proper mod names
5. **Directory Organization** - Creates **modname** folders in `generated/data/dev`

#### Data Extraction Scripts

All extraction scripts support the same command line options:

- `-p, --path PATH` - Path to Factorio executable
- `-l, --languages CODES` - Comma-separated language codes (default: en)
- `-h, --help` - Show help message

### Examples

#### Interactive Mode (Recommended)

```bash
# Linux/macOS/Git Bash
./extract-factorio-data.sh

# Windows Command Prompt
extract-factorio-data.cmd

# Windows PowerShell
.\extract-factorio-data.ps1
```

#### Command Line Mode

```bash
# Linux/macOS/Git Bash
./extract-factorio-data.sh -p /usr/games/factorio -l en,de,fr

# Windows Command Prompt
extract-factorio-data.cmd -p "C:\Program Files\Factorio\bin\x64\factorio.exe" -l en,de,fr

# Windows PowerShell
.\extract-factorio-data.ps1 -Path "C:\Program Files\Factorio\bin\x64\factorio.exe" -Languages "en,de,fr"
```

## Directory Structure Mapping

Factorio installations vary by setup:

### Standard Installation (Game Folder Only)

```
/path/to/factorio/
├── bin/x64/factorio.exe          # Executable
├── data/                         # Core game data
│   ├── base/                     # Base game mod
│   └── core/                     # Core game files
├── mods/                         # User mods
└── script-output/                # Factorio output
```

### Steam Installation (Separate User and Game Folders)

```
# Game folder
/steam/steamapps/common/Factorio/
├── bin/x64/factorio.exe
└── data/                         # Core game data

# User folder
/steam/userdata/[USER_ID]/427520/remote/
├── mods/                         # User mods
└── script-output/                # Factorio output
```

Pass `-g` (game folder) and `-u` (user folder, if separate) to copy-mod-graphics.js.

## What the Scripts Do

### Mod Graphics Copier

1. **Auto-detect Factorio installation** - Searches common installation paths
2. **Setup graphics directory** - Creates data-dumps/graphics folder structure
3. **Copy core graphics** - Copies PNG files from data/core and data/base
4. **Process specific mods** - Handles space-age, quality, and elevated-rails
5. **Extract user mods** - Processes mods from userdata or game folder
6. **Parse mod names** - Reads modinfo.json to get proper mod names
7. **Organize output** - Creates **modname** folders with all PNG files

### Data Extraction Scripts

1. **Auto-detect Factorio installation** - Searches common installation paths
2. **Prompt for missing information** - Asks for Factorio path and language codes if not provided
3. **Run Factorio data extraction sequentially** - Executes three separate Factorio commands:
   - `--dump-data` - Exports data.raw as JSON
   - `--dump-prototype-locale` - Exports prototype names and descriptions
   - `--dump-icon-sprites` - Exports all icon sprites as PNG files
4. **Find output** - Locates Factorio's script output folder
5. **Report results** - Shows extracted files and directory size

## Generated Output Structure

Processed data is written to `generated/` (git-ignored):

- `generated/data/dev/` - Dev output (default). Served by VitePress dev server at `/generated/data/dev/`.
- `generated/data/prod/<hash>/` - Production output for CDN publishing. Use `--output` when running the pipeline.

Set `VITE_ASSET_*` env vars (see `.env.example`) for production builds after publishing.

## Output

The scripts copy files directly to the `data-dumps/` folder:

```
data-dumps/
├── data.raw.json
├── prototype-locale/
│   ├── en.cfg
│   ├── de.cfg
│   └── ...
├── icon-sprites/
│   ├── item/
│   ├── entity/
│   └── ...
└── graphics/
    ├── __core__/
    │   ├── graphics/
    │   └── ...
    ├── __base__/
    │   ├── graphics/
    │   └── ...
    ├── __space-age__/
    │   ├── graphics/
    │   └── ...
    ├── __quality__/
    │   ├── graphics/
    │   └── ...
    ├── __elevated-rails__/
    │   ├── graphics/
    │   └── ...
    └── __modname__/
        ├── graphics/
        └── ...
```

**Note:** Factorio outputs to its default `script-output` folder, then the scripts copy the files to the `data-dumps/` directory for better file management. The graphics copier creates organized **modname** folders containing all PNG files from each mod.

## Language Codes

Supported language codes include:

- `en` - English
- `de` - German
- `fr` - French
- `es` - Spanish
- `ru` - Russian
- `zh` - Chinese
- And many more...

Use comma-separated codes for multiple languages: `en,de,fr`

## Requirements

- **Factorio** - Must be installed and accessible
- **Bash** - For the `.sh` script (available on Linux, macOS, Git Bash on Windows)
- **Command Prompt** - For the `.cmd` script (available on all Windows systems)
- **PowerShell** - For the `.ps1` script (available on Windows 7+ and modern systems)

## Troubleshooting

### "Could not find Factorio executable"

- Provide the full path to your Factorio executable using the `-p` or `--path` option
- Common paths:
  - Windows: `C:\Program Files\Factorio\bin\x64\factorio.exe`
  - Linux: `/usr/games/factorio`
  - Steam: Check your Steam installation directory

### "Invalid language codes format"

- Use 2-letter language codes separated by commas
- Example: `en,de,fr` (not `english,german,french`)

### Permission Issues (Windows)

- Run Command Prompt or PowerShell as Administrator if needed
- For PowerShell, you may need to set execution policy: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

## Notes

- The `data-dumps/` directory is automatically added to `.gitignore`
- Each extraction creates a new timestamped directory
- The extraction process may take several minutes depending on your system
- Factorio runs in headless mode during extraction
