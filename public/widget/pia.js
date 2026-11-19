;(function () {
  'use strict'

  // ── CONFIG ──────────────────────────────────────────────────────────────────
  var CONFIG = {
    supabaseUrl:    window.TST_SUPABASE_URL    || 'https://YOUR_PROJECT.supabase.co',
    teaserEndpoint: '/functions/v1/teaser',
    unlockEndpoint: '/functions/v1/unlock',
    anonKey:        window.TST_ANON_KEY        || 'YOUR_SUPABASE_ANON_KEY',
    calendarLink:   window.TST_CALENDAR_LINK   || 'https://link.your-calendar.com',
    brandColor:     window.TST_BRAND_COLOR     || '#1e3a5f',
    accentColor:    window.TST_ACCENT_COLOR    || '#f97316',
  }

  var PRACTICE_AREAS = [
    'Auto Accident',
    'Slip & Fall',
    'Medical Malpractice',
    'Workers\' Compensation',
    'General Personal Injury',
  ]

  // ── STYLES ──────────────────────────────────────────────────────────────────
  var css = `
    #tst-widget * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    #tst-widget { max-width: 680px; margin: 0 auto; }

    .tst-card {
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.10);
      overflow: hidden;
    }
    .tst-header {
      background: ${CONFIG.brandColor};
      color: #fff;
      padding: 28px 32px 20px;
    }
    .tst-header h2 { margin: 0 0 6px; font-size: 22px; font-weight: 700; }
    .tst-header p  { margin: 0; font-size: 14px; opacity: 0.8; }
    .tst-body { padding: 28px 32px; }

    .tst-field { margin-bottom: 16px; }
    .tst-field label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 6px; }
    .tst-field select,
    .tst-field input {
      width: 100%;
      padding: 11px 14px;
      border: 1.5px solid #d1d5db;
      border-radius: 8px;
      font-size: 15px;
      color: #111827;
      outline: none;
      transition: border-color 0.15s;
    }
    .tst-field select:focus,
    .tst-field input:focus { border-color: ${CONFIG.brandColor}; }

    .tst-row { display: flex; gap: 12px; }
    .tst-row .tst-field { flex: 1; }

    .tst-btn {
      display: block;
      width: 100%;
      padding: 14px;
      background: ${CONFIG.accentColor};
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      transition: opacity 0.15s, transform 0.1s;
      letter-spacing: 0.01em;
    }
    .tst-btn:hover  { opacity: 0.92; }
    .tst-btn:active { transform: scale(0.99); }
    .tst-btn:disabled { opacity: 0.55; cursor: not-allowed; }

    #tst-widget *:focus { outline: none; }
    #tst-widget *:focus-visible {
      outline: 3px solid ${CONFIG.accentColor};
      outline-offset: 2px;
      border-radius: 4px;
    }
    #tst-widget input[type="text"]:focus-visible,
    #tst-widget input[type="email"]:focus-visible {
      border-color: ${CONFIG.brandColor};
      box-shadow: 0 0 0 3px rgba(30,58,95,0.15);
      outline: none;
    }
    #tst-widget input[type="checkbox"]:focus-visible {
      outline: 3px solid ${CONFIG.accentColor};
      outline-offset: 3px;
    }

    .tst-loading { text-align: center; padding: 40px 0; }
    .tst-spinner {
      width: 44px; height: 44px;
      border: 4px solid #e5e7eb;
      border-top-color: ${CONFIG.brandColor};
      border-radius: 50%;
      animation: tst-spin 0.8s linear infinite;
      margin: 0 auto 16px;
    }
    @keyframes tst-spin { to { transform: rotate(360deg); } }
    .tst-loading p { color: #6b7280; font-size: 15px; }

    .tst-score-wrap { display: flex; align-items: center; gap: 20px; margin-bottom: 24px; padding: 20px; background: #f8fafc; border-radius: 10px; }
    .tst-score-ring {
      flex-shrink: 0;
      width: 72px; height: 72px;
      border-radius: 50%;
      background: conic-gradient(${CONFIG.accentColor} calc(var(--pct) * 1%), #e5e7eb 0);
      display: flex; align-items: center; justify-content: center;
      position: relative;
    }
    .tst-score-ring::after {
      content: '';
      position: absolute;
      inset: 8px;
      background: #f8fafc;
      border-radius: 50%;
    }
    .tst-score-num { position: relative; z-index: 1; font-size: 18px; font-weight: 800; color: ${CONFIG.brandColor}; }
    .tst-score-text h3 { margin: 0 0 4px; font-size: 16px; color: #111827; }
    .tst-score-text p  { margin: 0; font-size: 13px; color: #6b7280; }

    .tst-stats { display: flex; gap: 12px; margin-bottom: 20px; }
    .tst-stat {
      flex: 1;
      background: #f1f5f9;
      border-radius: 8px;
      padding: 14px;
      text-align: center;
    }
    .tst-stat strong { display: block; font-size: 26px; font-weight: 800; color: ${CONFIG.brandColor}; }
    .tst-stat span   { font-size: 12px; color: #6b7280; }

    .tst-section-title { font-size: 13px; font-weight: 700; color: #374151; text-transform: uppercase; letter-spacing: 0.05em; margin: 20px 0 10px; }
    .tst-kw-table { width: 100%; border-collapse: collapse; }
    .tst-kw-table th { font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.04em; padding: 6px 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    .tst-kw-table td { padding: 9px 10px; font-size: 14px; border-bottom: 1px solid #f3f4f6; color: #1f2937; }
    .tst-kw-table tr:last-child td { border-bottom: none; }

    .tst-badge { display: inline-block; padding: 2px 9px; border-radius: 99px; font-size: 11px; font-weight: 600; }
    .tst-badge-high    { background: #dcfce7; color: #15803d; }
    .tst-badge-medium  { background: #fef9c3; color: #a16207; }
    .tst-badge-low     { background: #f1f5f9; color: #64748b; }
    .tst-badge-rising  { background: #ede9fe; color: #7c3aed; }
    .tst-badge-stable  { background: #f1f5f9; color: #64748b; }

    .tst-locked-row td { filter: blur(4px); user-select: none; pointer-events: none; }
    .tst-lock-banner {
      background: linear-gradient(to bottom, transparent, #fff 70%);
      margin-top: -60px;
      padding: 60px 0 0;
      text-align: center;
      position: relative;
      z-index: 2;
    }

    .tst-competitors { display: flex; flex-direction: column; gap: 8px; }
    .tst-competitor {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 12px; background: #f8fafc; border-radius: 8px; font-size: 14px;
    }
    .tst-comp-rank {
      width: 24px; height: 24px;
      background: ${CONFIG.brandColor};
      color: #fff; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700; flex-shrink: 0;
    }

    .tst-gate { text-align: center; padding: 8px 0 4px; }
    .tst-gate h3 { font-size: 19px; color: #111827; margin: 0 0 8px; }
    .tst-gate p  { font-size: 14px; color: #6b7280; margin: 0 0 20px; }

    .tst-rec-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
    .tst-rec-list li {
      display: flex; gap: 10px; align-items: flex-start;
      padding: 12px; background: #f0fdf4; border-radius: 8px;
      font-size: 14px; color: #1f2937; line-height: 1.5;
    }
    .tst-rec-icon { flex-shrink: 0; font-size: 16px; margin-top: 1px; }

    .tst-cta {
      margin-top: 28px; background: ${CONFIG.brandColor};
      border-radius: 10px; padding: 24px; text-align: center; color: #fff;
    }
    .tst-cta h3 { margin: 0 0 8px; font-size: 18px; }
    .tst-cta p  { margin: 0 0 16px; font-size: 14px; opacity: 0.85; }
    .tst-cta-btn {
      display: inline-block; padding: 13px 32px;
      background: ${CONFIG.accentColor}; color: #fff; border-radius: 8px;
      font-size: 16px; font-weight: 700; text-decoration: none; border: none; cursor: pointer;
      transition: opacity 0.15s;
    }
    .tst-cta-btn:hover { opacity: 0.9; }

    .tst-modal-overlay {
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(0,0,0,0.65);
      display: flex; align-items: center; justify-content: center;
      padding: 16px; animation: tst-fadein 0.2s ease;
    }
    @keyframes tst-fadein { from { opacity:0 } to { opacity:1 } }
    .tst-modal {
      background: #fff; border-radius: 12px;
      width: 100%; max-width: 560px; height: 80vh; max-height: 700px;
      display: flex; flex-direction: column; overflow: hidden;
      box-shadow: 0 24px 64px rgba(0,0,0,0.3);
    }
    .tst-modal-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 20px; border-bottom: 1px solid #e5e7eb; flex-shrink: 0;
    }
    .tst-modal-header span { font-size: 14px; font-weight: 600; color: #111827; }
    .tst-modal-close {
      width: 30px; height: 30px; border-radius: 50%; border: none;
      background: #f3f4f6; cursor: pointer; font-size: 16px; line-height: 1;
      display: flex; align-items: center; justify-content: center;
      color: #6b7280; transition: background 0.15s;
    }
    .tst-modal-close:hover { background: #e5e7eb; }
    .tst-modal iframe { flex: 1; border: none; width: 100%; }

    .tst-lead-value {
      background: linear-gradient(135deg, ${CONFIG.brandColor} 0%, #2d5a8e 100%);
      border-radius: 10px; padding: 20px 24px; color: #fff; margin: 20px 0;
    }
    .tst-lead-value h4 { margin: 0 0 4px; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; opacity: 0.75; }
    .tst-lead-revenue  { font-size: 28px; font-weight: 800; margin: 0 0 12px; line-height: 1.1; }
    .tst-lead-meta     { display: flex; gap: 16px; flex-wrap: wrap; }
    .tst-lead-meta-item { font-size: 12px; opacity: 0.85; }
    .tst-lead-meta-item strong { font-weight: 700; opacity: 1; }

    .tst-seasonal { background: #f8fafc; border-radius: 10px; padding: 20px; margin: 20px 0; }
    .tst-seasonal-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 8px; }
    .tst-seasonal-header h4 { margin: 0; font-size: 15px; color: #111827; }
    .tst-peak-badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 99px; font-size: 12px; font-weight: 700; }
    .tst-peak-badge-urgent  { background: #fef3c7; color: #92400e; }
    .tst-peak-badge-soon    { background: #ede9fe; color: #5b21b6; }
    .tst-peak-badge-stable  { background: #f0fdf4; color: #166534; }
    .tst-chart { display: flex; align-items: flex-end; gap: 3px; height: 64px; }
    .tst-chart-bar-wrap { display: flex; flex-direction: column; align-items: center; flex: 1; gap: 4px; }
    .tst-chart-bar { width: 100%; border-radius: 3px 3px 0 0; transition: height 0.4s; min-height: 3px; }
    .tst-chart-label { font-size: 8px; color: #94a3b8; }

    .tst-error { background: #fef2f2; color: #991b1b; padding: 12px 16px; border-radius: 8px; font-size: 14px; margin-bottom: 16px; }
    .tst-disclaimer { font-size: 11px; color: #9ca3af; text-align: center; margin-top: 16px; }
    .tst-legal {
      margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;
      font-size: 11px; color: #9ca3af; line-height: 1.7;
    }
    .tst-legal p { margin: 0 0 6px; }
    .tst-legal a { color: #9ca3af; text-decoration: underline; }
    .tst-legal a:hover { color: #6b7280; }
    .tst-legal-links { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; margin-top: 8px; }
  `

  // ── CALENDAR MODAL ──────────────────────────────────────────────────────────
  function openCalendarModal(calUrl) {
    var prevFocus = document.activeElement
    var overlay = el('div', { class: 'tst-modal-overlay', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Book Your Signal Leak Audit' })
    var modal   = el('div', { class: 'tst-modal' })
    var closeBtn = el('button', { class: 'tst-modal-close', type: 'button', 'aria-label': 'Close booking dialog' }, '✕')
    var header  = el('div', { class: 'tst-modal-header' }, [
      el('span', null, 'Book Your Signal Leak Audit™'),
      closeBtn,
    ])
    var iframe = el('iframe', { src: calUrl, allow: 'camera; microphone; fullscreen', title: 'Booking calendar' })

    function close() {
      document.body.removeChild(overlay)
      document.removeEventListener('keydown', onKey)
      if (prevFocus && prevFocus.focus) prevFocus.focus()
    }

    function onKey(e) {
      if (e.key === 'Escape') { close(); return }
      if (e.key === 'Tab') {
        var focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
        var first = focusable[0], last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }

    closeBtn.addEventListener('click', close)
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close() })
    document.addEventListener('keydown', onKey)
    modal.appendChild(header)
    modal.appendChild(iframe)
    overlay.appendChild(modal)
    document.body.appendChild(overlay)
    closeBtn.focus()
  }

  // ── HELPERS ─────────────────────────────────────────────────────────────────
  function apiPost(endpoint, body) {
    return fetch(CONFIG.supabaseUrl + endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': CONFIG.anonKey,
        'Authorization': 'Bearer ' + CONFIG.anonKey,
      },
      body: JSON.stringify(body),
    }).then(function (r) { return r.json() })
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag)
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') node.className = attrs[k]
      else if (k === 'html') node.innerHTML = attrs[k]
      else if (k === 'style') node.style.cssText = attrs[k]
      else node.setAttribute(k, attrs[k])
    })
    if (children) [].concat(children).forEach(function (c) {
      if (typeof c === 'string') node.appendChild(document.createTextNode(c))
      else if (c) node.appendChild(c)
    })
    return node
  }

  function badgeVolume(v) {
    var cls = v === 'High' ? 'high' : v === 'Medium' ? 'medium' : 'low'
    return el('span', { class: 'tst-badge tst-badge-' + cls }, v)
  }

  function badgeTrend(t) {
    var cls = t === 'Rising' ? 'rising' : 'stable'
    return el('span', { class: 'tst-badge tst-badge-' + cls }, t === 'Rising' ? '↑ Rising' : '→ Stable')
  }

  // ── STEPS ───────────────────────────────────────────────────────────────────
  function renderForm(state, onSubmit) {
    var errorId  = 'tst-form-error-' + Date.now()
    var errorDiv = el('div', { class: 'tst-error', style: 'display:none', role: 'alert', id: errorId, 'aria-live': 'assertive' })

    var practiceSelect = el('select', { 'aria-label': 'Practice area', 'aria-required': 'true' })
    practiceSelect.appendChild(el('option', { value: '' }, '— Select your practice area —'))
    PRACTICE_AREAS.forEach(function (a) { practiceSelect.appendChild(el('option', { value: a }, a)) })

    var cityInput  = el('input', { type: 'text', placeholder: 'e.g. Houston',  'aria-label': 'City',     autocomplete: 'address-level2' })
    var stateInput = el('input', { type: 'text', placeholder: 'e.g. TX',       'aria-label': 'State',    autocomplete: 'address-level1', maxlength: '2' })
    var zipInput   = el('input', { type: 'text', placeholder: 'e.g. 77001',    'aria-label': 'Zip code', autocomplete: 'postal-code',    maxlength: '10' })
    var btn        = el('button', { class: 'tst-btn', type: 'button', 'aria-describedby': errorId }, 'Show My Consultation Leak →')

    function submit() {
      errorDiv.style.display = 'none'
      var area = practiceSelect.value.trim()
      var city = cityInput.value.trim()
      var st   = stateInput.value.trim()
      var zip  = zipInput.value.trim()

      if (!area) {
        errorDiv.textContent = 'Please select your practice area.'
        errorDiv.style.display = 'block'
        practiceSelect.focus()
        return
      }
      if (!city && !st && !zip) {
        errorDiv.textContent = 'Please enter at least a city, state, or zip code.'
        errorDiv.style.display = 'block'
        cityInput.focus()
        return
      }

      btn.disabled = true
      btn.textContent = 'Scanning your market…'
      onSubmit({ practiceArea: area, city: city, state: st, zip: zip, segment: 'pia' })
    }

    btn.addEventListener('click', submit)
    ;[cityInput, stateInput, zipInput].forEach(function (input) {
      input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit() })
    })

    var practiceAreaLabelId = 'tst-pa-label-' + Date.now()
    var practiceAreaLabel   = el('label', { id: practiceAreaLabelId }, 'Practice Area')
    practiceSelect.setAttribute('aria-labelledby', practiceAreaLabelId)

    return el('div', { role: 'form', 'aria-label': 'Consultation leak report request form' }, [
      errorDiv,
      el('div', { class: 'tst-field' }, [practiceAreaLabel, practiceSelect]),
      el('div', { class: 'tst-field' }, [el('label', null, 'City'), cityInput]),
      el('div', { class: 'tst-row' }, [
        el('div', { class: 'tst-field' }, [el('label', null, 'State'), stateInput]),
        el('div', { class: 'tst-field' }, [el('label', null, 'Zip Code'), zipInput]),
      ]),
      btn,
      el('p', { class: 'tst-disclaimer' }, 'Free report — no credit card required.'),
    ])
  }

  function renderLoading() {
    return el('div', { class: 'tst-loading' }, [
      el('div', { class: 'tst-spinner' }),
      el('p', null, 'Scanning injury case activity in your market…'),
    ])
  }

  function renderTeaser(data, onUnlock) {
    var score     = data.opportunityScore || 72
    var kwCount   = data.keywordCount || 8
    var leakCount = data.leakCount || 0
    var location  = data.location || ''
    var topKws    = data.topKeywords || []

    var scoreRing = el('div', { class: 'tst-score-ring', style: '--pct:' + score })
    scoreRing.appendChild(el('span', { class: 'tst-score-num' }, String(score)))

    var rows = topKws.map(function (kw) {
      var label  = typeof kw === 'string' ? kw : kw.keyword
      var volume = typeof kw === 'string' ? 'High' : (kw.volume || 'High')
      var trend  = typeof kw === 'string' ? 'Rising' : (kw.trend  || 'Rising')
      return el('tr', null, [
        el('td', null, label),
        el('td', null, badgeVolume(volume)),
        el('td', null, badgeTrend(trend)),
      ])
    })

    var lockedRows = (data.lockedKeywords || []).map(function (kw) {
      var label  = typeof kw === 'string' ? kw : kw.keyword
      var volume = typeof kw === 'string' ? 'Medium' : (kw.volume || 'Medium')
      var trend  = typeof kw === 'string' ? 'Stable' : (kw.trend  || 'Stable')
      return el('tr', { class: 'tst-locked-row' }, [
        el('td', null, label),
        el('td', null, badgeVolume(volume)),
        el('td', null, badgeTrend(trend)),
      ])
    })

    var table = el('table', { class: 'tst-kw-table' }, [
      el('thead', null, el('tr', null, [
        el('th', null, 'Search Term'),
        el('th', null, 'Volume'),
        el('th', null, 'Trend'),
      ])),
      el('tbody', null, rows.concat(lockedRows)),
    ])

    var lockBanner = el('div', { class: 'tst-lock-banner' }, [
      el('p', { style: 'color:#6b7280;font-size:13px;margin:0 0 12px' },
        (kwCount - 3) + ' signals hidden — where should we send your Consultation Leak Report?'),
    ])

    var gateErrorId = 'tst-gate-error-' + Date.now()
    var emailId     = 'tst-email-' + Date.now()

    var emailInput = el('input', {
      type: 'email', id: emailId, placeholder: 'your@email.com',
      'aria-label': 'Email address', 'aria-required': 'true',
      'aria-describedby': gateErrorId, autocomplete: 'email',
      style: 'width:100%;padding:11px 14px;border:1.5px solid #d1d5db;border-radius:8px;font-size:15px;margin-bottom:10px;outline:none',
    })

    var phoneId    = 'tst-phone-' + Date.now()
    var phoneInput = el('input', {
      type: 'tel', id: phoneId, placeholder: '(555) 555-5555',
      'aria-label': 'Mobile number (optional)', autocomplete: 'tel',
      style: 'width:100%;padding:11px 14px;border:1.5px solid #d1d5db;border-radius:8px;font-size:15px;margin-bottom:4px;outline:none',
    })
    var phoneHint = el('p', { style: 'font-size:11px;color:#9ca3af;margin:0 0 12px;text-align:left' },
      'Optional — enter your mobile number to also receive the report link via text.'
    )

    var optInCheck = document.createElement('input')
    optInCheck.type = 'checkbox'
    optInCheck.id   = 'tst-optin-' + Date.now()
    optInCheck.setAttribute('aria-required', 'true')
    optInCheck.style.cssText = 'width:16px;height:16px;margin-right:8px;flex-shrink:0;cursor:pointer;accent-color:' + CONFIG.brandColor

    var optInLabel = el('label', { for: optInCheck.id, style: 'display:flex;align-items:flex-start;gap:0;cursor:pointer;font-size:12px;color:#374151;line-height:1.5;margin-bottom:12px;text-align:left' })
    optInLabel.appendChild(optInCheck)
    optInLabel.appendChild(document.createTextNode('I consent to receive marketing communications from Social Linus and its products, including SignalForge, via email, phone call, and SMS/text message. Message & data rates may apply. Reply STOP to opt out of SMS at any time.'))

    var errorDiv  = el('div', { class: 'tst-error', id: gateErrorId, role: 'alert', 'aria-live': 'assertive', style: 'display:none' })
    var unlockBtn = el('button', { class: 'tst-btn', type: 'button', 'aria-describedby': gateErrorId }, 'Send My Report →')

    function tryUnlock() {
      var email = emailInput.value.trim()
      var phone = phoneInput.value.trim()
      if (!email || !email.includes('@')) {
        errorDiv.textContent = 'Please enter a valid email address.'
        errorDiv.style.display = 'block'
        emailInput.focus()
        return
      }
      if (!optInCheck.checked) {
        errorDiv.textContent = 'Please check the consent box to receive your report.'
        errorDiv.style.display = 'block'
        optInCheck.focus()
        return
      }
      errorDiv.style.display = 'none'
      unlockBtn.disabled = true
      unlockBtn.textContent = 'Unlocking…'
      onUnlock(email, optInCheck.checked, phone)
    }

    unlockBtn.addEventListener('click', tryUnlock)
    emailInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') tryUnlock() })
    phoneInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') tryUnlock() })

    var leakStat = leakCount > 0
      ? [el('strong', null, leakCount.toLocaleString()), el('span', null, 'Potential Clients Lost This Month')]
      : [el('strong', { style: 'color:' + CONFIG.accentColor }, score + '/100'), el('span', null, 'Case Opportunity Score')]

    return el('div', null, [
      el('div', { class: 'tst-score-wrap' }, [
        scoreRing,
        el('div', { class: 'tst-score-text' }, [
          el('h3', null, 'Case Opportunity Score'),
          el('p', null, location),
        ]),
      ]),
      el('div', { class: 'tst-stats' }, [
        el('div', { class: 'tst-stat' }, [el('strong', null, kwCount.toLocaleString()), el('span', null, 'Injury Case Searches in Your Market')]),
        el('div', { class: 'tst-stat' }, leakStat),
        el('div', { class: 'tst-stat' }, [el('strong', null, score + '/100'), el('span', null, 'Case Opportunity Score')]),
      ]),
      el('p', { class: 'tst-section-title' }, 'Which Firms Are Capturing Clients in Your Market'),
      table,
      lockBanner,
      el('div', { class: 'tst-gate' }, [
        el('h3', null, 'There are ' + kwCount + ' injury case search' + (kwCount !== 1 ? 'es' : '') + ' in ' + (location || 'your market') + ' this month.'),
        el('p', null, 'The firms retaining those clients are following up with everyone who visits their site. Enter your email to see your estimated consultation leak — and what it\'s costing your practice.'),
        emailInput,
        el('label', { for: phoneId, style: 'display:block;font-size:13px;font-weight:600;color:#374151;margin-bottom:6px;text-align:left' }, 'Mobile Number'),
        phoneInput,
        phoneHint,
        optInLabel,
        errorDiv,
        unlockBtn,
      ]),
    ])
  }

  function renderLeadValue(lv, location) {
    if (!lv) return null
    var fmt = function (n) {
      return n >= 1000000 ? '$' + (n / 1000000).toFixed(1) + 'M'
           : n >= 1000    ? '$' + Math.round(n / 1000) + 'k'
           : '$' + n
    }
    return el('div', { class: 'tst-lead-value' }, [
      el('h4', null, 'Case value leaking to other firms in ' + location),
      el('div', { class: 'tst-lead-revenue' }, fmt(lv.revenueLow) + ' — ' + fmt(lv.revenueHigh) + '/mo'),
      el('div', { class: 'tst-lead-meta' }, [
        el('div', { class: 'tst-lead-meta-item' }, [el('strong', null, '~' + lv.monthlySearches.toLocaleString()), ' injury case searches/mo']),
        el('div', { class: 'tst-lead-meta-item' }, [el('strong', null, lv.leadsLow + '–' + lv.leadsHigh), ' consultations lost']),
        el('div', { class: 'tst-lead-meta-item' }, [el('strong', null, '$' + lv.avgJobValue.toLocaleString()), ' avg ' + (lv.jobLabel || 'contingency fee')]),
      ]),
    ])
  }

  function renderSeasonalForecast(seasonal) {
    if (!seasonal || !seasonal.monthlyScores) return null

    var MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    var scores   = seasonal.monthlyScores
    var maxScore = Math.max.apply(null, scores) || 1
    var peakIdx  = seasonal.peakMonthIndex
    var curIdx   = new Date().getMonth()
    var weeks    = seasonal.weeksUntilPeak

    var badgeClass, badgeText
    if (seasonal.isInPeakSeason) {
      badgeClass = 'tst-peak-badge-stable'; badgeText = '🔥 Peak season NOW'
    } else if (weeks <= 8) {
      badgeClass = 'tst-peak-badge-urgent'; badgeText = '⚡ ' + weeks + ' weeks to peak'
    } else {
      badgeClass = 'tst-peak-badge-soon'; badgeText = 'Peak: ' + seasonal.peakMonth
    }

    var bars = scores.map(function (score, i) {
      var pct    = Math.round((score / maxScore) * 100)
      var isPeak = i === peakIdx
      var isCur  = i === curIdx
      var bg     = isPeak ? CONFIG.accentColor : isCur ? CONFIG.brandColor : '#cbd5e1'
      return el('div', { class: 'tst-chart-bar-wrap' }, [
        el('div', { class: 'tst-chart-bar', style: 'height:' + Math.max(4, pct * 0.64) + 'px;background:' + bg }),
        el('div', { class: 'tst-chart-label', style: (isPeak || isCur) ? 'color:' + (isPeak ? CONFIG.accentColor : CONFIG.brandColor) + ';font-weight:700' : '' }, MONTHS[i]),
      ])
    })

    var trendText = seasonal.yearTrend === 'growing'   ? '↑ Injury case searches are growing year over year'
                  : seasonal.yearTrend === 'declining' ? '↓ Injury case searches are declining year over year'
                  : '→ Injury case searches are stable year over year'

    return el('div', { class: 'tst-seasonal' }, [
      el('div', { class: 'tst-seasonal-header' }, [
        el('h4', null, '📅 Seasonal Demand Forecast'),
        el('span', { class: 'tst-peak-badge ' + badgeClass }, badgeText),
      ]),
      el('div', { class: 'tst-chart' }, bars),
      el('p', { style: 'margin:10px 0 0;font-size:12px;color:#64748b' }, trendText),
    ])
  }

  function renderFullReport(report, location) {
    var score       = report.opportunityScore || 72
    var keywords    = report.keywords || []
    var competitors = report.competitors || []
    var recs        = report.recommendations || []
    var calLink     = report.calendarLink || CONFIG.calendarLink
    var seasonal    = report.seasonal  || null
    var leadValue   = report.leadValue || null

    var scoreRing = el('div', { class: 'tst-score-ring', style: '--pct:' + score })
    scoreRing.appendChild(el('span', { class: 'tst-score-num' }, String(score)))

    var kwRows = keywords.map(function (kw) {
      return el('tr', null, [
        el('td', null, kw.keyword),
        el('td', null, badgeVolume(kw.volume)),
        el('td', null, badgeTrend(kw.trend)),
      ])
    })

    var compItems = competitors.length
      ? competitors.map(function (name, i) {
          return el('div', { class: 'tst-competitor' }, [
            el('div', { class: 'tst-comp-rank' }, String(i + 1)),
            el('span', null, name),
          ])
        })
      : [el('p', { style: 'color:#6b7280;font-size:14px;font-style:italic' }, 'Competitor data loads once SerpApi key is configured (see README).')]

    var recItems = recs.map(function (r) {
      return el('li', null, [el('span', { class: 'tst-rec-icon' }, '✓'), el('span', null, r)])
    })

    return el('div', null, [
      el('div', { class: 'tst-score-wrap' }, [
        scoreRing,
        el('div', { class: 'tst-score-text' }, [
          el('h3', null, 'Case Opportunity Score: ' + score + '/100'),
          el('p', null, location),
        ]),
      ]),
      el('p', { class: 'tst-section-title' }, 'Injury Case Searches Active in Your Market'),
      el('table', { class: 'tst-kw-table' }, [
        el('thead', null, el('tr', null, [el('th', null, 'Search Term'), el('th', null, 'Volume'), el('th', null, 'Trend')])),
        el('tbody', null, kwRows),
      ]),
      renderLeadValue(leadValue, location),
      renderSeasonalForecast(seasonal),
      el('p', { class: 'tst-section-title' }, 'Which Firms Are Capturing Cases in ' + location),
      el('div', { class: 'tst-competitors' }, compItems),
      el('p', { class: 'tst-section-title' }, '3 Ways You\'re Losing Consultations'),
      el('ul', { class: 'tst-rec-list' }, recItems),
      el('div', { class: 'tst-cta' }, [
        el('h3', null, 'They already found your firm. They just need a reason to call.'),
        el('p', null, 'This 15-minute call is for PI attorneys who are ready to act on what the report showed them. We\'ll review your market, answer your questions, and give you a straight answer on whether SignalForge is the right fit.'),
        el('p', { style: 'font-size:13px;opacity:0.8;margin:8px 0 16px' }, 'If it is, most firms are fully deployed within 90 minutes of completing onboarding.'),
        (function () {
          var btn = el('button', { type: 'button', class: 'tst-cta-btn' }, 'Book My 15-Minute Call →')
          btn.addEventListener('click', function () { openCalendarModal(calLink) })
          return btn
        })(),
      ]),
      el('div', { class: 'tst-legal' }, [
        el('p', null, 'Data sourced from Google search activity. Volume and trend indicators are relative estimates based on publicly available data and are not guaranteed. Revenue projections are illustrative only and do not constitute a guarantee of results.'),
        el('p', null, 'This report and SignalForge are not affiliated with, endorsed by, or sponsored by Facebook, Instagram, LinkedIn, Reddit, or any of their parent companies or affiliates.'),
        el('p', null, 'By submitting your information you agreed to receive marketing communications from Social Linus LLC and its products, including SignalForge, via email, phone call, and SMS. You may opt out at any time by replying STOP (SMS) or clicking unsubscribe (email).'),
        el('div', { class: 'tst-legal-links' }, [
          el('a', { href: window.TST_PRIVACY_URL || '#', target: '_blank' }, 'Privacy Policy'),
          el('a', { href: window.TST_TERMS_URL   || '#', target: '_blank' }, 'Terms & Conditions'),
        ]),
        el('p', { style: 'text-align:center;margin-top:6px' }, '© ' + new Date().getFullYear() + ' Social Linus LLC. All rights reserved. SignalForge is a product of Social Linus LLC.'),
      ]),
    ])
  }

  // ── MOUNT ───────────────────────────────────────────────────────────────────
  function mount() {
    var container = document.getElementById('tst-widget')
    if (!container) return

    var styleTag = document.createElement('style')
    styleTag.textContent = css
    document.head.appendChild(styleTag)

    var state = {}

    var header = el('div', { class: 'tst-header' }, [
      el('h2', null, 'Potential Clients Are Visiting Your Firm\'s Website and Leaving Without Calling'),
      el('p', null, 'See how many consultations you\'re losing each month — and what it takes to bring them back.'),
    ])
    var body = el('div', { class: 'tst-body' })
    var card = el('div', { class: 'tst-card' }, [header, body])
    container.appendChild(card)

    function showForm() {
      body.innerHTML = ''
      body.appendChild(renderForm(state, function (fields) {
        state = Object.assign(state, fields)
        showLoading()
        apiPost(CONFIG.teaserEndpoint, fields).then(function (data) {
          if (data.error) { showForm(); alert('Error: ' + data.error); return }
          state.teaserData = data
          showTeaser(data)
        }).catch(function () { showForm(); alert('Something went wrong. Please try again.') })
      }))
    }

    function showLoading() {
      body.innerHTML = ''
      body.appendChild(renderLoading())
    }

    function showTeaser(data) {
      body.innerHTML = ''
      body.appendChild(renderTeaser(data, function (email, optIn, phone) {
        state.email = email
        state.optIn = optIn
        state.phone = phone || ''
        showLoading()
        apiPost(CONFIG.unlockEndpoint, {
          email:        email,
          practiceArea: state.practiceArea,
          city:         state.city,
          state:        state.state,
          zip:          state.zip,
          optIn:        !!optIn,
          phone:        phone || '',
          segment:      'pia',
        }).then(function (data) {
          if (data.error) { showTeaser(state.teaserData); alert('Error: ' + data.error); return }
          showReport(data.report)
        }).catch(function () { showTeaser(state.teaserData); alert('Something went wrong. Please try again.') })
      }))
    }

    function showReport(report) {
      var loc = state.teaserData?.location || state.city || ''
      body.innerHTML = ''
      body.appendChild(renderFullReport(report, loc))
    }

    showForm()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount)
  } else {
    mount()
  }
})()
