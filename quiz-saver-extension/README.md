# Quiz Saver (Chrome extension)

Save the questions from a finished practice quiz, including your answers, the correct answers and the
explanations. You can then review your mistakes or re-take the quiz offline, for example on the train.
It's built for **Medify GAMSAT review screens**, and also works on Moodle review pages and on ordinary
radio-button quizzes.

## Install (once, takes about 1 minute)

1. Download this `quiz-saver-extension` folder to your computer. On GitHub: **Code → Download ZIP**, then unzip it.
2. In Chrome go to `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and pick the `quiz-saver-extension` folder.
5. Pin the extension: click the puzzle-piece icon, then the pin next to **Quiz Saver**.

## Use it on Medify

1. Finish a test or question set, then open its **review** screen (the one that shows your answer, the
   correct answer and the explanation). Go to **question 1**.
2. Click the Quiz Saver icon, type a name (e.g. *GAMSAT S3 Mock 2*). Tick **Save diagrams/images…** the
   first time, so graphs and diagrams work offline.
3. Click **Save every question (auto-clicks Next)**. Keep the popup open: it saves each question, presses
   Next, and stops at the last one. If it can't find the Next button, step through yourself and press
   **Save this page only** on each question. Questions you've already saved are never duplicated.

The files go to `Downloads/QuizSaver/<quiz name>/`:

| File | What it's for |
| --- | --- |
| `quiz-practice.html` | Open it in any browser, no internet needed. **Review** tab: every question with the stimulus, your answer, the correct answer and the explanation, with a *Mistakes only* filter. **Practice again** tab: re-take all questions, only your mistakes, or only the ones you missed last time, with optional shuffling. |
| `quiz-for-claude.md` | Plain-text version of the questions. Give it to Claude to rebuild the quiz, make similar questions or explain your mistakes. |
| `quiz.json` | All the data, including images. |
| `page-text.txt` | The raw text of every saved page, as a fallback if a question was misread. |
| `snapshot-N.mhtml` | Optional exact copy of a page (tick the box; *Save this page only* mode). Opens in Chrome. |

To get `quiz-practice.html` onto your phone, copy it with AirDrop, Google Drive or email, then open it in
the phone's browser.

## If something is read wrong

Medify's page layout isn't public, so the extension reads what you *see*. It looks for:

- **A–D option lists**
- **green and red highlighting**
- **"Your answer" / "Correct answer" labels**
- **"Explanation" / "Worked solution" sections**, which it opens if they're collapsed
- the **stimulus panel** next to the question

If a question comes out wrong, tick **Also save an exact .mhtml snapshot**, press **Save this page only**
on that question, and send the `.mhtml` file to Claude so the extractor can be tuned.

Your saved quizzes are only for your own study. Medify's questions are copyrighted, so don't share the
files.
