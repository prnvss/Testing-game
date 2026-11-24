// Turns a saved quiz into the files that get downloaded.
// Loaded by popup.html; also usable from Node for testing (globalThis.QuizSaverExport).
(function (root) {
  const STATUS_LABEL = {
    correct: 'Correct',
    incorrect: 'Incorrect',
    partial: 'Partially correct',
    unanswered: 'Not answered',
  };

  function hash(s) {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  function allQuestions(quiz) {
    const out = [];
    quiz.pages.forEach((page, p) =>
      page.questions.forEach((q) =>
        out.push({ ...q, page: p + 1, uid: q.sig ? hash(q.sig) : `${p + 1}-${out.length + 1}` })
      )
    );
    return out;
  }
  const sameStimulus = (a, b) => !!(a && b && a.text === b.text && a.images.length === b.images.length);

  function summary(questions) {
    const s = { total: questions.length, correct: 0, incorrect: 0, partial: 0, unanswered: 0, unknown: 0 };
    questions.forEach((q) => (q.status in s ? s[q.status]++ : s.unknown++));
    return s;
  }

  /* ---------------- Markdown (easy to paste to an AI / read anywhere) ---------------- */
  function toMarkdown(quiz) {
    const qs = allQuestions(quiz);
    const s = summary(qs);
    const lines = [
      `# ${quiz.name}`,
      '',
      `Saved ${new Date(quiz.updatedAt).toLocaleString()} from ${quiz.pages.length} page(s).`,
      `Questions: ${s.total} · correct ${s.correct} · incorrect ${s.incorrect} · partial ${s.partial} · unanswered ${s.unanswered}`,
      '',
      'Legend: [x] = my answer · ✅ = correct answer · ❌ = marked wrong',
      '',
    ];
    qs.forEach((q, i) => {
      lines.push(`## Q${i + 1}${q.number && q.number !== String(i + 1) ? ` (page label: ${q.number})` : ''} — ${STATUS_LABEL[q.status] || 'Result unknown'}`);
      if (q.mark) lines.push(`*${q.mark}*`);
      if (q.stimulus) {
        const prev = qs.findIndex((o) => sameStimulus(o.stimulus, q.stimulus));
        if (prev < i) lines.push('', `**Stimulus:** same as Q${prev + 1}`);
        else {
          lines.push('', '**Stimulus:**', '', `> ${q.stimulus.text.replace(/\n/g, '\n> ')}`);
          q.stimulus.images.forEach((im, k) => lines.push(`\n[Stimulus image ${k + 1}${im.alt ? `: ${im.alt}` : ''} — see quiz.json / quiz-practice.html]`));
        }
        lines.push('', '**Question:**');
      }
      lines.push('', q.text || '_(no question text found)_');
      q.images.forEach((im, k) => lines.push(`\n[Image ${k + 1}${im.alt ? `: ${im.alt}` : ''} — included in quiz.json / quiz-practice.html]`));
      lines.push('');
      if (q.options.length) {
        q.options.forEach((o, k) => {
          const letter = String.fromCharCode(65 + k);
          const mark = o.correct === true ? ' ✅' : o.correct === false && o.selected ? ' ❌' : '';
          lines.push(`- [${o.selected ? 'x' : ' '}] ${letter}. ${o.text || '(image option)'}${mark}`);
        });
        lines.push('');
      }
      lines.push(`**My answer:** ${q.userAnswer || '_(none)_'}${q.selectionInferred ? ' _(inferred: only the correct option was highlighted)_' : ''}`);
      lines.push(`**Correct answer:** ${q.correctAnswer || '_(not shown on the page)_'}`);
      if (q.feedback) lines.push('', '**Explanation:**', '', `> ${q.feedback.replace(/\n/g, '\n> ')}`);
      lines.push('', '---', '');
    });
    if (!qs.length) {
      lines.push('No questions were recognised automatically. The full page text is below.', '');
      quiz.pages.forEach((p, i) => lines.push(`## Page ${i + 1}: ${p.title}`, '', '```', p.pageText, '```', ''));
    }
    return lines.join('\n');
  }

  function toPageText(quiz) {
    return quiz.pages
      .map((p, i) => `===== Page ${i + 1}: ${p.title}\n${p.url}\nSaved ${p.capturedAt}\n\n${p.pageText}`)
      .join('\n\n');
  }

  /* ---------------- Self-contained offline review + practice page ---------------- */
  function toPracticeHtml(quiz) {
    const data = {
      name: quiz.name,
      id: quiz.id,
      savedAt: quiz.updatedAt,
      questions: allQuestions(quiz).map((q) => ({
        uid: q.uid,
        number: q.number,
        type: q.type,
        text: q.text,
        images: q.images || [],
        stimulus: q.stimulus || null,
        options: q.options,
        userAnswer: q.userAnswer,
        correctAnswer: q.correctAnswer,
        status: q.status,
        mark: q.mark,
        feedback: q.feedback,
        feedbackImages: q.feedbackImages || [],
        selectionInferred: !!q.selectionInferred,
      })),
    };
    // Questions sharing one stimulus (common in GAMSAT units) only store it once.
    data.questions.forEach((q, i) => {
      if (!q.stimulus) return;
      const first = data.questions.findIndex((o) => sameStimulus(o.stimulus, q.stimulus));
      if (first < i) q.stimulus = { sameAs: first };
    });
    const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(quiz.name)} – offline</title>
<style>
:root{--bg:#f6f7f9;--card:#fff;--fg:#1d2330;--muted:#5d6678;--line:#dde1e8;--accent:#3157d5;--good:#16794a;--good-bg:#e3f5eb;--bad:#b4232c;--bad-bg:#fbe6e7;--warn:#8a5a00;--warn-bg:#fdf1d8;--radius:12px}
@media (prefers-color-scheme:dark){:root{--bg:#12151b;--card:#1b2029;--fg:#e8ebf1;--muted:#9aa3b5;--line:#2c3340;--accent:#7d9bff;--good:#5fd39a;--good-bg:#183428;--bad:#ff8c93;--bad-bg:#3a1d21;--warn:#f3c56b;--warn-bg:#3a2f17}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
main{max-width:820px;margin:0 auto;padding:16px 16px 80px}
h1{font-size:1.4rem;margin:8px 0 4px}
.muted{color:var(--muted)}
.tabs{display:flex;gap:8px;margin:16px 0;position:sticky;top:0;background:var(--bg);padding:8px 0;z-index:2;flex-wrap:wrap}
button,.btn{font:inherit;border:1px solid var(--line);background:var(--card);color:var(--fg);padding:8px 14px;border-radius:999px;cursor:pointer}
button.primary{background:var(--accent);border-color:var(--accent);color:#fff}
button[aria-pressed=true]{background:var(--fg);color:var(--bg);border-color:var(--fg)}
button:disabled{opacity:.5;cursor:default}
.card{background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:16px;margin:12px 0}
.qhead{display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap}
.pill{font-size:.8rem;padding:2px 10px;border-radius:999px;background:var(--line)}
.pill.correct{background:var(--good-bg);color:var(--good)}.pill.incorrect{background:var(--bad-bg);color:var(--bad)}.pill.partial,.pill.unanswered{background:var(--warn-bg);color:var(--warn)}
.qtext{white-space:pre-wrap;margin:0 0 12px}
img{max-width:100%;height:auto;border-radius:8px;margin:6px 0}
ul.opts{list-style:none;padding:0;margin:0;display:grid;gap:8px}
.opt{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border:1px solid var(--line);border-radius:10px}
.opt .letter{font-weight:600;min-width:1.4em}
.opt.is-correct{border-color:var(--good);background:var(--good-bg)}
.opt.is-wrong{border-color:var(--bad);background:var(--bad-bg)}
.opt .tag{margin-left:auto;font-size:.8rem;white-space:nowrap;color:var(--muted)}
label.opt{cursor:pointer}
label.opt input{margin-top:4px}
.answers{margin-top:12px;display:grid;gap:4px}
.feedback{margin-top:10px;padding:10px 12px;border-left:3px solid var(--accent);background:var(--bg);white-space:pre-wrap;border-radius:6px}
.row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-top:12px}
input[type=text],textarea{font:inherit;width:100%;padding:10px;border-radius:10px;border:1px solid var(--line);background:var(--bg);color:var(--fg)}
.result{margin-top:12px;padding:10px 12px;border-radius:10px}
.result.good{background:var(--good-bg);color:var(--good)}.result.bad{background:var(--bad-bg);color:var(--bad)}.result.meh{background:var(--warn-bg);color:var(--warn)}
.stats{display:flex;gap:12px;flex-wrap:wrap;margin-top:8px}
.stats span{font-size:.9rem}
.progress{height:6px;background:var(--line);border-radius:6px;overflow:hidden;margin:8px 0}
.progress i{display:block;height:100%;background:var(--accent)}
fieldset{border:0;padding:0;margin:0 0 12px}
legend{font-weight:600;margin-bottom:6px}
.empty{text-align:center;padding:32px 16px}
[hidden]{display:none!important}
details.stim{margin:0 0 12px;border:1px solid var(--line);border-radius:10px;padding:10px 12px;background:var(--bg)}
details.stim summary{cursor:pointer;font-weight:600;color:var(--muted)}
details.stim .stimtext{white-space:pre-wrap;margin:8px 0 0}
.feedback h3{margin:0 0 4px;font-size:.9rem}
</style>
</head>
<body>
<main>
  <h1 id="title"></h1>
  <p class="muted" id="sub"></p>
  <div class="stats" id="stats"></div>
  <nav class="tabs">
    <button id="tab-review" aria-pressed="true">Review answers</button>
    <button id="tab-practice" aria-pressed="false">Practice again</button>
  </nav>
  <section id="review"></section>
  <section id="practice" hidden></section>
</main>
<script id="quiz-data" type="application/json">${json}</script>
<script>
(function(){
  var DATA = JSON.parse(document.getElementById('quiz-data').textContent);
  var QS = DATA.questions;
  var LABEL = {correct:'Correct',incorrect:'Incorrect',partial:'Partially correct',unanswered:'Not answered'};
  var store = {
    get: function(k){ try { return JSON.parse(localStorage.getItem('quizsaver:'+DATA.id+':'+k)); } catch(e){ return null; } },
    set: function(k,v){ try { localStorage.setItem('quizsaver:'+DATA.id+':'+k, JSON.stringify(v)); } catch(e){} }
  };
  function h(tag, attrs, kids){
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'text') el.textContent = attrs[k];
      else if (k === 'class') el.className = attrs[k];
      else if (k.slice(0,2) === 'on') el.addEventListener(k.slice(2), attrs[k]);
      else if (attrs[k] !== false && attrs[k] != null) el.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    }
    (kids || []).forEach(function(c){ if (c != null) el.append(c); });
    return el;
  }
  function letter(i){ return String.fromCharCode(65 + i); }
  function imgs(list){ return (list || []).map(function(im){ return h('img', {src: im.src, alt: im.alt || ''}); }); }
  function norm(s){ return (s || '').toLowerCase().replace(/[^\\p{L}\\p{N}.]+/gu, ' ').trim(); }
  function stimulus(q, open){
    if (!q.stimulus) return null;
    var s = q.stimulus, label = 'Stimulus';
    if (s.sameAs != null) { label = 'Stimulus (same as Question ' + (s.sameAs + 1) + ')'; s = QS[s.sameAs].stimulus; }
    var d = h('details', {class:'stim', open: open}, [h('summary', {text: label}), h('p', {class:'stimtext', text: s.text})].concat(imgs(s.images)));
    return d;
  }
  function explanation(q){
    if (!q.feedback && !(q.feedbackImages || []).length) return null;
    return h('div', {class:'feedback'}, [h('h3', {text:'Explanation'}), h('div', {text: q.feedback || ''})].concat(imgs(q.feedbackImages)));
  }
  function isMistake(q){ return q.status === 'incorrect' || q.status === 'partial' || q.status === 'unanswered'; }

  document.title = DATA.name + ' – offline';
  document.getElementById('title').textContent = DATA.name;
  document.getElementById('sub').textContent = QS.length + ' questions · saved ' + new Date(DATA.savedAt).toLocaleString();
  var counts = {correct:0,incorrect:0,partial:0,unanswered:0};
  QS.forEach(function(q){ if (q.status in counts) counts[q.status]++; });
  var stats = document.getElementById('stats');
  Object.keys(counts).forEach(function(k){ if (counts[k]) stats.append(h('span', {class:'pill '+k, text: LABEL[k] + ': ' + counts[k]})); });

  /* ---------- Review tab ---------- */
  var reviewFilter = store.get('reviewFilter') || 'all';
  function renderReview(){
    var root = document.getElementById('review');
    root.replaceChildren();
    var bar = h('div', {class:'row'}, [
      h('button', {'aria-pressed': String(reviewFilter === 'all'), text: 'All (' + QS.length + ')', onclick: function(){ reviewFilter = 'all'; store.set('reviewFilter', 'all'); renderReview(); }}),
      h('button', {'aria-pressed': String(reviewFilter === 'mistakes'), text: 'Mistakes only (' + QS.filter(isMistake).length + ')', onclick: function(){ reviewFilter = 'mistakes'; store.set('reviewFilter', 'mistakes'); renderReview(); }})
    ]);
    root.append(bar);
    var list = QS.filter(function(q){ return reviewFilter === 'all' || isMistake(q); });
    if (!list.length) root.append(h('div', {class:'card empty', text: 'No mistakes recorded — nice.'}));
    list.forEach(function(q){
      var i = QS.indexOf(q);
      var card = h('article', {class:'card'}, [
        h('div', {class:'qhead'}, [
          h('strong', {text: 'Question ' + (i + 1)}),
          h('span', {class:'pill ' + (q.status || ''), text: (LABEL[q.status] || 'Result unknown') + (q.mark ? ' · ' + q.mark : '')})
        ]),
        stimulus(q, !q.stimulus || q.stimulus.sameAs == null),
        h('p', {class:'qtext', text: q.text || '(no question text found)'})
      ].concat(imgs(q.images)));
      if (q.options.length) {
        card.append(h('ul', {class:'opts'}, q.options.map(function(o, k){
          var cls = 'opt' + (o.correct === true ? ' is-correct' : (o.selected && o.correct === false ? ' is-wrong' : ''));
          var tag = [o.selected ? 'Your answer' : '', o.correct === true ? '✓ correct' : (o.selected && o.correct === false ? '✗' : '')].filter(Boolean).join(' · ');
          return h('li', {class: cls}, [h('span', {class:'letter', text: letter(k) + '.'}), h('span', {}, [o.text].concat(imgs(o.images))), tag ? h('span', {class:'tag', text: tag}) : null]);
        })));
      }
      card.append(h('div', {class:'answers'}, [
        h('div', {}, [h('strong', {text: 'Your answer: '}), (q.userAnswer || '(none)') + (q.selectionInferred ? ' (inferred — only the correct option was highlighted)' : '')]),
        h('div', {}, [h('strong', {text: 'Correct answer: '}), q.correctAnswer || '(not shown on the original page)'])
      ]));
      var ex = explanation(q); if (ex) card.append(ex);
      root.append(card);
    });
  }

  /* ---------- Practice tab ---------- */
  var session = null;
  function shuffle(a){ a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function renderPracticeSetup(){
    var root = document.getElementById('practice');
    root.replaceChildren();
    var prefs = store.get('prefs') || {which: 'all', shuffleQ: false, shuffleO: true};
    var mistakes = QS.filter(isMistake).length;
    var last = store.get('lastScore');
    function radio(name, value, label, checked){ return h('label', {class:'opt'}, [h('input', {type:'radio', name: name, value: value, checked: checked}), label]); }
    function check(name, label, checked){ return h('label', {class:'opt'}, [h('input', {type:'checkbox', name: name, checked: checked}), label]); }
    var form = h('form', {class:'card'}, [
      h('fieldset', {}, [h('legend', {text: 'Which questions?'}), h('div', {class:'opts', style:'display:grid;gap:8px'}, [
        radio('which', 'all', 'All ' + QS.length + ' questions', prefs.which === 'all'),
        radio('which', 'mistakes', 'Only the ones I got wrong (' + mistakes + ')', prefs.which === 'mistakes'),
        radio('which', 'missed', 'Only ones I missed last practice (' + ((store.get('missed') || []).length) + ')', prefs.which === 'missed')
      ])]),
      h('fieldset', {}, [h('legend', {text: 'Options'}), h('div', {style:'display:grid;gap:8px'}, [
        check('shuffleQ', 'Shuffle question order', prefs.shuffleQ),
        check('shuffleO', 'Shuffle answer options', prefs.shuffleO)
      ])]),
      last ? h('p', {class:'muted', text: 'Last practice: ' + last.score + ' / ' + last.total + ' (' + new Date(last.at).toLocaleString() + ')'}) : null,
      h('button', {class:'primary', type:'submit', text:'Start'})
    ]);
    form.addEventListener('submit', function(e){
      e.preventDefault();
      var fd = new FormData(form);
      prefs = {which: fd.get('which') || 'all', shuffleQ: fd.has('shuffleQ'), shuffleO: fd.has('shuffleO')};
      store.set('prefs', prefs);
      var pool = QS;
      if (prefs.which === 'mistakes') pool = QS.filter(isMistake);
      if (prefs.which === 'missed') { var m = store.get('missed') || []; pool = QS.filter(function(q){ return m.indexOf(q.uid) >= 0; }); }
      if (!pool.length) { alert('No questions in that set.'); return; }
      if (prefs.shuffleQ) pool = shuffle(pool);
      session = {pool: pool, idx: 0, score: 0, missed: [], shuffleO: prefs.shuffleO};
      renderQuestion();
    });
    root.append(form);
  }

  function renderQuestion(){
    var root = document.getElementById('practice');
    root.replaceChildren();
    var q = session.pool[session.idx];
    var order = q.options.map(function(_, k){ return k; });
    if (session.shuffleO && q.type !== 'other') order = shuffle(order);
    var pct = Math.round(100 * session.idx / session.pool.length);
    root.append(h('div', {class:'muted', text: 'Question ' + (session.idx + 1) + ' of ' + session.pool.length + ' · score ' + session.score}));
    root.append(h('div', {class:'progress'}, [h('i', {style: 'width:' + pct + '%'})]));
    var card = h('article', {class:'card'}, [stimulus(q, true), h('p', {class:'qtext', text: q.text || '(no question text found)'})].concat(imgs(q.images)));
    var inputs = [];
    var textBox = null;
    if (q.options.length) {
      var multi = q.type === 'multiple';
      if (multi) card.append(h('p', {class:'muted', text:'Select all that apply.'}));
      card.append(h('div', {class:'opts', style:'display:grid;gap:8px'}, order.map(function(k, pos){
        var input = h('input', {type: multi ? 'checkbox' : 'radio', name: 'ans', value: String(k)});
        inputs.push(input);
        return h('label', {class:'opt', 'data-k': String(k)}, [input, h('span', {class:'letter', text: letter(pos) + '.'}), h('span', {}, [q.options[k].text].concat(imgs(q.options[k].images)))]);
      })));
    } else if (q.type === 'text') {
      textBox = h('input', {type:'text', placeholder:'Type your answer', autocomplete:'off'});
      card.append(textBox);
    } else {
      textBox = h('textarea', {rows: '4', placeholder:'Write your answer (optional), then reveal'});
      card.append(textBox);
    }
    var result = h('div');
    var checkBtn = h('button', {class:'primary', text: q.options.length || q.type === 'text' ? 'Check answer' : 'Reveal answer'});
    var nextBtn = h('button', {text: session.idx + 1 < session.pool.length ? 'Next question →' : 'See results', hidden: true});
    var selfRow = h('div', {class:'row', hidden: true}, [
      h('span', {class:'muted', text:'How did you do?'}),
      h('button', {text:'I got it right', onclick: function(){ grade(true); }}),
      h('button', {text:'I got it wrong', onclick: function(){ grade(false); }})
    ]);
    function grade(ok){
      if (ok) session.score++; else session.missed.push(q.uid);
      selfRow.hidden = true;
      nextBtn.hidden = false;
      nextBtn.focus();
    }
    checkBtn.addEventListener('click', function(){
      var known = q.options.some(function(o){ return o.correct === true; });
      checkBtn.hidden = true;
      inputs.forEach(function(i){ i.disabled = true; });
      if (q.options.length) {
        var picked = inputs.filter(function(i){ return i.checked; }).map(function(i){ return +i.value; });
        card.querySelectorAll('label.opt').forEach(function(l){
          var k = +l.getAttribute('data-k'); var o = q.options[k];
          if (o.correct === true) l.classList.add('is-correct');
          else if (picked.indexOf(k) >= 0 && o.correct === false) l.classList.add('is-wrong');
          var notes = [];
          if (o.selected) notes.push('your original pick');
          if (notes.length) l.append(h('span', {class:'tag', text: notes.join(' · ')}));
        });
        if (known) {
          var ok = q.options.every(function(o, k){ return (o.correct === true) === (picked.indexOf(k) >= 0); });
          result.replaceChildren(h('div', {class:'result ' + (ok ? 'good' : 'bad'), text: ok ? '✓ Correct!' : '✗ Not quite. Correct answer: ' + order.map(function(k, pos){ return q.options[k].correct === true ? letter(pos) + '. ' + q.options[k].text : null; }).filter(Boolean).join('; ')}));
          grade(ok);
        } else {
          result.replaceChildren(h('div', {class:'result meh', text: 'The correct answer wasn\\u2019t shown on the original page. Originally you chose: ' + (q.userAnswer || '(nothing)') + ' — which was marked ' + (LABEL[q.status] || 'unknown').toLowerCase() + '.'}));
          selfRow.hidden = false;
        }
      } else if (q.type === 'text' && q.correctAnswer) {
        var mine = norm(textBox.value);
        var ok2 = q.correctAnswer.split(/ OR |;|\\|/).some(function(a){ return norm(a) && norm(a) === mine; });
        result.replaceChildren(h('div', {class:'result ' + (ok2 ? 'good' : 'bad'), text: (ok2 ? '✓ Correct! ' : '✗ ') + 'Correct answer: ' + q.correctAnswer}));
        if (ok2) grade(true); else selfRow.hidden = false; // allow overriding near-misses
      } else {
        result.replaceChildren(h('div', {class:'result meh'}, [
          h('div', {}, [h('strong', {text:'Correct answer: '}), q.correctAnswer || '(not shown on the original page)']),
          h('div', {}, [h('strong', {text:'Your original answer: '}), (q.userAnswer || '(none)') + ' — ' + (LABEL[q.status] || 'result unknown')])
        ]));
        selfRow.hidden = false;
      }
      var ex = explanation(q); if (ex) result.append(ex);
    });
    nextBtn.addEventListener('click', function(){
      session.idx++;
      if (session.idx < session.pool.length) renderQuestion(); else renderDone();
    });
    card.append(result, h('div', {class:'row'}, [checkBtn, nextBtn]), selfRow);
    root.append(card);
    window.scrollTo(0, 0);
  }

  function renderDone(){
    store.set('missed', session.missed);
    store.set('lastScore', {score: session.score, total: session.pool.length, at: Date.now()});
    var root = document.getElementById('practice');
    root.replaceChildren();
    var pct = Math.round(100 * session.score / session.pool.length);
    var card = h('div', {class:'card'}, [
      h('h2', {text: 'Score: ' + session.score + ' / ' + session.pool.length + ' (' + pct + '%)'}),
      h('div', {class:'row'}, [
        session.missed.length ? h('button', {class:'primary', text:'Retry the ' + session.missed.length + ' I missed', onclick: function(){
          var m = session.missed; session = {pool: QS.filter(function(q){ return m.indexOf(q.uid) >= 0; }), idx: 0, score: 0, missed: [], shuffleO: session.shuffleO}; renderQuestion();
        }}) : null,
        h('button', {text:'Back to setup', onclick: renderPracticeSetup})
      ])
    ]);
    root.append(card);
  }

  function setTab(which){
    document.getElementById('tab-review').setAttribute('aria-pressed', String(which === 'review'));
    document.getElementById('tab-practice').setAttribute('aria-pressed', String(which === 'practice'));
    document.getElementById('review').hidden = which !== 'review';
    document.getElementById('practice').hidden = which !== 'practice';
    if (which === 'practice' && !session) renderPracticeSetup();
  }
  document.getElementById('tab-review').addEventListener('click', function(){ setTab('review'); });
  document.getElementById('tab-practice').addEventListener('click', function(){ setTab('practice'); });
  renderReview();
  if (!QS.length) document.getElementById('review').append(h('div', {class:'card empty', text:'No questions were recognised on the saved page(s). Open page-text.txt or the .mhtml snapshot instead.'}));
})();
</script>
</body>
</html>
`;
  }

  root.QuizSaverExport = { toMarkdown, toPracticeHtml, toPageText, allQuestions, summary };
})(globalThis);
