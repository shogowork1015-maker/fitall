// 画面見本の共通部品を差し込む（ステータスバー・下部タブ・記号）
const ICON = {
  gear: '<svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.8 1.2V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-2.8-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.6 1.6 0 0 0 3 14H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.6 1.6 0 0 0 10 4.1V4a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.8 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1A1.6 1.6 0 0 0 21 10h.1a2 2 0 1 1 0 4H21a1.6 1.6 0 0 0-1.6 1Z"/></svg>',
  plus: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 4.5v15M4.5 12h15"/></svg>',
  search: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  back: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 4.5 7.5 12l7.5 7.5"/></svg>',
  chev: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>',
  copy: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="3"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
  link: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>',
}

const TABS = {
  trainer: [
    ['ホーム', '<path d="M3.5 10.2 12 3.5l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-5.6H9.2v5.6H5A1.5 1.5 0 0 1 3.5 19Z" STYLE/>'],
    ['予約', '<rect x="3" y="4.5" width="18" height="16.5" rx="3.5" STYLE/><path d="M8 2.5v4M16 2.5v4" fill="none" stroke="currentColor"/><path d="M3 9.5h18" fill="none" stroke="LINE"/>'],
    ['お客様', '<circle cx="9" cy="8" r="3.6" STYLE/><path d="M2.5 20c0-3.6 2.9-6.2 6.5-6.2s6.5 2.6 6.5 6.2Z" STYLE/><path d="M15.5 4.7a3.4 3.4 0 0 1 0 6.6M17.5 13.9c2.4.6 4 2.9 4 6.1" fill="none" stroke="currentColor"/>'],
    ['売上', '<rect x="3.5" y="12" width="4" height="8.5" rx="1.2" STYLE/><rect x="10" y="7.5" width="4" height="13" rx="1.2" STYLE/><rect x="16.5" y="3.5" width="4" height="17" rx="1.2" STYLE/>'],
    ['招待', '<path d="M21 3 3.5 10.4l7 2.6 2.6 7Z" STYLE/><path d="M21 3 10.5 13" fill="none" stroke="LINE"/>'],
  ],
  customer: [
    ['ホーム', '<path d="M3.5 10.2 12 3.5l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-5.6H9.2v5.6H5A1.5 1.5 0 0 1 3.5 19Z" STYLE/>'],
    ['予約', '<rect x="3" y="4.5" width="18" height="16.5" rx="3.5" STYLE/><path d="M8 2.5v4M16 2.5v4" fill="none" stroke="currentColor"/><path d="M3 9.5h18" fill="none" stroke="LINE"/>'],
    ['チケット', '<path d="M3.5 7.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v2.6a2 2 0 0 0 0 3.8v2.6a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2v-2.6a2 2 0 0 0 0-3.8Z" STYLE/><path d="M14.5 6v2M14.5 11v2M14.5 16v2" fill="none" stroke="LINE"/>'],
    ['マイページ', '<circle cx="12" cy="8" r="4" STYLE/><path d="M4.5 20.5c0-4 3.4-6.8 7.5-6.8s7.5 2.8 7.5 6.8Z" STYLE/>'],
  ],
}

const STATUS = `<div class="island"></div><div class="status"><span>9:41</span><span class="r">
<svg width="18" height="12" viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5" width="3" height="7" rx="1"/><rect x="10" y="2.5" width="3" height="9.5" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>
<svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor"><path d="M8 11.5 5.7 9a3.2 3.2 0 0 1 4.6 0Z"/><path d="M3.4 6.7a6.6 6.6 0 0 1 9.2 0l-1.5 1.5a4.5 4.5 0 0 0-6.2 0Z"/><path d="M1 4.3a10 10 0 0 1 14 0l-1.5 1.5a7.9 7.9 0 0 0-11 0Z"/></svg>
<svg width="27" height="13" viewBox="0 0 27 13" fill="currentColor"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2"/><rect x="24.5" y="4.5" width="1.6" height="4" rx=".8" opacity=".4"/></svg>
</span></div>`

for (const phone of document.querySelectorAll('.phone')) {
  phone.insertAdjacentHTML('afterbegin', STATUS)
  const kind = phone.dataset.tabs
  if (kind) {
    const active = Number(phone.dataset.tab ?? -1)
    const tabs = TABS[kind]
    const html = tabs.map(([label, svg], i) => {
      const on = i === active
      const body = svg.replaceAll('STYLE', on ? 'fill="currentColor" stroke="currentColor"' : 'fill="none" stroke="currentColor"').replaceAll('LINE', on ? '#fff' : 'currentColor')
      return `<div class="tab${on ? ' on' : ''}"><svg width="27" height="27" viewBox="0 0 24 24" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${body}</svg>${label}</div>`
    }).join('')
    phone.insertAdjacentHTML('beforeend', `<div class="tabbar" style="grid-template-columns:repeat(${tabs.length},1fr)">${html}</div>`)
  }
  phone.insertAdjacentHTML('beforeend', '<div class="homebar"></div>')
}
for (const el of document.querySelectorAll('[data-i]')) el.innerHTML = ICON[el.dataset.i]

// ?only=key でその画面だけを枠なしで表示する（1枚ずつ書き出す用）
const only = new URLSearchParams(location.search).get('only')
if (only) {
  document.body.classList.add('only')
  document.querySelector(`.col[data-k="${only}"]`)?.classList.add('show')
}
