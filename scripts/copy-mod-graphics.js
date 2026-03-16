#!/usr/bin/env node

/**
 * Factorio Mod Graphics Copier
 *
 * Copies all PNG files from Factorio mods to generated/data/dev folder
 * following the __modname__ naming pattern. Served by Vite at /generated/data/dev in dev.
 *
 * Handles:
 * - Core game data (data/core => __core__, data/base => __base__)
 * - Specific mods (space-age, quality, elevated-rails)
 * - User mods from userdata or game folder (zip/folder extraction)
 * - Mod name extraction from info.json
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const DEFAULT_GRAPHICS_PATH = './generated/data/dev'

class ModGraphicsCopier {
  constructor() {
    this.config = {
      gameFolder: null,
      userFolder: null,
      graphicsPath: path.resolve(process.cwd(), DEFAULT_GRAPHICS_PATH)
    }
    this.processedMods = new Set()
    this.cliArgs = this.parseCommandLineArgs()
  }

  /**
   * Parse command line arguments
   */
  parseCommandLineArgs() {
    const args = process.argv.slice(2)
    const parsed = {
      gameFolder: null,
      userFolder: null,
      graphicsPath: path.resolve(process.cwd(), DEFAULT_GRAPHICS_PATH),
      help: false
    }

    for (let i = 0; i < args.length; i++) {
      const arg = args[i]
      switch (arg) {
        case '-g':
        case '--game-folder':
          parsed.gameFolder = args[++i]
          break
        case '-u':
        case '--user-folder':
          parsed.userFolder = args[++i]
          break
        case '-o':
        case '--output':
          parsed.graphicsPath = path.resolve(args[++i])
          break
        case '-h':
        case '--help':
          parsed.help = true
          break
      }
    }

    return parsed
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log('🎨 Factorio Mod Graphics Copier')
    console.log('================================')
    console.log('')
    console.log('Usage: node scripts/copy-mod-graphics.js [options]')
    console.log('')
    console.log('Options:')
    console.log('  -g, --game-folder PATH    Path to Factorio game folder')
    console.log('  -u, --user-folder PATH    Path to Factorio user folder (optional)')
    console.log(`  -o, --output PATH         Output directory (default: ${DEFAULT_GRAPHICS_PATH}, same as process-factorio-data)`)
    console.log('  -h, --help               Show this help message')
    console.log('')
    console.log('Examples:')
    console.log('  node scripts/copy-mod-graphics.js')
    console.log('  node scripts/copy-mod-graphics.js -g /path/to/factorio')
    console.log('  node scripts/copy-mod-graphics.js -g /factorio -o ./generated/graphics')
    console.log('')
  }

  /**
   * Main execution function
   */
  async run() {
    // Show help if requested
    if (this.cliArgs.help) {
      this.showHelp()
      return
    }

    // Apply CLI overrides
    if (this.cliArgs.graphicsPath) {
      this.config.graphicsPath = this.cliArgs.graphicsPath
    }

    // Validate required paths
    if (!this.cliArgs.gameFolder) {
      console.error('❌ Game folder path is required. Use -g or --game-folder option.')
      console.log('Use --help for more information.')
      process.exit(1)
    }

    if (!fs.existsSync(this.cliArgs.gameFolder)) {
      console.error(`❌ Game folder not found: ${this.cliArgs.gameFolder}`)
      process.exit(1)
    }

    // Set user folder to game folder if not provided
    if (!this.cliArgs.userFolder) {
      this.cliArgs.userFolder = this.cliArgs.gameFolder
    }

    if (!fs.existsSync(this.cliArgs.userFolder)) {
      console.error(`❌ User folder not found: ${this.cliArgs.userFolder}`)
      process.exit(1)
    }

    this.config.gameFolder = this.cliArgs.gameFolder
    this.config.userFolder = this.cliArgs.userFolder

    console.log('🎨 Factorio Mod Graphics Copier')
    console.log('================================')
    console.log('')
    console.log(`Game folder: ${this.config.gameFolder}`)
    console.log(`User folder: ${this.config.userFolder}`)
    console.log('')

    try {
      this.setupGraphicsDirectory()
      this.copyCoreGraphics()
      this.copySpecificMods()
      await this.copyUserMods()

      console.log('')
      console.log('✅ All graphics copied successfully!')
      console.log(`📁 Graphics saved to: ${this.config.graphicsPath}`)
      console.log('')
    } catch (error) {
      console.error('❌ Copying failed:', error.message)
      process.exit(1)
    }
  }

  /**
   * Setup graphics directory
   */
  setupGraphicsDirectory() {
    console.log('📁 Setting up graphics directory...')

    if (!fs.existsSync(this.config.graphicsPath)) {
      fs.mkdirSync(this.config.graphicsPath, { recursive: true })
    }

    console.log(`✅ Graphics directory ready: ${this.config.graphicsPath}`)
  }

  /**
   * Copy core graphics (data/core and data/base)
   */
  copyCoreGraphics() {
    console.log('')
    console.log('🎮 Copying core game graphics...')

    const coreMods = [
      { source: 'data/core', target: '__core__' },
      { source: 'data/base', target: '__base__' }
    ]

    for (const mod of coreMods) {
      const sourcePath = path.join(this.config.gameFolder, mod.source)
      const targetPath = path.join(this.config.graphicsPath, mod.target)

      if (fs.existsSync(sourcePath)) {
        console.log(`  📂 Copying ${mod.source} → ${mod.target}`)
        this.copyPngFiles(sourcePath, targetPath)
        this.processedMods.add(mod.target)
      } else {
        console.log(`  ⚠️  ${mod.source} not found, skipping`)
      }
    }
  }

  /**
   * Copy specific mods (space-age, quality, elevated-rails)
   */
  copySpecificMods() {
    console.log('')
    console.log('🔧 Copying specific mods...')

    const specificMods = ['space-age', 'quality', 'elevated-rails']

    for (const modName of specificMods) {
      const targetName = `__${modName}__`
      const sourcePath = path.join(this.config.gameFolder, 'data', modName)
      const targetPath = path.join(this.config.graphicsPath, targetName)

      if (fs.existsSync(sourcePath)) {
        console.log(`  📂 Copying ${modName} → ${targetName}`)
        this.copyPngFiles(sourcePath, targetPath)
        this.processedMods.add(targetName)
      } else {
        console.log(`  ⚠️  ${modName} not found, skipping`)
      }
    }
  }

  /**
   * Copy user mods
   */
  async copyUserMods() {
    console.log('')
    console.log('📦 Copying user mods...')

    const modsPath = path.join(this.config.userFolder, 'mods')

    if (!fs.existsSync(modsPath)) {
      console.log('  ⚠️  No mods folder found, skipping user mods')
      return
    }

    const modFiles = fs.readdirSync(modsPath)
    console.log(`  📁 Found ${modFiles.length} mod files`)

    for (const modFile of modFiles) {
      const modPath = path.join(modsPath, modFile)
      const stat = fs.statSync(modPath)

      if (stat.isFile() && modFile.endsWith('.zip')) {
        await this.handleZipMod(modPath)
      } else if (stat.isDirectory()) {
        await this.handleFolderMod(modPath)
      }
    }
  }

  /**
   * Handle zip mod file
   */
  async handleZipMod(zipPath) {
    const modName = await this.extractModNameFromZip(zipPath)
    if (!modName) {
      console.log(`  ⚠️  Could not extract mod name from ${path.basename(zipPath)}, skipping`)
      return
    }

    const targetName = `__${modName}__`
    const targetPath = path.join(this.config.graphicsPath, targetName)

    console.log(`  📦 Extracting ${path.basename(zipPath)} → ${targetName}`)

    try {
      // Create temporary directory for extraction
      const tempDir = path.join(this.config.graphicsPath, 'temp', modName)
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true })
      }
      fs.mkdirSync(tempDir, { recursive: true })

      // Extract zip file
      await this.extractZip(zipPath, tempDir)

      // Check if there's an extra folder level (common in mod ZIPs)
      const extractedItems = fs.readdirSync(tempDir, { withFileTypes: true })
      let sourceDir = tempDir

      if (extractedItems.length === 1 && extractedItems[0].isDirectory()) {
        // There's only one directory, likely the mod folder
        const subDir = path.join(tempDir, extractedItems[0].name)
        console.log(`    📁 Flattening directory structure: ${extractedItems[0].name}`)
        sourceDir = subDir
      }

      // Copy PNG files from extracted content
      this.copyPngFiles(sourceDir, targetPath)

      // Clean up temp directory
      fs.rmSync(tempDir, { recursive: true })

      this.processedMods.add(targetName)
    } catch (error) {
      console.log(`  ❌ Failed to extract ${path.basename(zipPath)}: ${error.message}`)
    }
  }

  /**
   * Handle folder mod
   */
  async handleFolderMod(folderPath) {
    const modName = await this.extractModNameFromFolder(folderPath)
    if (!modName) {
      console.log(`  ⚠️  Could not extract mod name from ${path.basename(folderPath)}, skipping`)
      return
    }

    const targetName = `__${modName}__`
    const targetPath = path.join(this.config.graphicsPath, targetName)

    console.log(`  📁 Copying ${path.basename(folderPath)} → ${targetName}`)
    this.copyPngFiles(folderPath, targetPath)
    this.processedMods.add(targetName)
  }

  /**
   * Extract mod name from zip file
   */
  async extractModNameFromZip(zipPath) {
    try {
      // Extract info.json from zip
      const tempDir = path.join(this.config.graphicsPath, 'temp', 'info')
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true })
      }
      fs.mkdirSync(tempDir, { recursive: true })

      // First, let's see what's actually in the ZIP file
      console.log(`    🔍 Inspecting ${path.basename(zipPath)}...`)

      // List contents of ZIP file
      try {
        await this.runCommand('unzip', ['-l', zipPath])
      } catch (listError) {
        console.log(
          `    ❌ Could not list contents of ${path.basename(zipPath)}: ${listError.message}`
        )
        fs.rmSync(tempDir, { recursive: true })
        return null
      }

      // Try to extract info.json - it might be in a subdirectory
      try {
        // First try direct extraction
        await this.runCommand('unzip', ['-j', zipPath, 'info.json', '-d', tempDir])
      } catch (directError) {
        console.log(`    🔍 info.json not in root, checking subdirectories...`)

        // Try extracting the entire ZIP to see the structure
        const fullTempDir = path.join(this.config.graphicsPath, 'temp', 'full-extract')
        if (fs.existsSync(fullTempDir)) {
          fs.rmSync(fullTempDir, { recursive: true })
        }
        fs.mkdirSync(fullTempDir, { recursive: true })

        try {
          await this.runCommand('unzip', [zipPath, '-d', fullTempDir])

          // Look for info.json in the extracted structure
          const findinfo = dir => {
            const items = fs.readdirSync(dir, { withFileTypes: true })
            for (const item of items) {
              const itemPath = path.join(dir, item.name)
              if (item.isDirectory()) {
                const found = findinfo(itemPath)
                if (found) return found
              } else if (item.name === 'info.json') {
                return itemPath
              }
            }
            return null
          }

          const infoPath = findinfo(fullTempDir)
          if (infoPath) {
            console.log(`    ✅ Found info.json at: ${path.relative(fullTempDir, infoPath)}`)
            const modName = this.parseInfo(infoPath)
            fs.rmSync(fullTempDir, { recursive: true })
            fs.rmSync(tempDir, { recursive: true })
            return modName
          } else {
            console.log(`    ❌ No info.json found in ${path.basename(zipPath)}`)
            fs.rmSync(fullTempDir, { recursive: true })
            fs.rmSync(tempDir, { recursive: true })
            return null
          }
        } catch (extractError) {
          console.log(`    ❌ Could not extract ${path.basename(zipPath)}: ${extractError.message}`)
          fs.rmSync(fullTempDir, { recursive: true })
          fs.rmSync(tempDir, { recursive: true })
          return null
        }
      }

      const infoPath = path.join(tempDir, 'info.json')
      if (fs.existsSync(infoPath)) {
        const modName = this.parseInfo(infoPath)
        fs.rmSync(tempDir, { recursive: true })
        return modName
      }

      fs.rmSync(tempDir, { recursive: true })
      return null
    } catch (error) {
      console.log(`    ❌ Error processing ${path.basename(zipPath)}: ${error.message}`)
      return null
    }
  }

  /**
   * Extract mod name from folder
   */
  extractModNameFromFolder(folderPath) {
    const infoPath = path.join(folderPath, 'info.json')
    if (fs.existsSync(infoPath)) {
      return this.parseInfo(infoPath)
    }
    return null
  }

  /**
   * Parse info.json to extract mod name
   */
  parseInfo(infoPath) {
    try {
      const content = fs.readFileSync(infoPath, 'utf8')
      const info = JSON.parse(content)
      return info.name || null
    } catch (error) {
      return null
    }
  }

  /**
   * Extract zip file
   */
  extractZip(zipPath, targetDir) {
    return new Promise((resolve, reject) => {
      const unzip = spawn('unzip', ['-q', zipPath, '-d', targetDir])

      unzip.on('close', code => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`unzip failed with code ${code}`))
        }
      })

      unzip.on('error', error => {
        reject(error)
      })
    })
  }

  /**
   * Copy PNG files from source to target directory
   */
  copyPngFiles(sourcePath, targetPath) {
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true })
    }

    const pngFiles = this.findPngFiles(sourcePath)

    for (const pngFile of pngFiles) {
      const relativePath = path.relative(sourcePath, pngFile)
      const targetFile = path.join(targetPath, relativePath)
      const targetDir = path.dirname(targetFile)

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true })
      }

      fs.copyFileSync(pngFile, targetFile)
    }

    console.log(`    ✅ Copied ${pngFiles.length} PNG files`)
  }

  /**
   * Find all PNG files recursively
   */
  findPngFiles(dir) {
    const pngFiles = []

    const scanDir = currentDir => {
      if (!fs.existsSync(currentDir)) return

      const items = fs.readdirSync(currentDir)

      for (const item of items) {
        const itemPath = path.join(currentDir, item)
        const stat = fs.statSync(itemPath)

        if (stat.isDirectory()) {
          scanDir(itemPath)
        } else if (item.toLowerCase().endsWith('.png')) {
          pngFiles.push(itemPath)
        }
      }
    }

    scanDir(dir)
    return pngFiles
  }

  /**
   * Run command and return promise
   */
  runCommand(command, args) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'pipe' // Capture output for debugging
      })

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', data => {
        stdout += data.toString()
      })

      child.stderr.on('data', data => {
        stderr += data.toString()
      })

      child.on('close', code => {
        if (code === 0) {
          resolve()
        } else {
          const errorMsg = `Command '${command} ${args.join(' ')}' failed with code ${code}`
          const outputMsg = stdout ? `\nSTDOUT: ${stdout}` : ''
          const errorMsg2 = stderr ? `\nSTDERR: ${stderr}` : ''
          reject(new Error(errorMsg + outputMsg + errorMsg2))
        }
      })

      child.on('error', error => {
        reject(error)
      })
    })
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  const copier = new ModGraphicsCopier()
  copier.run().catch(console.error)
}

export default ModGraphicsCopier
