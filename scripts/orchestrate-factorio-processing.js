#!/usr/bin/env node

/**
 * Factorio Data Processing Orchestrator
 *
 * Interactive script that guides users through the complete Factorio data processing pipeline.
 * Handles directory detection, path mapping, and execution of various processing steps.
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'
import readline from 'readline'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class FactorioProcessingOrchestrator {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    this.config = {
      gameFolder: null,
      userFolder: null,
      dataDumpsPath: './data-dumps',
      outputPath: './docs/public/data'
    }
  }

  /**
   * Main orchestration function
   */
  async run() {
    console.log('🎮 Factorio Data Processing Orchestrator')
    console.log('==========================================')
    console.log('')
    console.log('This script will guide you through processing Factorio data for SeaBlock.')
    console.log('It handles directory detection, path mapping, and execution of processing steps.')
    console.log('')
    console.log(
      '💡 Tip: You can always provide manual paths even if auto-detection finds your installation.'
    )
    console.log('')

    try {
      await this.detectFactorioInstallation()
      await this.selectProcessingSteps()
      await this.executeProcessingSteps()

      console.log('')
      console.log('✅ All processing steps completed successfully!')
      console.log('')
      console.log('Next steps:')
      console.log('- Check the generated files in docs/public/data/')
      console.log('- Run the development server to see the results')
      console.log('')
    } catch (error) {
      console.error('❌ Processing failed:', error.message)
      process.exit(1)
    } finally {
      this.rl.close()
    }
  }

  /**
   * Detect and configure Factorio installation
   */
  async detectFactorioInstallation() {
    console.log('🔍 Detecting Factorio Installation...')
    console.log('')

    // Check if we're running in a container
    const isContainer = this.detectContainerEnvironment()
    if (isContainer) {
      console.log('🐳 Container environment detected')
      console.log('')
      await this.handleContainerEnvironment()
      // Map directory structure for container environment
      this.mapDirectoryStructure()
      return
    }

    // Ask if user wants to skip auto-detection
    const skipAutoDetection = await this.askQuestion(
      'Skip auto-detection and provide path manually? (y/n): '
    )
    if (skipAutoDetection.toLowerCase() === 'y' || skipAutoDetection.toLowerCase() === 'yes') {
      console.log('')
      console.log('Please provide your Factorio installation path:')
      console.log('')
      console.log('Common locations:')
      console.log('- Windows Steam: C:\\Program Files (x86)\\Steam\\steamapps\\common\\Factorio\\')
      console.log('- Windows Standalone: C:\\Program Files\\Factorio\\')
      console.log('- Linux Steam: ~/.steam/steam/steamapps/common/Factorio/')
      console.log('- Linux Standalone: /opt/factorio/ or /usr/games/factorio/')
      console.log('- macOS Steam: ~/Library/Application Support/Steam/steamapps/common/Factorio/')
      console.log('')
      this.config.gameFolder = await this.askQuestion('Factorio game folder path: ')
    } else {
      // Try to auto-detect common installation paths
      const commonPaths = this.getCommonFactorioPaths()
      let detectedPath = null

      for (const testPath of commonPaths) {
        if (this.isValidFactorioPath(testPath)) {
          detectedPath = testPath
          break
        }
      }

      if (detectedPath) {
        console.log(`✅ Auto-detected Factorio installation: ${detectedPath}`)
        const useDetected = await this.askQuestion('Use this installation? (y/n): ')
        if (useDetected.toLowerCase() === 'y' || useDetected.toLowerCase() === 'yes') {
          this.config.gameFolder = detectedPath
        } else {
          console.log('')
          console.log('Please provide your Factorio installation path manually:')
          console.log('')
          console.log('Common locations:')
          console.log(
            '- Windows Steam: C:\\Program Files (x86)\\Steam\\steamapps\\common\\Factorio\\'
          )
          console.log('- Windows Standalone: C:\\Program Files\\Factorio\\')
          console.log('- Linux Steam: ~/.steam/steam/steamapps/common/Factorio/')
          console.log('- Linux Standalone: /opt/factorio/ or /usr/games/factorio/')
          console.log(
            '- macOS Steam: ~/Library/Application Support/Steam/steamapps/common/Factorio/'
          )
          console.log('')
          this.config.gameFolder = await this.askQuestion('Factorio game folder path: ')
        }
      } else {
        // No auto-detection, ask for manual input
        console.log('')
        console.log('No Factorio installation auto-detected.')
        console.log('Please provide your Factorio installation path:')
        console.log('')
        console.log('Common locations:')
        console.log(
          '- Windows Steam: C:\\Program Files (x86)\\Steam\\steamapps\\common\\Factorio\\'
        )
        console.log('- Windows Standalone: C:\\Program Files\\Factorio\\')
        console.log('- Linux Steam: ~/.steam/steam/steamapps/common/Factorio/')
        console.log('- Linux Standalone: /opt/factorio/ or /usr/games/factorio/')
        console.log('- macOS Steam: ~/Library/Application Support/Steam/steamapps/common/Factorio/')
        console.log('')

        this.config.gameFolder = await this.askQuestion('Factorio game folder path: ')
      }
    }

    // Validate the game folder
    if (!this.isValidFactorioPath(this.config.gameFolder)) {
      console.log('')
      console.log('❌ Invalid Factorio installation detected.')
      console.log(
        'Please check that the path is correct and contains a valid Factorio installation.'
      )
      console.log('')
      console.log('The path should contain:')
      console.log('- bin/x64/factorio.exe (or factorio on Linux/macOS)')
      console.log('- data/core/ directory')
      console.log('- data/base/ directory')
      console.log('')

      const retry = await this.askQuestion('Would you like to try a different path? (y/n): ')
      if (retry.toLowerCase() === 'y' || retry.toLowerCase() === 'yes') {
        console.log('')
        console.log('Please provide your Factorio installation path:')
        console.log('')
        console.log('Common locations:')
        console.log(
          '- Windows Steam: C:\\Program Files (x86)\\Steam\\steamapps\\common\\Factorio\\'
        )
        console.log('- Windows Standalone: C:\\Program Files\\Factorio\\')
        console.log('- Linux Steam: ~/.steam/steam/steamapps/common/Factorio/')
        console.log('- Linux Standalone: /opt/factorio/ or /usr/games/factorio/')
        console.log('- macOS Steam: ~/Library/Application Support/Steam/steamapps/common/Factorio/')
        console.log('')
        this.config.gameFolder = await this.askQuestion('Factorio game folder path: ')

        if (!this.isValidFactorioPath(this.config.gameFolder)) {
          throw new Error(`Invalid Factorio installation: ${this.config.gameFolder}`)
        }
      } else {
        throw new Error(`Invalid Factorio installation: ${this.config.gameFolder}`)
      }
    }

    console.log('')
    console.log('📁 Checking directory structure...')

    // Check if we have a separate user folder (common with Steam)
    const hasUserFolder = this.detectUserFolder()

    if (hasUserFolder) {
      console.log('')
      console.log('🔍 Detected separate user folder (common with Steam installations)')
      console.log('This is where your mods and script-output are stored.')
      console.log('')

      const userFolder = await this.askQuestion(
        'Factorio user folder path (or press Enter to skip): '
      )
      if (userFolder.trim()) {
        this.config.userFolder = userFolder.trim()
      }
    }

    // Map the directory structure
    this.mapDirectoryStructure()

    console.log('')
    console.log('✅ Directory structure configured:')
    console.log(`   Game folder: ${this.config.gameFolder}`)
    if (this.config.userFolder) {
      console.log(`   User folder: ${this.config.userFolder}`)
    }
    console.log(`   Data directory: ${this.config.dataDirectory}`)
    console.log(`   Mods directory: ${this.config.modsDirectory}`)
    console.log(`   Script output: ${this.config.scriptOutput}`)
    console.log('')
  }

  /**
   * Detect if we're running in a container environment
   */
  detectContainerEnvironment() {
    // Check for common container indicators
    const containerIndicators = [
      // Docker
      fs.existsSync('/.dockerenv'),
      // Kubernetes
      fs.existsSync('/var/run/secrets/kubernetes.io'),
      // Container runtime
      process.env.CONTAINER === 'true',
      // Docker environment variables
      process.env.DOCKER_CONTAINER === 'true',
      // Check for container-specific files
      fs.existsSync('/proc/1/cgroup') &&
        fs.readFileSync('/proc/1/cgroup', 'utf8').includes('docker'),
      // Check for container-specific environment variables
      process.env.HOSTNAME && process.env.HOSTNAME.includes('docker'),
      // Check for mounted volumes (common in containers)
      fs.existsSync('/workspaces') || fs.existsSync('/workspace')
    ]

    return containerIndicators.some(indicator => indicator === true)
  }

  /**
   * Handle container environment setup
   */
  async handleContainerEnvironment() {
    console.log('📋 Container Environment Setup')
    console.log('==============================')
    console.log('')
    console.log('You are running in a container environment.')
    console.log('To use Factorio data processing, you need to map your Factorio')
    console.log('installation files into the container.')
    console.log('')

    const showMappingGuide = await this.askQuestion('Show container mapping guide? (y/n): ')
    if (showMappingGuide.toLowerCase() === 'y' || showMappingGuide.toLowerCase() === 'yes') {
      this.showContainerMappingGuide()
    }

    console.log('')
    console.log('Please provide the paths to your Factorio files:')
    console.log('')

    // Ask for game folder
    this.config.gameFolder = await this.askQuestion(
      'Factorio game folder path (mapped into container): '
    )

    // Ask for user folder if needed
    const hasUserFolder = await this.askQuestion('Do you have a separate user folder? (y/n): ')
    if (hasUserFolder.toLowerCase() === 'y' || hasUserFolder.toLowerCase() === 'yes') {
      this.config.userFolder = await this.askQuestion(
        'Factorio user folder path (mapped into container): '
      )
    }

    // Validate paths
    if (!this.isValidFactorioPath(this.config.gameFolder)) {
      console.log('')
      console.log('❌ Invalid Factorio installation detected.')
      console.log('Please ensure you have properly mapped your Factorio files into the container.')
      console.log('')
      console.log('You can also try:')
      console.log('1. Check that the path is correct')
      console.log('2. Ensure the Factorio files are properly mounted')
      console.log('3. Verify the Factorio installation is complete')
      console.log('')

      const retry = await this.askQuestion('Would you like to try a different path? (y/n): ')
      if (retry.toLowerCase() === 'y' || retry.toLowerCase() === 'yes') {
        this.config.gameFolder = await this.askQuestion(
          'Factorio game folder path (mapped into container): '
        )

        if (!this.isValidFactorioPath(this.config.gameFolder)) {
          throw new Error(`Invalid Factorio installation: ${this.config.gameFolder}`)
        }
      } else {
        throw new Error(`Invalid Factorio installation: ${this.config.gameFolder}`)
      }
    }

    console.log('')
    console.log('✅ Container paths configured successfully!')
  }

  /**
   * Show container mapping guide
   */
  showContainerMappingGuide() {
    console.log('')
    console.log('🐳 Container Mapping Guide')
    console.log('==========================')
    console.log('')
    console.log('⚠️  IMPORTANT: Volume mounts must be configured when starting the container.')
    console.log('You cannot attach folders to an already running container.')
    console.log('')
    console.log('To map Factorio files into your container, you have several options:')
    console.log('')
    console.log('1. Docker Volume Mounts (when starting container):')
    console.log('   docker run -v /host/factorio:/container/factorio your-image')
    console.log('')
    console.log('2. Docker Compose (recommended):')
    console.log('   volumes:')
    console.log('     - /host/factorio:/container/factorio')
    console.log('     - /host/factorio-user:/container/factorio-user')
    console.log('')
    console.log('3. Development Container (VS Code):')
    console.log('   "mounts": [')
    console.log('     "source=/host/factorio,target=/container/factorio,type=bind"')
    console.log('   ]')
    console.log('')
    console.log('Required directories to map:')
    console.log('• Game folder: Contains bin/, data/, etc.')
    console.log('• User folder (if separate): Contains mods/, script-output/, etc.')
    console.log('')
    console.log('Example mapping:')
    console.log('• Host: C:\\Program Files\\Factorio\\')
    console.log('• Container: /workspaces/factorio/')
    console.log('')
    console.log('If your container is already running without the proper mounts:')
    console.log('')
    console.log('Option 1: Restart container with mounts')
    console.log('1. Stop the container')
    console.log('2. Restart it with the volume mounts')
    console.log('3. Then run this script again')
    console.log('')
    console.log('Option 2: Copy files to running container (no restart required)')
    console.log('')
    console.log('Find your container name first:')
    console.log('  docker ps --format "{{.Names}}"')
    console.log('')
    console.log('Then copy files using docker cp (replace CONTAINER_NAME and paths):')
    console.log('')
    console.log('For single Factorio installation:')
    console.log(
      '  docker cp "/home/[user]/Games/factorio-space-age/." CONTAINER_NAME:/workspaces/factorio/'
    )
    console.log('')
    console.log('For Steam installation (separate user folder):')
    console.log('  # Copy game files')
    console.log(
      '  docker cp "/home/[user]/.steam/steam/steamapps/common/Factorio/." CONTAINER_NAME:/workspaces/factorio-game/'
    )
    console.log('  # Copy user files')
    console.log(
      '  docker cp "/home/[user]/.steam/userdata/[USER_ID]/427520/remote/." CONTAINER_NAME:/workspaces/factorio-user/'
    )
    console.log('')
    console.log(
      'Files will be copied directly into your container and will be immediately visible.'
    )
    console.log('')
    console.log('After mapping, provide the container paths when prompted.')
    console.log('')
  }

  /**
   * Get common Factorio installation paths for auto-detection
   */
  getCommonFactorioPaths() {
    const paths = []

    // Windows paths
    if (process.platform === 'win32') {
      paths.push(
        'C:\\Program Files\\Factorio\\',
        'C:\\Program Files (x86)\\Factorio\\',
        'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Factorio\\',
        'C:\\Program Files\\Steam\\steamapps\\common\\Factorio\\'
      )
    }

    // Linux paths
    if (process.platform === 'linux') {
      const homeDir = process.env.HOME || process.env.USERPROFILE
      paths.push(
        '/opt/factorio/',
        '/usr/games/factorio/',
        '/usr/local/factorio/',
        `${homeDir}/.steam/steam/steamapps/common/Factorio/`,
        `${homeDir}/.local/share/Steam/steamapps/common/Factorio/`
      )
    }

    // macOS paths
    if (process.platform === 'darwin') {
      const homeDir = process.env.HOME || process.env.USERPROFILE
      paths.push(
        '/Applications/Factorio.app/Contents/',
        `${homeDir}/Library/Application Support/Steam/steamapps/common/Factorio/`
      )
    }

    return paths
  }

  /**
   * Check if a path contains a valid Factorio installation
   */
  isValidFactorioPath(factorioPath) {
    if (!factorioPath || !fs.existsSync(factorioPath)) {
      return false
    }

    // Check for executable
    const executableName = process.platform === 'win32' ? 'factorio.exe' : 'factorio'
    const executablePath = path.join(factorioPath, 'bin', 'x64', executableName)
    const altExecutablePath = path.join(factorioPath, executableName)

    if (!fs.existsSync(executablePath) && !fs.existsSync(altExecutablePath)) {
      return false
    }

    // Check for data directory
    const dataPath = path.join(factorioPath, 'data')
    if (!fs.existsSync(dataPath)) {
      return false
    }

    // Check for core and base directories
    const corePath = path.join(dataPath, 'core')
    const basePath = path.join(dataPath, 'base')

    return fs.existsSync(corePath) && fs.existsSync(basePath)
  }

  /**
   * Detect if there's a separate user folder
   */
  detectUserFolder() {
    // Check if mods directory exists in game folder
    const gameModsPath = path.join(this.config.gameFolder, 'mods')
    const hasGameMods = fs.existsSync(gameModsPath)

    // Check if script-output exists in game folder
    const gameScriptOutputPath = path.join(this.config.gameFolder, 'script-output')
    const hasGameScriptOutput = fs.existsSync(gameScriptOutputPath)

    // If both exist in game folder, probably no separate user folder
    if (hasGameMods && hasGameScriptOutput) {
      return false
    }

    // If neither exists, probably separate user folder
    if (!hasGameMods && !hasGameScriptOutput) {
      return true
    }

    // Mixed case - ask user
    console.log('🤔 Mixed directory structure detected.')
    console.log('Some folders are in the game directory, some might be elsewhere.')
    console.log('This is common with Steam installations where user data is stored separately.')

    return true
  }

  /**
   * Map directory structure based on detected folders
   */
  mapDirectoryStructure() {
    // Data directory is always in game folder
    this.config.dataDirectory = path.join(this.config.gameFolder, 'data')

    // Mods and script-output depend on whether we have a user folder
    if (this.config.userFolder) {
      this.config.modsDirectory = path.join(this.config.userFolder, 'mods')
      this.config.scriptOutput = path.join(this.config.userFolder, 'script-output')
    } else {
      this.config.modsDirectory = path.join(this.config.gameFolder, 'mods')
      this.config.scriptOutput = path.join(this.config.gameFolder, 'script-output')
    }

    // Ensure script-output directory exists
    if (!fs.existsSync(this.config.scriptOutput)) {
      fs.mkdirSync(this.config.scriptOutput, { recursive: true })
      console.log(`📁 Created script-output directory: ${this.config.scriptOutput}`)
    }
  }

  /**
   * Select which processing steps to run
   */
  async selectProcessingSteps() {
    console.log('🛠️  Available Processing Steps:')
    console.log('')
    console.log(
      '1. Extract Factorio Data (--dump-data, --dump-prototype-locale, --dump-icon-sprites)'
    )
    console.log('2. Process Raw Data (convert to JSON, generate spritemap, etc.)')
    console.log('3. Convert PNG to WebP (optimize animations)')
    console.log('4. All Steps (recommended for first run)')
    console.log('5. Custom selection')
    console.log('')

    const choice = await this.askQuestion('Select processing option (1-5): ')

    switch (choice) {
      case '1':
        this.selectedSteps = ['extract']
        break
      case '2':
        this.selectedSteps = ['process']
        break
      case '3':
        this.selectedSteps = ['convert']
        break
      case '4':
        this.selectedSteps = ['extract', 'process', 'convert']
        break
      case '5':
        this.selectedSteps = await this.selectCustomSteps()
        break
      default:
        throw new Error('Invalid selection')
    }

    console.log('')
    console.log(`✅ Selected steps: ${this.selectedSteps.join(', ')}`)
    console.log('')
  }

  /**
   * Select custom processing steps
   */
  async selectCustomSteps() {
    const steps = []

    const extract = await this.askQuestion('Extract Factorio data? (y/n): ')
    if (extract.toLowerCase() === 'y' || extract.toLowerCase() === 'yes') {
      steps.push('extract')
    }

    const process = await this.askQuestion('Process raw data? (y/n): ')
    if (process.toLowerCase() === 'y' || process.toLowerCase() === 'yes') {
      steps.push('process')
    }

    const convert = await this.askQuestion('Convert PNG to WebP? (y/n): ')
    if (convert.toLowerCase() === 'y' || convert.toLowerCase() === 'yes') {
      steps.push('convert')
    }

    if (steps.length === 0) {
      throw new Error('No processing steps selected')
    }

    return steps
  }

  /**
   * Execute the selected processing steps
   */
  async executeProcessingSteps() {
    // eslint-disable-next-line no-await-in-loop
    for (const step of this.selectedSteps) {
      console.log(`🚀 Executing step: ${step}`)
      console.log('')

      switch (step) {
        case 'extract':
          // eslint-disable-next-line no-await-in-loop
          await this.extractFactorioData()
          break
        case 'process':
          // eslint-disable-next-line no-await-in-loop
          await this.processRawData()
          break
        case 'convert':
          // eslint-disable-next-line no-await-in-loop
          await this.convertPNGToWebP()
          break
        default:
          console.log(`⚠️  Unknown step: ${step}`)
      }

      console.log('')
    }
  }

  /**
   * Extract data from Factorio
   */
  async extractFactorioData() {
    console.log('📤 Extracting data from Factorio...')

    const executableName = process.platform === 'win32' ? 'factorio.exe' : 'factorio'
    const executablePath = path.join(this.config.gameFolder, 'bin', 'x64', executableName)
    const altExecutablePath = path.join(this.config.gameFolder, executableName)
    const factorioExe = fs.existsSync(executablePath) ? executablePath : altExecutablePath

    const commands = [['--dump-data'], ['--dump-prototype-locale'], ['--dump-icon-sprites']]

    // eslint-disable-next-line no-await-in-loop
    for (const [index, args] of commands.entries()) {
      console.log(`   Running: ${factorioExe} ${args.join(' ')}`)

      try {
        // eslint-disable-next-line no-await-in-loop
        await this.runCommand(factorioExe, args)
        console.log(`   ✅ Command ${index + 1}/3 completed`)
      } catch (error) {
        console.error(`   ❌ Command ${index + 1}/3 failed:`, error.message)
        throw error
      }
    }

    // Copy files to data-dumps directory
    await this.copyExtractedFiles()
  }

  /**
   * Process raw data using process-factorio-data.js
   */
  async processRawData() {
    console.log('⚙️  Processing raw data...')

    const processorPath = path.join(__dirname, 'process-factorio-data.js')

    // Pass the detected script output path to the processor
    console.log(`   📁 Using script output path: ${this.config.scriptOutput}`)
    const args = [processorPath, '--script-output', this.config.scriptOutput]

    try {
      await this.runCommand('node', args)
      console.log('   ✅ Data processing completed')
    } catch (error) {
      console.error('   ❌ Data processing failed:', error.message)
      throw error
    }
  }

  /**
   * Convert PNG files to WebP
   */
  async convertPNGToWebP() {
    console.log('🖼️  Converting PNG to WebP...')

    const converterPath = path.join(__dirname, 'convert-png-to-webp.js')

    try {
      await this.runCommand('node', [converterPath])
      console.log('   ✅ PNG to WebP conversion completed')
    } catch (error) {
      console.error('   ❌ PNG to WebP conversion failed:', error.message)
      throw error
    }
  }

  /**
   * Copy extracted files to data-dumps directory
   */
  async copyExtractedFiles() {
    console.log('📋 Copying extracted files...')

    // Ensure data-dumps directory exists
    if (!fs.existsSync(this.config.dataDumpsPath)) {
      fs.mkdirSync(this.config.dataDumpsPath, { recursive: true })
    }

    // Copy files from script-output to data-dumps
    const filesToCopy = ['data-raw-dump.json', 'prototype-locale', 'icon-sprites']

    // eslint-disable-next-line no-await-in-loop
    for (const file of filesToCopy) {
      const sourcePath = path.join(this.config.scriptOutput, file)
      const destPath = path.join(this.config.dataDumpsPath, file)

      if (fs.existsSync(sourcePath)) {
        if (fs.statSync(sourcePath).isDirectory()) {
          // eslint-disable-next-line no-await-in-loop
          await this.copyDirectory(sourcePath, destPath)
        } else {
          fs.copyFileSync(sourcePath, destPath)
        }
        console.log(`   ✅ Copied ${file}`)
      } else {
        console.log(`   ⚠️  ${file} not found in script-output`)
      }
    }
  }

  /**
   * Copy directory recursively
   */
  async copyDirectory(source, dest) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true })
    }

    const entries = fs.readdirSync(source, { withFileTypes: true })

    // eslint-disable-next-line no-await-in-loop
    for (const entry of entries) {
      const sourcePath = path.join(source, entry.name)
      const destPath = path.join(dest, entry.name)

      if (entry.isDirectory()) {
        // eslint-disable-next-line no-await-in-loop
        await this.copyDirectory(sourcePath, destPath)
      } else {
        fs.copyFileSync(sourcePath, destPath)
      }
    }
  }

  /**
   * Run a command and wait for completion
   */
  runCommand(command, args = []) {
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        stdio: 'inherit',
        shell: process.platform === 'win32'
      })

      child.on('close', code => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`Command failed with exit code ${code}`))
        }
      })

      child.on('error', error => {
        reject(error)
      })
    })
  }

  /**
   * Ask a question and return the answer
   */
  askQuestion(question) {
    return new Promise(resolve => {
      this.rl.question(question, answer => {
        resolve(answer)
      })
    })
  }
}

// Run the orchestrator if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const orchestrator = new FactorioProcessingOrchestrator()
  orchestrator.run()
}

export default FactorioProcessingOrchestrator
