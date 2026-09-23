#!/usr/bin/env node

import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'

const LINE_API_BASE = 'https://api.line.me/v2/bot'
const LINE_DATA_API_BASE = 'https://api-data.line.me/v2/bot'
const RICH_MENU_WIDTH = 2500
const RICH_MENU_HEIGHT = 843

function loadEnvFile(filePath) {
  return readFile(filePath, 'utf8')
    .then((content) => {
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const index = trimmed.indexOf('=')
        if (index === -1) continue
        const key = trimmed.slice(0, index).trim()
        let value = trimmed.slice(index + 1).trim()
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1)
        }
        if (key && process.env[key] == null) process.env[key] = value
      }
    })
    .catch(() => undefined)
}

function argValue(name) {
  const prefix = `${name}=`
  const exactIndex = process.argv.indexOf(name)
  if (exactIndex !== -1) return process.argv[exactIndex + 1]
  const matched = process.argv.find((arg) => arg.startsWith(prefix))
  return matched ? matched.slice(prefix.length) : undefined
}

function hasFlag(name) {
  return process.argv.includes(name)
}

function cleanUrl(value) {
  return value?.trim().replace(/\/$/, '')
}

function assertPublicUrl(url, label) {
  const parsed = new URL(url)
  const localHosts = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1'])
  if (localHosts.has(parsed.hostname) && !hasFlag('--allow-localhost')) {
    throw new Error(
      `${label} is localhost. LINE mobile users cannot open it. Use a deployed URL or pass --allow-localhost for UI-only testing.`
    )
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`${label} must be http or https.`)
  }
}

async function lineFetch(pathname, init = {}) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN is missing.')

  const response = await fetch(`${LINE_API_BASE}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`LINE API failed ${response.status}: ${text}`)
  }
  return text ? JSON.parse(text) : null
}

async function uploadRichMenuImage(richMenuId, imagePath) {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) throw new Error('LINE_CHANNEL_ACCESS_TOKEN is missing.')

  const image = await readFile(imagePath)
  const response = await fetch(`${LINE_DATA_API_BASE}/richmenu/${richMenuId}/content`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'image/png',
    },
    body: image,
  })
  const text = await response.text()
  if (!response.ok) {
    throw new Error(`LINE image upload failed ${response.status}: ${text}`)
  }
}

function appEntryUrl(appUrl, trainerId, nextPath) {
  const params = new URLSearchParams({
    trainer_id: trainerId,
    next: nextPath,
  })
  return `${appUrl}/api/line/app/start?${params.toString()}`
}

function withTrainerFallback(url, trainerId) {
  if (!trainerId) return url
  const parsed = new URL(url)
  parsed.searchParams.set('trainer_id', trainerId)
  return parsed.toString()
}

function buildRichMenuBody({ appUrl, bookingUrl, trainerId }) {
  const columnWidth = RICH_MENU_WIDTH / 4
  const ticketsUrl = trainerId
    ? appEntryUrl(appUrl, trainerId, '/customer/app/tickets')
    : withTrainerFallback(`${appUrl}/customer/app/tickets`, trainerId)
  const bookingsUrl = trainerId
    ? appEntryUrl(appUrl, trainerId, '/customer/app/bookings')
    : withTrainerFallback(`${appUrl}/customer/app/bookings`, trainerId)
  const areas = [
    {
      bounds: { x: 0, y: 0, width: columnWidth, height: RICH_MENU_HEIGHT },
      action: { type: 'uri', label: '予約する', uri: bookingUrl },
    },
    {
      bounds: { x: columnWidth, y: 0, width: columnWidth, height: RICH_MENU_HEIGHT },
      action: { type: 'uri', label: 'チケット', uri: ticketsUrl },
    },
    {
      bounds: { x: columnWidth * 2, y: 0, width: columnWidth, height: RICH_MENU_HEIGHT },
      action: { type: 'uri', label: '次回予約', uri: bookingsUrl },
    },
    {
      bounds: { x: columnWidth * 3, y: 0, width: columnWidth, height: RICH_MENU_HEIGHT },
      action: { type: 'message', label: '相談する', text: 'トレーナーに相談したいです。' },
    },
  ]

  return {
    size: { width: RICH_MENU_WIDTH, height: RICH_MENU_HEIGHT },
    selected: true,
    name: 'Limitless App main menu',
    chatBarText: 'メニュー',
    areas,
  }
}

async function main() {
  await loadEnvFile(path.resolve(process.cwd(), '.env.local'))

  const appUrl = cleanUrl(argValue('--app-url') ?? process.env.NEXT_PUBLIC_APP_URL)
  const trainerId = argValue('--trainer-id') ?? process.env.LINE_RICH_MENU_TRAINER_ID
  const bookingUrl = cleanUrl(
    argValue('--booking-url') ??
      process.env.LINE_RICH_MENU_BOOKING_URL ??
      (trainerId
        ? appEntryUrl(appUrl, trainerId, '/customer/app/bookings')
        : `${appUrl}/customer/app/bookings`)
  )
  const imagePath = path.resolve(
    process.cwd(),
    argValue('--image') ?? process.env.LINE_RICH_MENU_IMAGE_PATH ?? 'public/line-rich-menu.png'
  )

  if (!appUrl) throw new Error('Set --app-url or NEXT_PUBLIC_APP_URL.')
  if (!bookingUrl) {
    throw new Error('Set --booking-url, LINE_RICH_MENU_BOOKING_URL, --trainer-id, or LINE_RICH_MENU_TRAINER_ID.')
  }
  assertPublicUrl(appUrl, 'appUrl')
  assertPublicUrl(bookingUrl, 'bookingUrl')

  const imageStat = await stat(imagePath)
  if (imageStat.size > 1024 * 1024) {
    throw new Error(`Rich menu image must be <= 1MB. Current size: ${imageStat.size} bytes.`)
  }

  const body = buildRichMenuBody({ appUrl, bookingUrl, trainerId })
  const created = await lineFetch('/richmenu', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const richMenuId = created.richMenuId
  await uploadRichMenuImage(richMenuId, imagePath)
  await lineFetch(`/user/all/richmenu/${richMenuId}`, { method: 'POST' })

  console.log(`LINE rich menu is ready: ${richMenuId}`)
  console.log(`Booking URL: ${bookingUrl}`)
  console.log(`App URL: ${appUrl}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
