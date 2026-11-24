// Injected into the quiz page (and its frames) by the popup.
// The value of the final expression (a Promise) is returned to the popup, so
// this file must stay one self-contained expression with no outside references.
//
// Tuned for question-bank review screens such as Medify (GAMSAT/UCAT), whose
// class names are auto-generated, so it reads what you *see*: A–D option lists,
// green/red highlighting, "Your answer"/"Correct answer" labels, an
// "Explanation"/"Worked solution" section and a stimulus panel. Moodle review
// pages and ordinary radio-button quizzes are handled too.
(async () => {
  /* ---------- small helpers ---------- */
  const clean = (s) =>
    (s || '')
      .replace(/ /g, ' ')
      .replace(/[ \t\f\v]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .replace(/\n{2,}/g, '\n')
      .trim();
  const txt = (el) => (el ? clean(el.innerText ?? el.textContent) : '');
  const norm = (s) =>
    (s || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
  const $ = (root, sel) => root.querySelector(sel);
  const $$ = (root, sel) => [...root.querySelectorAll(sel)];
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const CHROME = 'nav, header, footer, [role=navigation], [role=banner], [role=contentinfo], script, style, noscript';
  const MARKER_LINE = /^\(?(your answer|your selection|your response|you answered|you selected|correct answer|the correct answer|correct|incorrect|wrong|selected)\)?[!.:]?$/i;

  const visible = (el) => !!(el && el.getClientRects().length) && getComputedStyle(el).visibility !== 'hidden';

  /** Text of `el` without the given descendants (works on hidden/collapsed nodes too). */
  // opts.dropLetter: remove a leading "A" / "A." option badge; opts.markers: collect and remove
  // label elements like "Your answer" / "Correct answer" (pushed into the given array).
  function textWithout(el, selectors, exclude, opts) {
    if (!el) return '';
    const marks = (exclude || []).filter((n) => n && n !== el && el.contains(n));
    marks.forEach((n) => n.setAttribute('data-qs-x', ''));
    const clone = el.cloneNode(true);
    marks.forEach((n) => n.removeAttribute('data-qs-x'));
    clone.querySelectorAll(`script,style,noscript,[data-qs-x]${selectors ? `,${selectors}` : ''}`).forEach((n) => n.remove());
    if (opts && opts.markers) {
      for (const n of clone.querySelectorAll('*')) {
        if (clone.contains(n) && n.childElementCount === 0 && MARKER_LINE.test(clean(n.textContent))) {
          opts.markers.push(clean(n.textContent));
          n.remove();
        }
      }
    }
    if (opts && opts.dropLetter) {
      const first = firstText(clone);
      if (first) {
        const t = first.textContent.trim();
        if (/^\(?[A-H]\)?[.):]?$/.test(t)) first.textContent = '';
        else first.textContent = first.textContent.replace(/^\s*\(?[A-Ha-h][.):]\s+/, '');
      }
    }
    clone.querySelectorAll('br,p,div,li,tr,h1,h2,h3,h4,h5,h6,section,article').forEach((n) => n.append('\n'));
    return clean(clone.textContent);
  }

  function imageData(img) {
    const src = img.currentSrc || img.src || '';
    const alt = img.alt || '';
    if (!src || src.startsWith('data:')) return { src, alt };
    try {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      if (!w || !h) throw new Error('not loaded');
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0);
      return { src: canvas.toDataURL(w * h > 600 * 600 ? 'image/jpeg' : 'image/png', 0.9), alt, original: src };
    } catch {
      // Cross-origin image (canvas is "tainted"): the popup downloads it instead.
      return { src, alt, original: src, onlineOnly: true };
    }
  }

  function svgData(svg) {
    try {
      const r = svg.getBoundingClientRect();
      if (r.width < 60 || r.height < 60) return null; // icons
      const clone = svg.cloneNode(true);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      if (!clone.getAttribute('width')) clone.setAttribute('width', Math.round(r.width));
      if (!clone.getAttribute('height')) clone.setAttribute('height', Math.round(r.height));
      return { src: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(clone.outerHTML)}`, alt: 'diagram' };
    } catch {
      return null;
    }
  }

  function imagesIn(el, exclude) {
    if (!el) return [];
    const skip = (n) => (exclude || []).some((x) => x && x !== el && x.contains(n));
    const imgs = $$(el, 'img')
      .filter((img) => !skip(img))
      .filter((img) => {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        return !(w && h && w <= 32 && h <= 32);
      })
      .map(imageData);
    const svgs = $$(el, 'svg')
      .filter((s) => !skip(s) && !s.parentElement.closest('svg'))
      .map(svgData)
      .filter(Boolean);
    const canvases = $$(el, 'canvas')
      .filter((c) => !skip(c) && c.width > 60)
      .map((c) => {
        try {
          return { src: c.toDataURL('image/png'), alt: 'chart' };
        } catch {
          return null;
        }
      })
      .filter(Boolean);
    return imgs.concat(svgs, canvases);
  }

  /** Read correct/incorrect markers from class names / labels. */
  function statusFrom(s) {
    s = (s || '').toLowerCase();
    if (/(^|[^a-z])(incorrect|wrong|not[\s_-]?correct|answer[\s_-]?wrong|is[\s_-]?error)/.test(s)) return 'incorrect';
    if (/partial/.test(s)) return 'partial';
    if (/(^|[^a-z])(correct|right[\s_-]?answer)([^a-z]|$)/.test(s)) return 'correct';
    return null;
  }
  const classOf = (el) => (typeof el.className === 'string' ? el.className : el.className?.baseVal || '');
  const attrString = (el) =>
    !el || !el.getAttribute
      ? ''
      : [classOf(el), el.getAttribute('data-status'), el.getAttribute('data-correct'), el.getAttribute('data-state'), el.getAttribute('data-testid')]
          .filter(Boolean)
          .join(' ');

  /** Text-less icons such as <i title="Correct"> or <svg aria-label="Incorrect">. */
  function iconStatus(el) {
    if (!el) return null;
    for (const icon of $$(el, '[title],[aria-label],img[alt],svg title')) {
      const own = icon.tagName.toLowerCase() === 'title' ? '' : clean(icon.textContent);
      if (own) continue;
      const s = statusFrom(
        `${icon.getAttribute?.('title') || ''} ${icon.getAttribute?.('aria-label') || ''} ${icon.getAttribute?.('alt') || ''} ${icon.tagName.toLowerCase() === 'title' ? icon.textContent : ''}`
      );
      if (s) return s;
    }
    return null;
  }

  /** Green = correct, red = wrong: review screens colour-code options even when class names are meaningless. */
  function hueOf(color) {
    const m = (color || '').match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?/);
    if (!m) return null;
    const [r, g, b] = [+m[1] / 255, +m[2] / 255, +m[3] / 255];
    const a = m[4] === undefined ? 1 : +m[4];
    if (a < 0.08) return null;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min || l > 0.97 || l < 0.1) return null;
    const s = (max - min) / (1 - Math.abs(2 * l - 1));
    if (s < 0.25) return null;
    let h;
    if (max === r) h = ((g - b) / (max - min)) % 6;
    else if (max === g) h = (b - r) / (max - min) + 2;
    else h = (r - g) / (max - min) + 4;
    h = (h * 60 + 360) % 360;
    if (h >= 85 && h <= 170) return 'correct';
    if (h <= 15 || h >= 340) return 'incorrect';
    return null;
  }
  function colorStatus(row) {
    const tally = { correct: 0, incorrect: 0 };
    const els = [row, ...$$(row, '*').slice(0, 60)];
    for (const el of els) {
      const cs = getComputedStyle(el);
      const picks = [cs.backgroundColor];
      if (parseFloat(cs.borderTopWidth) > 0 || parseFloat(cs.borderLeftWidth) > 0) picks.push(cs.borderTopColor, cs.borderLeftColor);
      if (parseFloat(cs.outlineWidth) > 0) picks.push(cs.outlineColor);
      if (el instanceof SVGElement) picks.push(cs.fill, cs.stroke, cs.color);
      for (const c of picks) {
        const k = hueOf(c);
        if (k) tally[k] += el === row ? 3 : 1;
      }
    }
    if (tally.correct > tally.incorrect) return 'correct';
    if (tally.incorrect > tally.correct) return 'incorrect';
    return null;
  }

  function firstText(el) {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) =>
        n.parentElement && !n.parentElement.closest('script,style') && n.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP,
    });
    return w.nextNode();
  }
  function letterOf(el) {
    const n = firstText(el);
    if (!n) return null;
    const t = n.textContent.trim();
    const m = t.match(/^\(?([A-H])\)?[.):]?$/) || t.match(/^\(?([A-H])[.):]\s+\S/);
    return m ? m[1] : null;
  }
  const stripLetter = (t) => t.replace(/^\(?[A-Ha-h1-9]\)?[.):]?\s*\n/, '').replace(/^\(?[A-Ha-h1-9][.)]\s+/, '').trim();

  /** Elements whose children are lettered A, B, C... options. Returns [{ list, rows }]. */
  function letteredLists() {
    const found = [];
    const taken = new Set();
    for (const list of $$(document.body, '*')) {
      if (list.childElementCount < 3 || list.closest(CHROME) || /^(SCRIPT|STYLE|SELECT|SVG|TABLE|TBODY)$/i.test(list.tagName)) continue;
      const kids = [...list.children].filter((k) => !/^(SCRIPT|STYLE)$/.test(k.tagName));
      const letters = kids.map(letterOf);
      const start = letters.indexOf('A');
      if (start < 0) continue;
      const rows = [];
      for (let i = start; i < kids.length && letters[i] === String.fromCharCode(65 + rows.length); i++) rows.push(kids[i]);
      if (rows.length < 3 || rows.some((r) => taken.has(r))) continue;
      // A passage with "A. ... B. ..." paragraphs is not an answer list: options are short-ish.
      if (rows.every((r) => textWithout(r).length > 600)) continue;
      rows.forEach((r) => taken.add(r));
      found.push({ list, rows });
    }
    return found;
  }
  const CONTROL_SEL = 'input[type=radio], input[type=checkbox], [role=radio], [role=checkbox]';
  const answerBlockers = () => [...letteredLists().map((l) => l.list), ...$$(document, CONTROL_SEL)];

  /* ---------- expand hidden explanations ---------- */
  const EXPLAIN_HEAD = /^(answer\s+|full\s+|detailed\s+)?(explanations?|worked\s+solutions?|solutions?|rationale|answer\s+and\s+explanation)\s*:?$/i;
  function findExplanations(blockers) {
    const blocked = (n) => blockers.some((b) => n.contains(b) && !b.contains(n));
    const heads = $$(document.body, 'h1,h2,h3,h4,h5,h6,strong,b,p,span,div,button,summary,[role=tab],[role=heading],label').filter(
      (el) => el.childElementCount <= 2 && EXPLAIN_HEAD.test(clean(el.textContent)) && !el.closest(CHROME)
    );
    const blocks = [];
    for (const head of heads) {
      if (blocks.some((b) => b.contains(head))) continue;
      let block = head;
      const headLen = clean(head.textContent).length;
      for (let i = 0; i < 5 && block.parentElement && block.parentElement !== document.body; i++) {
        if (blocked(block.parentElement)) break; // never swallow the answer options
        block = block.parentElement;
        if (textWithout(block).length > headLen + 15) break;
      }
      // Tabs: the explanation lives in the tab panel, not next to the tab.
      if (head.getAttribute('role') === 'tab' && head.getAttribute('aria-controls')) {
        const panel = document.getElementById(head.getAttribute('aria-controls'));
        if (panel) block = panel;
      }
      if (textWithout(block).length > headLen + 15 && !blocks.some((b) => block.contains(b))) blocks.push(block);
    }
    return blocks;
  }
  async function expandExplanations() {
    if (findExplanations(answerBlockers()).length) return;
    const toggles = $$(document.body, 'button, [role=button], [role=tab], summary, a').filter((el) => {
      const t = clean(el.textContent || el.getAttribute('aria-label') || '');
      return (
        t.length < 40 &&
        /^(show|view|reveal|see|open)?\s*(the\s+)?(full\s+|answer\s+)?(explanations?|worked\s+solutions?|solutions?|rationale)\b/i.test(t) &&
        el.getAttribute('aria-expanded') !== 'true' &&
        el.getAttribute('aria-selected') !== 'true' &&
        !el.closest(CHROME) &&
        visible(el)
      );
    });
    if (!toggles.length) return;
    toggles.slice(0, 20).forEach((el) => el.click());
    await sleep(700);
  }

  /* ---------- Moodle (university LMS) ---------- */
  function moodle() {
    const ques = $$(document, '.que').filter((q) => $(q, '.qtext, .formulation'));
    if (!ques.length) return null;
    return ques.map((q, i) => {
      const cls = q.className;
      let status = /\bnotanswered\b/.test(cls)
        ? 'unanswered'
        : /\bpartiallycorrect\b/.test(cls)
          ? 'partial'
          : /\bincorrect\b/.test(cls)
            ? 'incorrect'
            : /\bcorrect\b/.test(cls)
              ? 'correct'
              : null;
      if (!status) status = statusFrom(txt($(q, '.state')));
      const qtextEl = $(q, '.qtext') || $(q, '.formulation');
      const question = {
        number: txt($(q, '.qno')) || String(i + 1),
        type: 'other',
        text: textWithout(qtextEl, '.accesshide, .sr-only'),
        images: imagesIn(qtextEl),
        stimulus: null,
        options: [],
        userAnswer: null,
        correctAnswer: null,
        status,
        mark: txt($(q, '.grade')) || null,
        feedback: [txt($(q, '.specificfeedback')), txt($(q, '.generalfeedback'))].filter(Boolean).join('\n') || null,
        source: 'moodle',
      };
      const right = txt($(q, '.rightanswer'));
      if (right) question.correctAnswer = right.replace(/^the correct answers? (is|are)\s*:?\s*/i, '').replace(/^['"](.*)['"]\.?$/, '$1').trim();
      const optEls = $$(q, '.answer > div, .answer > li, .answer tr').filter((o) => $(o, 'input[type=radio], input[type=checkbox]'));
      if (optEls.length) {
        question.type = $(optEls[0], 'input[type=radio], input[type=checkbox]').type === 'checkbox' ? 'multiple' : 'single';
        question.options = optEls.map((o) => {
          const input = $(o, 'input[type=radio], input[type=checkbox]');
          const labelEl = $(o, '[data-region="answer-label"]') || $(o, 'label') || o;
          const t = textWithout(labelEl, '.answernumber, .accesshide, .sr-only, input') || textWithout(o, '.answernumber, .accesshide, .sr-only, input');
          const s = statusFrom(attrString(o)) || iconStatus(o);
          return {
            text: stripLetter(t),
            images: imagesIn(labelEl),
            selected: !!(input.checked || input.hasAttribute('checked')),
            correct: s === 'correct' ? true : s === 'incorrect' ? false : null,
          };
        });
      } else {
        const textInput = $(q, '.answer input[type=text], .ablock input[type=text]');
        if (textInput) {
          question.type = 'text';
          question.userAnswer = textInput.value || textInput.getAttribute('value') || '';
        } else {
          question.userAnswer = textWithout($(q, '.ablock, .answer'), '.accesshide, .sr-only') || null;
        }
      }
      return question;
    });
  }

  /* ---------- Question banks (Medify etc.) and generic quizzes ---------- */
  function generic() {
    const lists = letteredLists();
    const explanations = findExplanations([...lists.map((l) => l.list), ...$$(document, CONTROL_SEL)]);
    const inExplanation = (el) => explanations.some((b) => b.contains(el));
    const skip = (el) => !!el.closest(CHROME) || inExplanation(el);
    const groups = []; // { rows: Element[], controls: (Element|null)[], multi: bool }

    // 1) Lettered option lists: siblings whose text starts A, B, C, D...
    const taken = new Set();
    for (const { list, rows } of lists) {
      if (skip(list)) continue;
      rows.forEach((r) => taken.add(r));
      const controls = rows.map((r) => $(r, CONTROL_SEL));
      const multi = controls.some((c) => c && (c.type === 'checkbox' || c.getAttribute('role') === 'checkbox'));
      groups.push({ rows, controls, multi, lettered: true });
    }

    // 2) Radio buttons / checkboxes not already inside a lettered list.
    const controls = $$(document, 'input[type=radio], input[type=checkbox], [role=radio], [role=checkbox]').filter(
      (c) => !skip(c) && ![...taken].some((r) => r.contains(c))
    );
    const nameCount = {};
    controls.forEach((c) => c.name && (nameCount[c.name] = (nameCount[c.name] || 0) + 1));
    const isBox = (c) => c.type === 'checkbox' || c.getAttribute('role') === 'checkbox';
    const byKey = new Map();
    for (const c of controls) {
      let key;
      if (c.tagName === 'INPUT' && c.name && (nameCount[c.name] > 1 || !isBox(c))) key = `${c.form ? [...document.forms].indexOf(c.form) : '-'}:${c.name}`;
      else if (c.tagName === 'INPUT') {
        key = c.parentElement;
        while (key && key !== document.body && $$(key, 'input[type=checkbox]').length < 2) key = key.parentElement;
      } else key = c.closest('[role=radiogroup], [role=group], [role=list], fieldset') || c.parentElement?.parentElement;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(c);
    }
    for (const els of byKey.values()) {
      if (els.length < 2) continue;
      const labels = els.map((c) => (c.tagName !== 'INPUT' ? c : c.labels?.[0] || c.closest('label') || c.parentElement));
      // Each option's "row" = the biggest ancestor of its label that holds no other option.
      const rows = labels.map((l, i) => {
        let row = l.contains(els[i]) ? l : l.parentElement?.contains(els[i]) ? l.parentElement : l;
        while (row.parentElement && !els.some((o, j) => j !== i && row.parentElement.contains(o))) row = row.parentElement;
        return row;
      });
      groups.push({ rows, controls: els, multi: isBox(els[0]), labels });
    }
    if (!groups.length) return null;
    groups.sort((a, b) => (a.rows[0].compareDocumentPosition(b.rows[0]) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));

    const allRows = groups.flatMap((g) => g.rows);
    const pageText = txt(document.body);
    const qOf = pageText.match(/question\s+(\d+)\s*(?:of|\/)\s*(\d+)/i);
    const usedExpl = new Set();

    return groups.map((g, gi) => {
      const others = allRows.filter((r) => !g.rows.includes(r));
      const holdsOthers = (n) => others.some((r) => n.contains(r));
      let container = g.rows[0].parentElement;
      while (container && !g.rows.every((r) => container.contains(r))) container = container.parentElement;
      const exclude = () => [...g.rows, ...explanations];
      const ownText = (n) => textWithout(n, 'button, [role=button], [role=tab], [role=progressbar]', exclude());
      for (let i = 0; i < 6 && container.parentElement && container.parentElement !== document.body && ownText(container).length < 3; i++) {
        if (holdsOthers(container.parentElement)) break;
        container = container.parentElement;
      }
      let text = ownText(container);
      const lines = text.split('\n');
      let status = statusFrom(attrString(container)) || statusFrom(attrString(container.parentElement));
      const kept = lines.filter((line) => {
        if (MARKER_LINE.test(line)) {
          status = status || statusFrom(line);
          return false;
        }
        return !/^question\s+\d+\s*(of|\/)\s*\d+$/i.test(line);
      });
      text = kept.join('\n');

      // Explanation nearest to this question.
      let explanation = null;
      for (let a = container, i = 0; a && i < 6 && !explanation; a = a.parentElement, i++) {
        if (i > 0 && holdsOthers(a)) break;
        explanation = explanations.find((b) => !usedExpl.has(b) && a.contains(b)) || null;
      }
      if (!explanation && groups.length === 1 && explanations.length) explanation = explanations[0];
      if (explanation) usedExpl.add(explanation);

      // Stimulus / passage: substantial content beside the question (e.g. the left-hand pane).
      let stimulus = null;
      for (let node = container, i = 0; node.parentElement && node.parentElement !== document.body && i < 6; node = node.parentElement, i++) {
        const sibs = [...node.parentElement.children].filter(
          (s) => s !== node && !s.matches(CHROME) && !holdsOthers(s) && !explanations.some((b) => s === b || s.contains(b) || b.contains(s)) && !s.contains(container)
        );
        const parts = sibs
          .map((s) => ({ text: textWithout(s, 'button, [role=button], [role=tab], [role=progressbar], ' + CHROME), images: imagesIn(s, others) }))
          .filter((p) => p.text.length > 120 || p.images.length);
        if (parts.length) {
          stimulus = { text: parts.map((p) => p.text).join('\n\n'), images: parts.flatMap((p) => p.images) };
          break;
        }
        if (holdsOthers(node.parentElement)) break;
      }

      const options = g.rows.map((row, i) => {
        const control = g.controls[i];
        const found = [];
        const raw = textWithout(row, 'input', [], { dropLetter: true, markers: found });
        let optLines = raw.split('\n');
        let marker = found.join(' ');
        optLines = optLines.filter((l) => {
          if (MARKER_LINE.test(l)) {
            marker += ` ${l}`;
            return false;
          }
          return true;
        });
        let t = optLines.join('\n').replace(/\((your answer|correct answer|you answered)\)/gi, (m) => ((marker += ` ${m}`), ''));
        t = clean(control && control.getAttribute('role') && !g.lettered ? control.getAttribute('aria-label') || t : t);
        const rowAttrs = [row, ...$$(row, '*').slice(0, 40)].map(attrString).join(' ');
        let selected = false;
        if (control) selected = control.tagName === 'INPUT' ? control.checked || control.hasAttribute('checked') : control.getAttribute('aria-checked') === 'true';
        if (!selected)
          selected =
            [row, ...$$(row, '[aria-selected],[aria-checked],[aria-pressed]')].some(
              (n) => n.getAttribute('aria-selected') === 'true' || n.getAttribute('aria-checked') === 'true' || n.getAttribute('aria-pressed') === 'true'
            ) ||
            /(^|[\s_-])(selected|chosen|picked|user-?answer|your-?answer|is-?checked)([\s_-]|$)/i.test(rowAttrs) ||
            /your (answer|selection|response)|you (answered|selected)/i.test(marker);
        let s = /correct answer/i.test(marker) ? 'correct' : statusFrom(marker);
        if (!s) s = statusFrom(rowAttrs) || iconStatus(row) || colorStatus(row);
        return {
          text: t,
          images: imagesIn(row),
          selected,
          correct: s === 'correct' ? true : s === 'incorrect' ? false : null,
          marked: s, // raw visual mark, used to infer your pick on screens without inputs
        };
      });

      // "Correct answer: C" / "You answered B" written as text near the question.
      const near = `${textWithout(container.parentElement || container, CHROME)}\n${explanation ? textWithout(explanation) : ''}`;
      const ca = near.match(/correct\s+answer\s*(?:is|was|:|-)?\s*(?:option\s*)?\(?([A-H])\)?(?![a-z])/i);
      const ya = near.match(/(?:your|you)\s+(?:answer(?:ed)?|selected|chose)\s*(?:is|was|:|-)?\s*(?:option\s*)?\(?([A-H])\)?(?![a-z])/i);
      const idx = (m) => (m ? m[1].toUpperCase().charCodeAt(0) - 65 : -1);
      if (idx(ca) >= 0 && idx(ca) < options.length) options.forEach((o, k) => (o.correct = k === idx(ca)));
      if (idx(ya) >= 0 && idx(ya) < options.length && !options.some((o) => o.selected)) options[idx(ya)].selected = true;

      return {
        number: groups.length === 1 && qOf ? qOf[1] : String(gi + 1),
        type: g.multi ? 'multiple' : 'single',
        text,
        images: imagesIn(container, [...g.rows, ...explanations]),
        stimulus,
        options,
        userAnswer: null,
        correctAnswer: null,
        status,
        mark: null,
        feedback: explanation ? textWithout(explanation, 'button').replace(/^[^\n]{0,40}\n/, (l) => (EXPLAIN_HEAD.test(l.trim()) ? '' : l)) || null : null,
        feedbackImages: explanation ? imagesIn(explanation) : [],
        hasControls: g.controls.some(Boolean),
        source: 'generic',
      };
    });
  }

  /* ---------- tidy up / infer answers ---------- */
  function finalize(q) {
    const opts = q.options;
    if (q.correctAnswer && opts.length) {
      const ca = norm(q.correctAnswer);
      let matched = false;
      for (const o of opts) {
        const on = norm(o.text);
        if (on && (ca === on || (q.type === 'multiple' && ` ${ca} `.includes(` ${on} `)))) matched = o.correct = true;
      }
      if (!matched && q.type === 'single') {
        const best = opts
          .filter((o) => norm(o.text) && ` ${ca} `.includes(` ${norm(o.text)} `))
          .sort((a, b) => norm(b.text).length - norm(a.text).length)[0];
        if (best) matched = best.correct = true;
      }
      if (matched) opts.forEach((o) => o.correct === null && (o.correct = false));
    }
    // Review screens without inputs: red option = your wrong pick; a lone green with no red = you got it right.
    if (opts.length && !opts.some((o) => o.selected) && q.status !== 'unanswered') {
      const red = opts.filter((o) => o.marked === 'incorrect');
      const green = opts.filter((o) => o.marked === 'correct');
      if (red.length) red.forEach((o) => (o.selected = true));
      else if (green.length === 1 && q.type === 'single' && q.status !== 'incorrect') {
        green[0].selected = true;
        q.selectionInferred = true;
      }
    }
    const selected = opts.filter((o) => o.selected);
    if (q.status === 'correct' && opts.length) {
      selected.forEach((o) => o.correct === null && (o.correct = true));
      if (q.type === 'single') opts.forEach((o) => o.correct === null && (o.correct = false));
    }
    if (q.type === 'single') {
      if (opts.some((o) => o.correct === true)) opts.forEach((o) => o.correct === null && (o.correct = false));
      if (q.status === 'incorrect') {
        selected.forEach((o) => o.correct === null && (o.correct = false));
        const unknown = opts.filter((o) => o.correct === null);
        if (unknown.length === 1 && !opts.some((o) => o.correct === true)) unknown[0].correct = true;
      }
      if (!q.status && selected.length === 1 && selected[0].correct !== null) q.status = selected[0].correct ? 'correct' : 'incorrect';
      if (!q.status && !selected.length && opts.some((o) => o.correct === true) && q.hasControls) q.status = 'unanswered';
    }
    if (q.type === 'multiple' && !q.status && opts.length && opts.every((o) => o.correct !== null)) {
      q.status = opts.every((o) => o.selected === o.correct) ? 'correct' : 'incorrect';
    }
    opts.forEach((o) => delete o.marked);
    if (opts.length) {
      q.userAnswer = selected.map((o) => `${String.fromCharCode(65 + opts.indexOf(o))}. ${o.text}`).join('; ') || null;
      if (opts.some((o) => o.correct === true))
        q.correctAnswer = opts
          .filter((o) => o.correct === true)
          .map((o) => `${String.fromCharCode(65 + opts.indexOf(o))}. ${o.text}`)
          .join('; ');
    }
    if (q.type === 'text' && q.status === 'correct' && !q.correctAnswer && q.userAnswer) q.correctAnswer = q.userAnswer;
    q.correctKnown = !!q.correctAnswer || opts.some((o) => o.correct === true);
    q.sig = `${norm(q.text).slice(0, 400)}|${opts.map((o) => norm(o.text).slice(0, 80)).join('|')}`;
    delete q.hasControls;
    return q;
  }

  await expandExplanations();

  let questions = [];
  let detectedBy = null;
  for (const [name, fn] of [
    ['moodle', moodle],
    ['generic', generic],
  ]) {
    try {
      const found = fn();
      if (found && found.length) {
        questions = found.map(finalize);
        detectedBy = name;
        break;
      }
    } catch (e) {
      console.warn('[Quiz Saver]', name, 'extractor failed', e);
    }
  }

  return {
    url: location.href,
    title: document.title,
    isTopFrame: window === window.top,
    detectedBy,
    questions,
    pageText: clean(document.body ? document.body.innerText : '').slice(0, 400000),
  };
})();
