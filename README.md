# Defects in deal.II That No Test Caught

Noah Parsons, as of 22 November 2026

## Question

In a project with a large test suite, which defects still go unnoticed, why, and for how long? Wolfgang Bangerth (deal.II) suggested screening deal.II's recent issues and pull requests with an AI agent for cases where something had been broken without anyone noticing, and looking at their root causes. This repository holds that screen.

## Scope

The 3,752 pull requests merged into [deal.II](https://github.com/dealii/dealii) with numbers between #15400 and #20399 (21 June 2023 to 22 November 2026).

## Method

The screening and tracing were done by an AI agent (Claude, made by Anthropic) at my direction; I set the scope and checked a sample of the results.

1. **`scripts/build_corpus.py`** records each merged pull request: title, commit messages and changed files (`data/prs.jsonl`).
2. **`scripts/fetch_changes.py`** collects the changelog entries each pull request added under `doc/news/changes/` (`data/changes.json`).
3. **`scripts/cand.py`** keeps fixes that changed library code in `include/` or `source/`, setting aside build, compiler, documentation and formatting changes: 446 candidates (`data/cands.json`). **`scripts/screen.py`** scores them for phrases such as "never worked" or "wrong results" (`data/screen.json`).
4. All 446 candidates were read. A fix was kept only if its own description says the library gave a wrong result, or silently did not do what was asked, without an error. Crashes, assertions, compile errors and performance problems were excluded.
5. For each kept fix, how the existing tests related to it was recorded: a new test added, an existing test extended, or a stored output changed while its test did not. That last pattern means the stored output had been recording the wrong result.
6. **`scripts/latency.py`** estimates how long the changed code had been in place, using `git blame` on the lines each fix changed (`data/latency.json`).

## Results

35 silent defects (`data/cases.json`, `data/cases.csv`). The full write-up is in `report/`.

| How the existing tests related | Cases |
|---|---|
| No existing test covered it; the fix added a new test | 15 |
| Existing tests changed or extended to cover it | 9 |
| A stored output had recorded the wrong result (test unchanged) | 5 |
| An existing test passed both before and after the fix | 1 |
| No test added or changed | 5 |

Examples:
- `GridGenerator::cheese()` in 3d produced no holes from 2015 until #19596. A stored output recorded 315 cells; the correct count is 291.
- Multigrid W- and F-cycles ran as V-cycles until #19710; the existing test passed both before and after.
- The distortion check after refinement never ran, because every call resolved to a fallback overload (#20037). It was found through a Clang warning about an unused function.

## Limits

- **Issue and pull request discussions were not read.** The screen relies on commit messages and changelog entries, so cases recorded only in a discussion, or fixed with a terse message and no changelog entry, are missed.
- **How each defect was discovered** could not be determined without the discussions.
- **The ages measure the age of the changed code**, not exactly when each defect began.
- **Classifying a fix as a silent wrong result is a judgement.** The descriptions are paraphrases; read the linked pull request before relying on one.

## Reproducing

```bash
git clone --filter=blob:none https://github.com/dealii/dealii
cd data
export DEALII_REPO=../dealii
python ../scripts/build_corpus.py
python ../scripts/fetch_changes.py
python ../scripts/cand.py
python ../scripts/screen.py
python ../scripts/latency.py 19596 19710 20037   # any pull request numbers
node ../report/build_report.js "../report/deal.II Silent Defects Report.docx"   # needs the npm package docx
```

## Files

| Path | Contents |
|---|---|
| `scripts/` | Corpus, screening and age-estimation scripts; `show.py` prints one pull request's record |
| `data/prs.jsonl` | One record per merged pull request |
| `data/changes.json` | Changelog entries, by pull request |
| `data/cands.json`, `data/screen.json` | The 446 candidates and their scores |
| `data/cases.json`, `data/cases.csv` | The 35 cases, with classification and links |
| `data/latency.json`, `data/stats.json` | Age estimates and summary counts |
| `report/` | The report (Word and PDF) and the script that builds it |

The deal.II source and history are © the deal.II authors, under the licences stated in their repository.
