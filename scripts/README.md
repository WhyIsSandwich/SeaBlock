# Factorio Data Processing Scripts

This directory contains cross-platform scripts to extract, process, and optimize Factorio data for the SeaBlock project.

## 🎯 Quick Start (Recommended)

**`orchestrate-factorio-processing.js`** - Interactive orchestration script that guides you through the entire process:

```bash
node scripts/orchestrate-factorio-processing.js
```

This script will:

- Auto-detect your Factorio installation
- Guide you through directory mapping
- Let you select which processing steps to run
- Execute everything automatically

## Available Scripts

### Main Processing Scripts

- **`orchestrate-factorio-processing.js`** - Interactive orchestration script (recommended)
- **`process-factorio-data.js`** - Core data processing engine
- **`convert-png-to-webp.js`** - PNG to WebP conversion for animations

### Data Extraction Scripts

#### Linux/macOS/Git Bash

- **`extract-factorio-data.sh`** - Bash script for Unix-like systems

#### Windows

- **`extract-factorio-data.cmd`** - Batch script for Windows Command Prompt
- **`extract-factorio-data.ps1`** - PowerShell script for Windows (recommended)

## Usage

### Orchestration Script (Recommended)

The orchestration script provides an interactive experience:

```bash
node scripts/orchestrate-factorio-processing.js
```

**Features:**

- Auto-detects Factorio installation paths
- Handles both standard and Steam installations
- Maps user vs game directories automatically
- Interactive step selection
- Comprehensive error handling

**Processing Steps:**

1. **Extract Factorio Data** - Runs Factorio data extraction commands
2. **Process Raw Data** - Converts raw data to structured JSON
3. **Convert PNG to WebP** - Optimizes animation files
4. **All Steps** - Runs complete pipeline (recommended)

### Individual Scripts

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

The orchestration script automatically handles different Factorio installation types:

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

The script automatically detects your setup and maps directories accordingly.

## What the Scripts Do

### Orchestration Script

1. **Auto-detect Factorio installation** - Searches common installation paths
2. **Map directory structure** - Handles user vs game folder separation
3. **Interactive step selection** - Choose which processing steps to run
4. **Execute processing pipeline** - Runs selected steps automatically

### Data Extraction Scripts

1. **Auto-detect Factorio installation** - Searches common installation paths
2. **Prompt for missing information** - Asks for Factorio path and language codes if not provided
3. **Run Factorio data extraction sequentially** - Executes three separate Factorio commands:
   - `--dump-data` - Exports data.raw as JSON
   - `--dump-prototype-locale` - Exports prototype names and descriptions
   - `--dump-icon-sprites` - Exports all icon sprites as PNG files
4. **Find output** - Locates Factorio's script output folder
5. **Report results** - Shows extracted files and directory size

## Output

The scripts copy files directly to the `data-dumps/` folder:

```
data-dumps/
├── data.raw.json
├── prototype-locale/
│   ├── en.cfg
│   ├── de.cfg
│   └── ...
└── icon-sprites/
    ├── item/
    ├── entity/
    └── ...
```

**Note:** Factorio outputs to its default `script-output` folder, then the scripts copy the files to the `data-dumps/` directory for better file management.

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
