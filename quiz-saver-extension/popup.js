/* global chrome, QuizSaverExport */
const $ = (id) => document.getElementById(id);
const statusEl = $('status');
const ALL = { origins: ['<all_urls>'] };
let stopRequested = false;

function setStatus(msg, kind) {
  statusEl.textContent = msg;
  statusEl.className = `status ${kind || ''}`;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const slug = (s) =>
  (s || 'quiz')
    .replace(/[\\/:*?"<>|~#%&{}$!'@+`=^]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60) || 'quiz';

async function loadQuiz() {
  const { quiz } = await chrome.storage.local.get('quiz');
  return quiz || null;
}
const saveQuiz = (quiz) => chrome.storage.local.set({ quiz });

async function getTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !/^(https?|file):/.test(tab.url || '')) throw new Error('Open the quiz review page in this tab first.');
  return tab;
}

/* ---------- files ---------- */
function download(folder, filename, content, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  return chrome.downloads
    .download({ url, filename: `QuizSaver/${folder}/${filename}`, conflictAction: 'overwrite', saveAs: false })
    .finally(() => setTimeout(() => URL.revokeObjectURL(url), 60000));
}

async function writeFiles(quiz) {
  const folder = slug(quiz.name);
  const json = {
    format: 'quiz-saver/1',
    name: quiz.name,
    savedAt: new Date(quiz.updatedAt).toISOString(),
    questions: QuizSaverExport.allQuestions(quiz).map(({ sig: _sig, page: _page, ...q }) => q),
  };
  await Promise.all([
    download(folder, 'quiz-practice.html', QuizSaverExport.toPracticeHtml(quiz), 'text/html'),
    download(folder, 'quiz-for-claude.md', QuizSaverExport.toMarkdown(quiz), 'text/markdown'),
    download(folder, 'quiz.json', JSON.stringify(json, null, 2), 'application/json'),
    download(folder, 'page-text.txt', QuizSaverExport.toPageText(quiz), 'text/plain'),
  ]);
  return folder;
}

/* ---------- images: cross-site pictures can't be read by the page script, so fetch them here ---------- */
const imageCache = new Map();
async function toDataUrl(url) {
  if (imageCache.has(url)) return imageCache.get(url);
  const p = fetch(url, { credentials: 'include' })
    .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(r.status))))
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result);
          fr.onerror = reject;
          fr.readAsDataURL(blob);
        })
    )
    .catch(() => null);
  imageCache.set(url, p);
  return p;
}
async function inlineImages(questions) {
  const lists = questions.flatMap((q) => [q.images, q.feedbackImages, q.stimulus?.images, ...q.options.map((o) => o.images)]).filter(Boolean);
  let missing = 0;
  await Promise.all(
    lists.flat().map(async (im) => {
      if (!im.onlineOnly) return;
      const data = await toDataUrl(im.original);
      if (data) {
        im.src = data;
        delete im.onlineOnly;
      } else missing++;
    })
  );
  return missing;
}

/* ---------- reading the page ---------- */
async function extract(tabId) {
  let results;
  try {
    results = await chrome.scripting.executeScript({ target: { tabId, allFrames: true }, files: ['extractor.js'] });
  } catch {
    results = await chrome.scripting.executeScript({ target: { tabId }, files: ['extractor.js'] });
  }
  const frames = results.map((r) => r.result && { ...r.result, frameId: r.frameId }).filter(Boolean);
  const top = frames.find((f) => f.isTopFrame) || frames[0];
  const withQs = frames.filter((f) => f.questions.length);
  return {
    url: top?.url,
    title: top?.title || '',
    capturedAt: new Date().toISOString(),
    detectedBy: [...new Set(withQs.map((f) => f.detectedBy))].join(', ') || null,
    questions: withQs.flatMap((f) => f.questions),
    pageText: [top, ...withQs.filter((f) => f !== top)]
      .filter(Boolean)
      .map((f) => f.pageText)
      .join('\n\n----- embedded frame -----\n\n'),
    quizFrameId: (withQs[0] || top)?.frameId ?? 0,
  };
}

/** Adds a page's questions, replacing ones already saved (same text + options). */
function merge(quiz, page) {
  const index = new Map();
  quiz.pages.forEach((p, pi) => p.questions.forEach((q, qi) => index.set(q.sig, [pi, qi])));
  const fresh = [];
  for (const q of page.questions) {
    const at = index.get(q.sig);
    if (at) quiz.pages[at[0]].questions[at[1]] = q;
    else fresh.push(q);
  }
  const { quizFrameId: _frame, ...rest } = page;
  if (fresh.length || (!page.questions.length && !quiz.pages.some((p) => p.url === page.url && !p.questions.length)))
    quiz.pages.push({ ...rest, questions: fresh });
  quiz.updatedAt = Date.now();
  return fresh.length;
}

async function startQuiz(tab) {
  let quiz = await loadQuiz();
  const name = $('name').value.trim() || quiz?.name || (tab.title || 'Quiz').replace(/\s*[|–-]\s*Medify.*$/i, '');
  if (!quiz) quiz = { id: Date.now().toString(36), name, pages: [], createdAt: Date.now() };
  quiz.name = name;
  return quiz;
}

/* Injected into the quiz frame: find the "Next" button and click it. */
function clickNext() {
  const label = (el) => (el.innerText || el.value || el.getAttribute('aria-label') || el.title || '').trim();
  const bad = /submit|finish|end\b|exit|close|flag|calculator|section|unit|overview|summary|results/i;
  let best = null;
  let bestScore = 0;
  for (const el of document.querySelectorAll('button, a, [role=button], input[type=button]')) {
    if (!el.getClientRects().length || el.disabled || el.getAttribute('aria-disabled') === 'true') continue;
    const t = label(el);
    const aria = `${el.getAttribute('aria-label') || ''} ${el.title || ''}`;
    let score = 0;
    if (/^next(\s+question)?\s*[›>→»]?$/i.test(t)) score = 3;
    else if (/^[›>→»]$/.test(t) && /next/i.test(aria)) score = 2;
    else if (!t && /next/i.test(aria)) score = 2;
    else if (/^next\b/i.test(t) && t.length < 20 && !bad.test(t)) score = 1;
    if (score > bestScore) {
      best = el;
      bestScore = score;
    }
  }
  if (!best) return false;
  best.click();
  return true;
}

function render(quiz) {
  $('pages-box').hidden = !quiz || !quiz.pages.length;
  if (quiz && !$('name').value) $('name').value = quiz.name;
  const list = $('pages');
  list.replaceChildren();
  if (!quiz) return;
  const all = QuizSaverExport.allQuestions(quiz);
  const s = QuizSaverExport.summary(all);
  $('totals').textContent = `${s.total} questions · ${s.correct} right · ${s.incorrect + s.partial} wrong · ${s.unanswered} unanswered`;
  quiz.pages.slice(-6).forEach((p) => {
    const li = document.createElement('li');
    const t = document.createElement('span');
    t.className = 't';
    t.textContent = p.questions[0]?.text || p.title || p.url;
    const d = document.createElement('span');
    d.className = 'muted small';
    d.textContent = p.questions.length
      ? p.questions.map((q) => (q.status === 'correct' ? '✓' : q.status === 'incorrect' ? '✗' : q.status || '?')).join(' ')
      : 'No questions recognised — page text saved';
    li.append(t, d);
    list.append(li);
  });
  if (quiz.pages.length > 6) list.prepend(Object.assign(document.createElement('li'), { className: 'muted small', textContent: `…and ${quiz.pages.length - 6} earlier pages` }));
}

function busy(on) {
  $('save').disabled = on;
  $('auto').disabled = on;
  $('redownload').disabled = on;
  $('reset').disabled = on;
  $('stop').hidden = !on;
}

async function finish(quiz, extra) {
  setStatus('Saving files…');
  const folder = await writeFiles(quiz);
  const s = QuizSaverExport.summary(QuizSaverExport.allQuestions(quiz));
  setStatus(`${extra ? `${extra}\n` : ''}Saved ${s.total} questions (${s.incorrect + s.partial} to review).\nFolder: Downloads/QuizSaver/${folder}/`, 'ok');
  return folder;
}

async function saveThisPage() {
  busy(true);
  try {
    const tab = await getTab();
    setStatus('Reading the page…');
    const page = await extract(tab.id);
    const missing = await inlineImages(page.questions);
    const quiz = await startQuiz(tab);
    const added = merge(quiz, page);
    await saveQuiz(quiz);
    render(quiz);
    const folder = await finish(
      quiz,
      page.questions.length
        ? `Found ${page.questions.length} question(s) here (${added} new).`
        : 'No questions recognised on this page — saved its text instead.'
    );
    if ($('mhtml').checked) {
      try {
        await download(folder, `snapshot-${quiz.pages.length}.mhtml`, await chrome.pageCapture.saveAsMHTML({ tabId: tab.id }));
      } catch (e) {
        console.warn('MHTML snapshot failed', e);
      }
    }
    if (missing) setStatus(`${statusEl.textContent}\n${missing} image(s) will only show when online — tick the image permission box and save again.`, 'ok');
  } catch (e) {
    console.error(e);
    setStatus(e.message || String(e), 'err');
  } finally {
    busy(false);
  }
}

async function saveAll() {
  busy(true);
  stopRequested = false;
  let quiz;
  let count = 0;
  let missing = 0;
  let why = '';
  try {
    const tab = await getTab();
    quiz = await startQuiz(tab);
    let lastSigs = '';
    for (let step = 0; step < 400; step++) {
      if (stopRequested) {
        why = 'Stopped.';
        break;
      }
      // Read the current question; after clicking Next, wait until a *different* question shows.
      let page;
      for (let tries = 0; tries < 10; tries++) {
        page = await extract(tab.id);
        const sigs = page.questions.map((q) => q.sig).join('#');
        if (step === 0 || sigs !== lastSigs) break;
        page = null;
        await sleep(600);
      }
      if (!page) {
        why = 'Reached the last question.';
        break;
      }
      if (!page.questions.length) {
        why = step === 0 ? 'No questions recognised on this page.' : 'A page without questions came up, so I stopped.';
        merge(quiz, page);
        break;
      }
      lastSigs = page.questions.map((q) => q.sig).join('#');
      missing += await inlineImages(page.questions);
      merge(quiz, page);
      count += page.questions.length;
      await saveQuiz(quiz);
      render(quiz);
      setStatus(`Saved ${count} question(s)… (${QuizSaverExport.allQuestions(quiz).length} in this quiz)`);

      const [res] = await chrome.scripting.executeScript({ target: { tabId: tab.id, frameIds: [page.quizFrameId] }, func: clickNext });
      if (!res?.result) {
        why = 'No “Next” button found — finished.';
        break;
      }
      await sleep(700);
    }
  } catch (e) {
    console.error(e);
    why = `Stopped: ${e.message || e}`;
  }
  try {
    if (quiz && quiz.pages.length) {
      await saveQuiz(quiz);
      await finish(quiz, why);
      if (missing) setStatus(`${statusEl.textContent}\n${missing} image(s) will only show when online — tick the image permission box and run again.`, 'ok');
    } else setStatus(why || 'Nothing saved.', 'err');
  } catch (e) {
    setStatus(e.message || String(e), 'err');
  } finally {
    busy(false);
  }
}

$('save').addEventListener('click', saveThisPage);
$('auto').addEventListener('click', saveAll);
$('stop').addEventListener('click', () => {
  stopRequested = true;
  setStatus('Stopping after this question…');
});

$('redownload').addEventListener('click', async () => {
  const quiz = await loadQuiz();
  if (!quiz) return;
  const name = $('name').value.trim();
  if (name) quiz.name = name;
  await saveQuiz(quiz);
  await finish(quiz);
});

$('reset').addEventListener('click', async () => {
  if (!confirm('Start a new quiz? Files you already downloaded are kept.')) return;
  await chrome.storage.local.remove('quiz');
  $('name').value = '';
  render(null);
  setStatus('Ready for a new quiz.');
});

// Cross-site images (e.g. diagrams on a CDN) and embedded frames need host access.
$('perm').addEventListener('change', (e) => {
  if (!e.target.checked) {
    chrome.permissions.remove(ALL);
    return;
  }
  chrome.permissions.request(ALL).then((granted) => (e.target.checked = granted));
});

(async () => {
  chrome.permissions.contains(ALL).then((has) => ($('perm').checked = has));
  render(await loadQuiz());
})();
