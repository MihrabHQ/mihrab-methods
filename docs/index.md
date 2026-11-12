---
title: Mihrab Methods – accurate Islamic prayer times for developers
description: An open-source prayer time calculation library for Muslim apps. The calculation methods of national Islamic authorities, each verified against its published timetable to the printed minute. Offline, in TypeScript, Python, Swift, Kotlin and Dart, with a free HTTP API.
permalink: /
home: true
---

<section class="hero">
<div class="wrap hero-grid">
<div>
<p class="eyebrow">Open source · MPL-2.0 · TypeScript, Python, Swift, Kotlin, Dart</p>
<h1>Prayer times that match <em>the timetable mosques follow</em></h1>
<p class="lede">Mihrab Methods reproduces the published methods of recognised Islamic authorities — a ministry's, a muftiate's, a council of scholars' — and checks every result against the timetable that authority publishes. Fajr, sunrise, Dhuhr, Asr, Maghrib and Isha, calculated offline on the device.</p>
<div class="cta">
<a class="btn btn-primary" href="{{ '/javascript-prayer-time-library/' | relative_url }}">Get started</a>
<a class="btn btn-quiet" href="{{ '/prayer-time-api/' | relative_url }}">Use the free API</a>
<a class="btn btn-quiet" href="https://github.com/MihrabHQ/mihrab-methods">GitHub</a>
</div>
<div class="install"><span><code>npm install mihrab-methods</code></span><span><code>pip install mihrab-methods</code></span></div>
</div>
<div class="hero-code" markdown="1">

```ts
import { nearestPlace, timesFor } from 'mihrab-methods';

// Istanbul, by Diyanet's method
const { place } = nearestPlace('diyanet', 41.01, 28.98)!;
const day = timesFor(place, '2026-10-15');

day.times!.fajr.printed; // 'HH:MM', as printed
day.status;              // 'certified'
```

</div>
</div>
</section>

<section class="band">
<div class="wrap">
<div class="stats">
<div class="stat good"><b><!--fig:total.off-->0<!--/fig--></b><span>times off the printed minute</span></div>
<div class="stat"><b><!--fig:total.times-->77,611,133<!--/fig--></b><span>published times compared, day by day</span></div>
<div class="stat"><b><!--fig:total.methods-->21<!--/fig--></b><span>authorities, each with its own method</span></div>
<div class="stat"><b>Offline</b><span>no request per reader; a free HTTP API if you want one</span></div>
</div>
<p class="note">Every method is compared with its authority's published timetable and is used only at zero times off. <a href="{{ '/verification/' | relative_url }}">What exactly was tested</a>.</p>
</div>
</section>

<section class="band">
<div class="wrap">
<h2>Why Mihrab Methods</h2>
<p class="sub">A general prayer time calculator gives you an angle convention — Muslim World League, ISNA, Umm al-Qura — and lands a minute or a few away from the timetable a country's mosques actually follow.</p>
<div class="cards">
<div class="card"><div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l7 4v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V7z"/></svg></div><h3>Authority-specific</h3><p>Each method is one authority's own: its angles, margins, rounding and reference points, not a generic convention with an offset.</p></div>
<div class="card"><div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg></div><h3>Verified to the minute</h3><p>Compared day by day with the published timetable. The record is public and regenerated on every change.</p></div>
<div class="card"><div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5a7 7 0 0 1 14 0M8.5 16a3.5 3.5 0 0 1 7 0"/><circle cx="12" cy="19" r="1"/><path d="M3 3l18 18"/></svg></div><h3>Offline</h3><p>The times are calculated on the device. Nothing is fetched and no request is made per reader.</p></div>
<div class="card"><div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5"/></svg></div><h3>Made for app developers</h3><p>TypeScript types, one import per authority and a clear <code>status</code> on every answer — the same methods in Python, Swift, Kotlin and Dart.</p></div>
<div class="card"><div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 12h16M12 4a12 12 0 0 1 0 16M12 4a12 12 0 0 0 0 16"/><circle cx="12" cy="12" r="8"/></svg></div><h3>A free HTTP API</h3><p>The same methods over HTTP, free, with no key. Or run the handler yourself, or skip the network entirely.</p></div>
<div class="card"><div class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h4l3-8 4 16 3-8h4"/></svg></div><h3>A plain fallback</h3><p>For a place no authority publishes for, a plainly labelled standard calculation: MWL, ISNA, Egypt, Karachi, Umm al-Qura, either Asr.</p></div>
</div>
<div class="langs"><span>TypeScript</span><span>JavaScript</span><span>React Native</span><span>Python</span><span>Swift</span><span>Kotlin</span><span>Dart / Flutter</span><span>HTTP</span></div>
</div>
</section>

<section class="band">
<div class="wrap">
<h2>Guides</h2>
<p class="sub">Start with the one closest to what you are building.</p>
<div class="cards">
<a class="card" href="{{ '/javascript-prayer-time-library/' | relative_url }}"><h3>JavaScript library</h3><p>TypeScript and JavaScript: Node, the browser, React Native.</p><span class="go">Read →</span></a>
<a class="card" href="{{ '/prayer-time-api/' | relative_url }}"><h3>Prayer time API</h3><p>Calling prayer times over HTTP: routes, parameters, answers, limits.</p><span class="go">Read →</span></a>
<a class="card" href="{{ '/mobile-integration/' | relative_url }}"><h3>Mobile integration</h3><p>React Native, Flutter, Swift and Kotlin: what to bundle, picking the place, scheduling.</p><span class="go">Read →</span></a>
<a class="card" href="{{ '/offline-prayer-time-calculator/' | relative_url }}"><h3>Working offline</h3><p>Mobile apps that must work with no connection.</p><span class="go">Read →</span></a>
<a class="card" href="{{ '/prayer-time-calculation-methods/' | relative_url }}"><h3>Calculation methods</h3><p>Which authority, which convention, which Asr.</p><span class="go">Read →</span></a>
<a class="card" href="{{ '/examples/' | relative_url }}"><h3>Examples</h3><p>TypeScript, React Native, Flutter, Kotlin, Swift, Python.</p><span class="go">Read →</span></a>
<a class="card" href="{{ '/diyanet-prayer-time-calculation/' | relative_url }}"><h3>Diyanet</h3><p>Reproducing Diyanet's times, in Türkiye and worldwide.</p><span class="go">Read →</span></a>
<a class="card" href="{{ '/sweden-prayer-times/' | relative_url }}"><h3>Prayer times in Sweden</h3><p>The tables Swedish mosques follow, and the summer nights.</p><span class="go">Read →</span></a>
<a class="card" href="{{ '/compare-adhan-js-aladhan/' | relative_url }}"><h3>Compared with Adhan JS and AlAdhan</h3><p>What each is for, what differs, and what this does not do.</p><span class="go">Read →</span></a>
</div>
</div>
</section>

<section class="band">
<div class="wrap split">
<div>
<h2>Reference</h2>
<ul class="checks">
<li><a href="{{ '/usage.html' | relative_url }}"><b>Using the library and the API</b></a> — every call, entry point and route</li>
<li><a href="{{ '/openapi.json' | relative_url }}"><b>OpenAPI description</b></a> of the HTTP API (OpenAPI 3.1)</li>
<li><a href="{{ '/methods.html' | relative_url }}"><b>Each method in words and formulas</b></a>, for ports to other languages</li>
<li><a href="{{ '/status.html' | relative_url }}"><b>Where each method stands</b></a> — what is certified, what was set aside</li>
<li><a href="{{ '/feed.html' | relative_url }}"><b>The correction lists as a feed</b></a> — keeping an installed app current</li>
<li><a href="{{ '/legal.html' | relative_url }}"><b>Why this can be used freely</b></a></li>
</ul>
</div>
<div>
<h2>Built for</h2>
<p class="sub">Muslim prayer apps, adhan and prayer notification apps, mosque timetable screens and websites, Islamic calendar apps and any product that shows people when to pray.</p>
<p class="note">The <a href="https://github.com/MihrabHQ/Mihrab">Mihrab app</a> computes its prayer times with this library. Mihrab Methods is independent of every authority whose method it reproduces.</p>
</div>
</div>
</section>
