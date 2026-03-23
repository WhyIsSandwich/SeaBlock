// VitePress configuration data
// This file contains the actual configuration that can be imported by both
// the main config.js and the browser bundle

export const configData = {
  title: 'SeaBlock Wiki',
  description: 'The comprehensive guide to SeaBlock mod for Factorio',

  // GitHub Pages configuration
  base: '/SeaBlock/',

  // Head configuration
  head: [['link', { rel: 'icon', href: 'favicon.ico' }]],

  // Theme configuration
  themeConfig: {
    logo: '/seablock-header.jpg',
    // GitHub repository
    repo: 'modded-factorio/seablock',
    repoLabel: 'GitHub',

    // Navigation
    // Governance docs are internal-only unless explicitly enabled via env.
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Getting Started', link: '/getting-started/' },
      { text: 'Guides', link: '/guides/' },
      { text: 'Reference', link: '/reference/' },
      { text: 'Troubleshooting', link: '/troubleshooting/' },
      { text: 'Community', link: '/community/' }
    ],

    // Sidebar hardcoded here for the editor
    sidebar: {
      '/getting-started/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/getting-started/' },
            { text: 'Installation', link: '/getting-started/installation' },
            { text: 'First Steps', link: '/getting-started/first-steps' }
          ]
        }
      ],
      '/guides/': [
        {
          text: 'Guides',
          items: [
            { text: 'Overview', link: '/guides/' },
            { text: 'Early Game', link: '/guides/early-game' },
            { text: 'Mid Game', link: '/guides/mid-game' },
            { text: 'Late Game', link: '/guides/late-game' }
          ]
        }
      ],
      '/reference/': [
        {
          text: 'Reference',
          items: [
            { text: 'Overview', link: '/reference/' },
            { text: 'Factoriopedia', link: '/reference/factoriopedia' },
            { text: 'Research Map', link: '/reference/research-map' },
            { text: 'Recipes', link: '/reference/recipes' },
            { text: 'Technologies', link: '/reference/technologies' },
            { text: 'Items', link: '/reference/items' },
            { text: 'Significant Changes 2.0', link: '/reference/significant-changes-2-0' },
            { text: 'FAQ and Short Notes', link: '/reference/faq-short-notes' },
            { text: 'Compatible Mods', link: '/reference/compatible-mods' },
            { text: 'Calculators and Planners', link: '/reference/calculators-and-planners' },
            { text: 'Migration 1.1 to 2.0', link: '/reference/migration-1.1-to-2.0' },
            { text: 'Roadmaps and Planning (Track A)', link: '/reference/roadmaps-and-planning' },
            { text: 'Wiki Roadmap (Consumers and Maintainers)', link: '/reference/wiki-roadmap-consumers-maintainers' },
            { text: 'Wiki Issues (Consumers and Maintainers)', link: '/reference/wiki-issues-consumers-maintainers' },
            { text: 'Wiki TODO and Wanted Pages', link: '/reference/wiki-todo-and-wanted-pages' }
          ]
        }
      ],
      '/troubleshooting/': [
        {
          text: 'Troubleshooting',
          items: [
            { text: 'Overview', link: '/troubleshooting/' },
            { text: 'Install and Version Mismatch', link: '/troubleshooting/install-and-version-mismatch' },
            { text: 'Missing Recipe and Mod Settings', link: '/troubleshooting/missing-recipe-and-mod-settings' },
            { text: 'Map Generation and Ocean Issues', link: '/troubleshooting/map-generation-and-ocean-issues' }
          ]
        }
      ],
      '/community/': [
        {
          text: 'Community',
          items: [
            { text: 'Overview', link: '/community/' },
            { text: 'Factory Tours', link: '/community/factory-tours' }
          ]
        }
      ]
    },

    // Social links
    socialLinks: [
      { icon: 'github', link: 'https://github.com/modded-factorio/SeaBlock' },
      { icon: 'reddit', link: 'https://www.reddit.com/r/SeaBlock' },
      { icon: 'discord', link: 'https://discord.com/invite/zq63yqp' }
    ],

    // Footer
    footer: {
      message: 'Built with VitePress and ❤️ for the SeaBlock community',
      copyright: 'Copyright © 2025 SeaBlock Wiki'
    },

    // Search
    search: {
      provider: 'local'
    },

    // Edit link
    editLink: {
      pattern: 'https://github.com/modded-factorio/SeaBlock/new/wiki/?filename=:path',
      text: 'Edit this page on GitHub'
    },

    // Last updated
    lastUpdated: {
      text: 'Last updated',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'medium'
      }
    }
  },

  // Markdown configuration
  markdown: {
    lineNumbers: true,
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    }
  },

  // Build configuration
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },

  // Ignore dead links for development
  ignoreDeadLinks: true,

  // Development server
  server: {
    port: 5173,
    host: '0.0.0.0' // Required for devcontainer access
  },

  // Preview server
  preview: {
    port: 4173,
    host: '0.0.0.0' // Required for devcontainer access
  }
}
