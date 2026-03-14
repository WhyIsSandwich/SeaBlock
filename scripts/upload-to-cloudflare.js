#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'
import os from 'os'
import crypto from 'crypto'
import readline from 'readline'

const execAsync = promisify(exec)

// Configuration
const DEFAULT_GRAPHICS_SOURCE = './generated/data/dev'

const CONFIG = {
  // Source directory (WebP files in */graphics/* subdirs)
  sourceDir: path.resolve(process.cwd(), DEFAULT_GRAPHICS_SOURCE),

  // Cloudflare R2 configuration (will be set from console input)
  bucketName: null,
  accountId: null,
  accessKeyId: null,
  secretAccessKey: null,
  endpoint: null,

  // Upload configuration
  maxConcurrency: Math.min(os.cpus().length, 8),

  // Whether to overwrite existing files
  overwrite: false,

  // Whether to skip files that already exist
  skipExisting: true,

  // Progress reporting interval
  progressInterval: 50,

  // Retry configuration
  maxRetries: 3,
  retryDelay: 1000, // Base delay in ms
  retryBackoffMultiplier: 2,

  // Rate limiting configuration
  rateLimitDelay: 2000, // Delay when hitting rate limits
  adaptiveConcurrency: true, // Reduce concurrency on rate limits

  // Content type for WebP files
  contentType: 'image/webp',

  // Optional prefix for R2 keys (e.g. prod/abc123/)
  prefix: null
}

class CloudflareUploader {
  constructor(config = {}) {
    this.config = { ...CONFIG, ...config }
    this.stats = {
      total: 0,
      uploaded: 0,
      skipped: 0,
      errors: 0,
      retries: 0,
      rateLimited: 0,
      startTime: null,
      endTime: null
    }
    this.workers = []
    this.workQueue = []
    this.currentConcurrency = this.config.maxConcurrency
    this.rateLimitCount = 0
  }

  async checkDependencies() {
    console.log('✓ Using Cloudflare REST API (no additional dependencies required)')
  }

  async readSecret(prompt, hidden = true) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })

    return new Promise(resolve => {
      if (hidden) {
        // Hide input for secrets
        process.stdout.write(prompt)
        process.stdin.setRawMode(true)
        process.stdin.resume()
        process.stdin.setEncoding('utf8')

        let input = ''
        process.stdin.on('data', char => {
          char = char.toString()
          switch (char) {
            case '\n':
            case '\r':
            case '\u0004': // Ctrl+D
              process.stdin.setRawMode(false)
              process.stdin.pause()
              process.stdin.removeAllListeners('data')
              console.log('') // New line after hidden input
              resolve(input)
              break
            case '\u0003': // Ctrl+C
              process.exit(0)
              break
            case '\u007f': // Backspace
              if (input.length > 0) {
                input = input.slice(0, -1)
                process.stdout.write('\b \b')
              }
              break
            default:
              input += char
              process.stdout.write('*')
              break
          }
        })
      } else {
        // Show input for non-secrets
        rl.question(prompt, answer => {
          rl.close()
          resolve(answer.trim())
        })
      }
    })
  }

  async promptForCredentials(missingCredentials) {
    console.log('🔐 Please provide your Cloudflare R2 credentials:')
    console.log('')

    // Read non-secret values (can be shown) - only if missing
    if (!this.config.bucketName) {
      this.config.bucketName = await this.readSecret('Bucket name: ', false)
    }
    if (!this.config.accountId) {
      this.config.accountId = await this.readSecret('Account ID: ', false)
    }
    if (!this.config.endpoint) {
      this.config.endpoint = await this.readSecret(
        'Endpoint URL (or press Enter for default): ',
        false
      )
    }

    // Use default endpoint if not provided
    if (!this.config.endpoint) {
      this.config.endpoint = `https://${this.config.accountId}.r2.cloudflarestorage.com`
    }

    // Only prompt for secrets if they're missing
    if (!this.config.accessKeyId || !this.config.secretAccessKey) {
      console.log('')
      console.log('🔑 Please provide your R2 API credentials (input will be hidden):')

      if (!this.config.accessKeyId) {
        this.config.accessKeyId = await this.readSecret('Access Key ID: ', true)
      }
      if (!this.config.secretAccessKey) {
        this.config.secretAccessKey = await this.readSecret('Secret Access Key: ', true)
      }
    }

    console.log('')
    console.log('✓ Credentials configured')
  }

  async enumerateExistingFiles() {
    console.log('🔍 Enumerating existing files in bucket...')

    const existingEtags = new Map()
    let continuationToken = null
    let totalEnumerated = 0

    try {
      do {
        const uri = `/${this.config.bucketName}`
        const queryParams = new URLSearchParams()
        if (continuationToken) {
          queryParams.set('continuation-token', continuationToken)
        }
        queryParams.set('list-type', '2') // Use version 2 of the API
        if (this.config.prefix) {
          queryParams.set('prefix', this.config.prefix)
        }

        const fullUri = `${uri}?${queryParams.toString()}`
        const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')

        const headers = {
          Host: new URL(this.config.endpoint).host,
          'x-amz-date': timestamp
        }

        const signature = this.generateSignature('GET', fullUri, headers)
        headers['Authorization'] = signature

        const response = await fetch(`${this.config.endpoint}${fullUri}`, {
          method: 'GET',
          headers
        })

        if (!response.ok) {
          throw new Error(`Failed to enumerate bucket: ${response.status} ${response.statusText}`)
        }

        const xmlText = await response.text()
        const entries = this.parseListObjectsResponse(xmlText)

        for (const { key, etag } of entries) {
          existingEtags.set(key, etag)
          totalEnumerated++
        }

        // Check for continuation token
        const continuationMatch = xmlText.match(
          /<NextContinuationToken>([^<]+)<\/NextContinuationToken>/
        )
        continuationToken = continuationMatch ? continuationMatch[1] : null

        if (totalEnumerated % 1000 === 0) {
          console.log(`📊 Enumerated ${totalEnumerated} existing files...`)
        }
      } while (continuationToken)

      console.log(`✓ Found ${totalEnumerated} existing files in bucket`)
      return existingEtags
    } catch (error) {
      console.error('❌ Failed to enumerate existing files:', error.message)
      console.log('⚠️  Falling back to per-file existence checks')
      return null
    }
  }

  parseListObjectsResponse(xmlText) {
    const entries = []
    const contentsBlocks = xmlText.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)

    for (const match of contentsBlocks) {
      const block = match[1]
      const keyMatch = block.match(/<Key>([^<]+)<\/Key>/)
      const etagMatch = block.match(/<ETag>([^<]*)<\/ETag>/)
      if (keyMatch && etagMatch) {
        const etag = etagMatch[1].replace(/^"|"$/g, '') // Strip quotes from ETag
        entries.push({ key: keyMatch[1], etag })
      }
    }

    return entries
  }

  async findWebpFiles() {
    console.log('🔍 Scanning for WebP files in graphics directories...')

    const findCommand = `find "${this.config.sourceDir}" -path "*/graphics/*" -name "*.webp" -type f`
    const { stdout } = await execAsync(findCommand)

    const files = stdout
      .trim()
      .split('\n')
      .filter(file => file.length > 0)

    console.log(`📁 Found ${files.length} WebP files in graphics subdirectories`)
    return files
  }

  getRelativePath(absolutePath) {
    const base = path.relative(this.config.sourceDir, absolutePath)
    if (this.config.prefix) {
      return `${this.config.prefix}/${base}`.replace(/\/+/g, '/')
    }
    return base
  }

  getContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase()
    const types = {
      '.webp': 'image/webp',
      '.png': 'image/png',
      '.json': 'application/json'
    }
    return types[ext] ?? 'application/octet-stream'
  }

  // Generate AWS signature for S3-compatible API
  generateSignature(method, uri, headers, payload = '') {
    const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
    const date = timestamp.substr(0, 8)

    // Sort headers by key name (case-insensitive)
    const sortedHeaders = Object.keys(headers).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    )

    const canonicalRequest = [
      method,
      uri,
      '', // query string
      sortedHeaders.map(key => `${key.toLowerCase()}:${headers[key]}`).join('\n'),
      '', // empty line
      sortedHeaders.map(key => key.toLowerCase()).join(';'),
      crypto.createHash('sha256').update(payload).digest('hex')
    ].join('\n')

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      timestamp,
      `${date}/auto/s3/aws4_request`,
      crypto.createHash('sha256').update(canonicalRequest).digest('hex')
    ].join('\n')

    const signingKey = this.getSigningKey(date)
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex')

    return `AWS4-HMAC-SHA256 Credential=${this.config.accessKeyId}/${date}/auto/s3/aws4_request, SignedHeaders=${sortedHeaders
      .map(k => k.toLowerCase())
      .join(';')}, Signature=${signature}`
  }

  getSigningKey(date) {
    const kDate = crypto
      .createHmac('sha256', `AWS4${this.config.secretAccessKey}`)
      .update(date)
      .digest()
    const kRegion = crypto.createHmac('sha256', kDate).update('auto').digest()
    const kService = crypto.createHmac('sha256', kRegion).update('s3').digest()
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest()
    return kSigning
  }

  async shouldSkipUpload(key, fileContent) {
    if (this.config.overwrite || !this.config.skipExisting) {
      return false
    }

    const localMd5 = crypto.createHash('md5').update(fileContent).digest('hex')

    // Use enumerated ETags when available (no extra API calls)
    if (this.existingEtags) {
      const remoteEtag = this.existingEtags.get(key)
      if (remoteEtag && remoteEtag === localMd5) {
        return true
      }
      return false
    }

    // Fallback: HEAD request to get ETag when enumeration failed
    try {
      const uri = `/${this.config.bucketName}/${key}`
      const headers = {
        Host: new URL(this.config.endpoint).host,
        'x-amz-date': new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
      }

      const signature = this.generateSignature('HEAD', uri, headers)
      headers['Authorization'] = signature

      const response = await fetch(`${this.config.endpoint}${uri}`, {
        method: 'HEAD',
        headers
      })

      if (!response.ok) return false
      const remoteEtag = response.headers.get('etag')?.replace(/^"|"$/g, '')
      return remoteEtag === localMd5
    } catch (error) {
      return false
    }
  }

  async uploadFile(filePath, retryCount = 0) {
    const key = this.getRelativePath(filePath)

    try {
      // Read file content first (needed for MD5 comparison and upload)
      const fileContent = await fs.promises.readFile(filePath)

      // Content-aware skip: compare local MD5 with remote ETag
      if (await this.shouldSkipUpload(key, fileContent)) {
        return { success: true, webpPath: filePath, key, action: 'skipped' }
      }

      // Prepare upload
      const uri = `/${this.config.bucketName}/${key}`
      const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')

      const contentType = this.getContentType(filePath)
      const headers = {
        Host: new URL(this.config.endpoint).host,
        'Content-Type': contentType,
        'Content-Length': fileContent.length.toString(),
        'Cache-Control': 'public, max-age=31536000',
        'x-amz-date': timestamp,
        'x-amz-content-sha256': crypto.createHash('sha256').update(fileContent).digest('hex')
      }

      const signature = this.generateSignature('PUT', uri, headers, fileContent)
      headers['Authorization'] = signature

      // Upload to R2
      const response = await fetch(`${this.config.endpoint}${uri}`, {
        method: 'PUT',
        headers,
        body: fileContent
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')

        // Handle rate limiting
        if (response.status === 429 || response.status === 503) {
          this.stats.rateLimited++
          this.rateLimitCount++

          // Adaptive concurrency: reduce workers on rate limits
          if (this.config.adaptiveConcurrency && this.currentConcurrency > 1) {
            this.currentConcurrency = Math.max(1, Math.floor(this.currentConcurrency * 0.7))
            console.log(
              `🔄 Rate limited! Reducing concurrency to ${this.currentConcurrency} workers`
            )
          }

          // Retry with exponential backoff
          if (retryCount < this.config.maxRetries) {
            const delay =
              this.config.rateLimitDelay * Math.pow(this.config.retryBackoffMultiplier, retryCount)
            console.log(
              `⏳ Rate limited, retrying in ${delay}ms (attempt ${retryCount + 1}/${this.config.maxRetries})`
            )
            await new Promise(resolve => setTimeout(resolve, delay))
            this.stats.retries++
            return this.uploadFile(filePath, retryCount + 1)
          }
        }

        throw new Error(`Upload failed: ${response.status} ${response.statusText} - ${errorText}`)
      }

      return { success: true, webpPath: filePath, key, action: 'uploaded' }
    } catch (error) {
      // Retry on network errors or other transient issues
      if (retryCount < this.config.maxRetries && this.isRetryableError(error)) {
        const delay =
          this.config.retryDelay * Math.pow(this.config.retryBackoffMultiplier, retryCount)
        console.log(
          `🔄 Retrying ${filePath} in ${delay}ms (attempt ${retryCount + 1}/${this.config.maxRetries})`
        )
        await new Promise(resolve => setTimeout(resolve, delay))
        this.stats.retries++
        return this.uploadFile(filePath, retryCount + 1)
      }

      return { success: false, webpPath: filePath, key, error: error.message }
    }
  }

  isRetryableError(error) {
    const retryableErrors = [
      'ECONNRESET',
      'ENOTFOUND',
      'ECONNREFUSED',
      'ETIMEDOUT',
      'Network error',
      'fetch failed'
    ]

    return retryableErrors.some(err => error.message.includes(err))
  }

  async worker(workerId) {
    console.log(`🔧 Worker ${workerId} started`)

    while (true) {
      const webpPath = this.workQueue.shift()

      if (!webpPath) {
        break
      }

      try {
        const result = await this.uploadFile(webpPath)

        if (result.success) {
          if (result.action === 'uploaded') {
            this.stats.uploaded++
          } else if (result.action === 'skipped') {
            this.stats.skipped++
          }
        } else {
          this.stats.errors++
          console.error(`❌ Worker ${workerId} failed to upload ${webpPath}: ${result.error}`)
          console.error(`   Key: ${result.key}`)
          console.error(`   Full error details above`)
        }

        // Report progress
        const completed = this.stats.uploaded + this.stats.skipped + this.stats.errors
        if (completed % this.config.progressInterval === 0) {
          this.reportProgress()
        }
      } catch (error) {
        this.stats.errors++
        console.error(`❌ Worker ${workerId} error processing ${webpPath}:`, error.message)
      }
    }

    console.log(`🔧 Worker ${workerId} finished`)
  }

  async dispatchWorkers(files) {
    console.log(`🚀 Dispatching ${files.length} files to ${this.currentConcurrency} workers...`)

    this.workQueue = [...files]

    // Start heartbeat timer for periodic progress updates
    const heartbeatInterval = setInterval(() => {
      this.reportProgress()
    }, 10000)

    // Start workers with current concurrency
    const workerPromises = []
    for (let i = 0; i < this.currentConcurrency; i++) {
      workerPromises.push(this.worker(i + 1))
    }

    // Wait for all workers to complete
    await Promise.all(workerPromises)

    // Clear heartbeat timer
    clearInterval(heartbeatInterval)
  }

  reportProgress() {
    const elapsed = Date.now() - this.stats.startTime
    const completed = this.stats.uploaded + this.stats.skipped + this.stats.errors
    const rate = completed / (elapsed / 1000)
    const remaining = this.stats.total - completed
    const eta = remaining / rate
    const percentage = ((completed / this.stats.total) * 100).toFixed(1)

    console.log(
      `📊 Progress: ${this.stats.uploaded} uploaded, ${this.stats.skipped} skipped, ${this.stats.errors} errors, ${this.stats.retries} retries, ${this.stats.rateLimited} rate limited | ${percentage}% | Rate: ${rate.toFixed(1)} files/sec | ETA: ${Math.round(eta)}s | Workers: ${this.currentConcurrency} | Queue: ${this.workQueue.length} | Active: ${this.workQueue.length > 0 ? '🔄' : '✅'}`
    )
  }

  async upload(options = {}) {
    console.log('🚀 Starting Cloudflare R2 upload with worker-based high throughput...')

    this.stats.startTime = Date.now()

    // Check dependencies
    await this.checkDependencies()

    // Load credentials from env if not in config
    this.config.bucketName ??= process.env.R2_BUCKET
    this.config.accountId ??= process.env.R2_ACCOUNT_ID
    this.config.accessKeyId ??= process.env.R2_ACCESS_KEY_ID
    this.config.secretAccessKey ??= process.env.R2_SECRET_ACCESS_KEY
    this.config.endpoint ??= process.env.R2_ENDPOINT
    this.config.prefix ??= process.env.R2_PREFIX

    // Prompt for missing credentials only
    const missingCredentials = []
    if (!this.config.bucketName) missingCredentials.push('bucket name')
    if (!this.config.accountId) missingCredentials.push('account ID')
    if (!this.config.accessKeyId) missingCredentials.push('access key ID')
    if (!this.config.secretAccessKey) missingCredentials.push('secret access key')

    if (missingCredentials.length > 0) {
      console.log(`Missing credentials: ${missingCredentials.join(', ')}`)
      await this.promptForCredentials(missingCredentials)
    }

    const overwriteMode = this.config.overwrite
      ? 'FORCE OVERWRITE'
      : this.config.skipExisting
        ? 'SKIP EXISTING'
        : 'UPLOAD ALL'
    console.log(
      `⚙️  Configuration: Bucket=${this.config.bucketName}, Workers=${this.config.maxConcurrency}, Mode=${overwriteMode}`
    )

    // Enumerate existing files with ETags (unless overwrite mode)
    if (!this.config.overwrite && this.config.skipExisting) {
      this.existingEtags = await this.enumerateExistingFiles()
    }

    // Get file list: use provided files or find WebP files in graphics dirs
    const filesToUpload = options?.files ?? (await this.findWebpFiles())
    this.stats.total = filesToUpload.length

    if (this.stats.total === 0) {
      console.log('ℹ️  No files found to upload')
      return
    }

    // Dispatch files to workers
    await this.dispatchWorkers(filesToUpload)

    this.stats.endTime = Date.now()
    this.printSummary()
  }

  printSummary() {
    const duration = (this.stats.endTime - this.stats.startTime) / 1000
    const rate = this.stats.total / duration

    console.log('\n📈 Upload Summary:')
    console.log(`   Total files: ${this.stats.total}`)
    console.log(`   Uploaded: ${this.stats.uploaded}`)
    console.log(`   Skipped: ${this.stats.skipped}`)
    console.log(`   Errors: ${this.stats.errors}`)
    console.log(`   Retries: ${this.stats.retries}`)
    console.log(`   Rate limited: ${this.stats.rateLimited}`)
    console.log(`   Duration: ${duration.toFixed(1)}s`)
    console.log(`   Average rate: ${rate.toFixed(1)} files/sec`)
    console.log(`   Final workers: ${this.currentConcurrency}`)
    console.log(`   Bucket: ${this.config.bucketName}`)

    if (this.stats.errors > 0) {
      console.log(
        `\n⚠️  ${this.stats.errors} files failed to upload. Check the error messages above.`
      )
    }
  }
}

// CLI handling
async function main() {
  const args = process.argv.slice(2)
  const config = {}

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--bucket':
      case '-b':
        config.bucketName = args[++i]
        break
      case '--account-id':
      case '-a':
        config.accountId = args[++i]
        break
      case '--endpoint':
      case '-e':
        config.endpoint = args[++i]
        break
      case '--concurrency':
      case '-c':
        config.maxConcurrency = parseInt(args[++i])
        break
      case '--overwrite':
        config.overwrite = true
        config.skipExisting = false
        break
      case '--force':
        config.overwrite = true
        config.skipExisting = false
        break
      case '--no-skip':
        config.skipExisting = false
        break
      case '--prefix':
      case '-p':
        config.prefix = args[++i]
        break
      case '--source':
      case '-s':
        config.sourceDir = path.resolve(args[++i])
        break
      case '--help':
      case '-h':
        console.log(`
Cloudflare R2 Uploader - High Throughput WebP File Upload

Usage: node upload-to-cloudflare.js [options]

The script will prompt you for credentials interactively:
  - Non-secret values (bucket name, account ID, endpoint) are shown as you type
  - Secret values (access keys) are hidden for security

Options:
  -b, --bucket <name>           R2 bucket name (skip interactive prompt)
  -a, --account-id <id>         Cloudflare account ID (skip interactive prompt)
  -e, --endpoint <url>          R2 endpoint URL (skip interactive prompt)
  -p, --prefix <path>           R2 key prefix (e.g. prod/abc123/)
  -s, --source <path>           Source directory (default: generated/data/dev)
  -c, --concurrency <number>   Max parallel uploads (default: CPU count)
  --overwrite, --force          Overwrite existing files (force upload all)
  --no-skip                     Don't skip existing files (upload all, but don't force overwrite)
  -h, --help                    Show this help message

  Credentials can also be set via env: R2_BUCKET, R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_PREFIX

Examples:
  node upload-to-cloudflare.js
  node upload-to-cloudflare.js --bucket my-bucket --concurrency 8
  node upload-to-cloudflare.js --overwrite
  node upload-to-cloudflare.js --no-skip
  node upload-to-cloudflare.js --force

Security:
  - Access keys are read securely from console (hidden input)
  - No credentials are stored in environment variables or command history
  - Non-secret values can be provided via command line for automation

Note: This script uses the Cloudflare R2 REST API directly, no additional dependencies required.
        `)
        process.exit(0)
        break
    }
  }

  const uploader = new CloudflareUploader(config)
  await uploader.upload()
}

// Handle uncaught errors
process.on('uncaughtException', error => {
  console.error('💥 Uncaught exception:', error.message)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Fatal error:', error.message)
    process.exit(1)
  })
}

export default CloudflareUploader
