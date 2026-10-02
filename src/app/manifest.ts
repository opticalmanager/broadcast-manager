import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Broadcast Manager — WhatsApp CRM',
    short_name: 'Broadcast CRM',
    description:
      'Shared inbox, contacts, sales pipelines, and WhatsApp broadcast marketing.',
    start_url: '/',
    display: 'standalone',
    background_color: '#020617',
    theme_color: '#22c55e',
    orientation: 'any',
    categories: ['business', 'productivity', 'utilities'],
    icons: [
      {
        src: '/icons/icon-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icons/icon-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Shared Inbox',
        short_name: 'Inbox',
        description: 'View customer chats and conversations',
        url: '/inbox',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Broadcasts',
        short_name: 'Broadcasts',
        description: 'Manage WhatsApp campaigns and reports',
        url: '/broadcasts',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
      {
        name: 'Contacts',
        short_name: 'Contacts',
        description: 'Search and manage CRM contacts',
        url: '/contacts',
        icons: [{ src: '/icons/icon-192x192.png', sizes: '192x192' }],
      },
    ],
  };
}
