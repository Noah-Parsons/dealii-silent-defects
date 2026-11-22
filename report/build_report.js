const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType,
  AlignmentType, HeadingLevel, BorderStyle, LevelFormat, PageOrientation, ShadingType,
  ExternalHyperlink, Footer, PageNumber
} = require('docx');

const cases = JSON.parse(fs.readFileSync(require('path').join(__dirname,'..','data','cases.json'), 'utf8'));
const stats = JSON.parse(fs.readFileSync(require('path').join(__dirname,'..','data','stats.json'), 'utf8'));

const FONT = 'Times New Roman';
const P = (text, opts = {}) => new Paragraph({
  spacing: { after: 120, line: 276 },
  alignment: opts.align || AlignmentType.LEFT,
  children: Array.isArray(text) ? text : [new TextRun({ text, font: FONT, size: 24, ...opts.run })],
  ...(opts.para || {})
});
const R = (text, o = {}) => new TextRun({ text, font: FONT, size: 24, ...o });
const H = (text, level) => new Paragraph({
  heading: level, spacing: { before: 240, after: 120 },
  children: [new TextRun({ text, font: FONT, size: level === HeadingLevel.HEADING_1 ? 28 : 24, bold: true })]
});
const B = (runs, ref = 'bullets') => new Paragraph({
  numbering: { reference: ref, level: 0 }, spacing: { after: 80, line: 276 },
  children: Array.isArray(runs) ? runs : [R(runs)]
});
const link = (pr) => new ExternalHyperlink({
  link: `https://github.com/dealii/dealii/pull/${pr}`,
  children: [new TextRun({ text: `#${pr}`, font: FONT, size: 20, style: 'Hyperlink' })]
});

const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const borders = { top: border, bottom: border, left: border, right: border };
const cell = (children, w, header = false) => new TableCell({
  borders, width: { size: w, type: WidthType.DXA },
  margins: { top: 60, bottom: 60, left: 90, right: 90 },
  shading: header ? { fill: 'E7E7E7', type: ShadingType.CLEAR, color: 'auto' } : undefined,
  children: (Array.isArray(children) ? children : [children]).map(c =>
    c instanceof Paragraph ? c : new Paragraph({ children: Array.isArray(c) ? c : [typeof c === 'string' ? new TextRun({ text: c, font: FONT, size: 20, bold: header }) : c] }))
});

const testLabel = {
  new: 'No existing test covered it; the fix added a new test.',
  stored_wrong: 'An existing stored output had recorded the wrong result.',
  stored_changed: 'Existing tests were changed or extended to cover it.',
  extended: 'An existing test was extended to cover it.',
  passed_both: 'An existing test passed both before and after the fix.',
  none: 'No test was added or changed.'
};

// Case table (landscape section)
const W = [1300, 1500, 4300, 3800, 2060];
const total = W.reduce((a, b) => a + b, 0);
const head = new TableRow({ tableHeader: true, children: [
  cell('PR (merged)', W[0], true), cell('Area', W[1], true), cell('What was wrong', W[2], true),
  cell('How the test suite related', W[3], true), cell('Approximate age', W[4], true)] });
const rows = cases.map(c => new TableRow({ children: [
  cell([[link(c.pr), new TextRun({ text: ` (${c.merged})`, font: FONT, size: 20 })]], W[0]),
  cell(c.area, W[1]), cell(c.what, W[2]),
  cell(`${testLabel[c.test]} ${c.test_note}`, W[3]), cell(c.age, W[4])] }));
const caseTable = new Table({ width: { size: total, type: WidthType.DXA }, columnWidths: W, rows: [head, ...rows] });

// Summary count table
const SW = [6200, 1800];
const srow = (a, b, h = false) => new TableRow({ children: [cell(a, SW[0], h), cell(b, SW[1], h)] });
const sumTable = new Table({ width: { size: 8000, type: WidthType.DXA }, columnWidths: SW, rows: [
  srow('How the existing test suite related to the defect', 'Cases', true),
  srow('No existing test covered it; the fix added a new test', String(stats.test.new)),
  srow('Existing tests were changed or extended to cover it', String(stats.test.stored_changed + stats.test.extended)),
  srow('An existing stored output had recorded the wrong result (test itself unchanged by the fix)', String(stats.test.stored_wrong)),
  srow('An existing test passed both before and after the fix', String(stats.test.passed_both)),
  srow('No test was added or changed', String(stats.test.none)),
  srow('Total', String(cases.length), true)] });

const body = [
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [R('Defects in deal.II That No Test Caught', { bold: true, size: 32 })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 60 }, children: [R('A screen of the merged pull requests numbered #15400 to #20399')] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 360 }, children: [R('Noah Parsons, as of 22 November 2026')] }),

  H('1. Summary', HeadingLevel.HEADING_1),
  P(`Professor Bangerth suggested pointing an AI at deal.II's issues and pull requests to find cases where something had been broken without anyone noticing, and to look at their root causes. This report does that for the ${stats.n_prs.toLocaleString('en-GB')} pull requests merged with numbers between #15400 and #20399 (${stats.first_date} to ${stats.last_date}), roughly the last 5,000 issue and pull request numbers.`),
  P(`The screen found ${cases.length} fixes in which the library had been producing wrong results, or silently not doing what it was asked, without any error. Every one is listed in Section 4 with a link to its pull request. In brief:`),
  B([R('Most were corner cases of features that are otherwise tested', { bold: true }), R(`, as Professor Bangerth expected: ${stats.cause.corner_case} cases concern a particular geometry, element, option or combination, and a further ${stats.cause.parallel_only} appear only in parallel runs.`)]),
  B([R('In 5 cases an existing stored output had recorded the wrong answer.', { bold: true }), R(' The clearest is GridGenerator::cheese() in 3d, which produced no holes from its addition in June 2015 until April 2026; a stored output recorded the hole-free mesh of 315 cells, where the correct count is 291. The fix added an assertion on the cell count worked out by hand.')]),
  B([R('In one case a test of the feature existed and passed both before and after the fix:', { bold: true }), R(' multigrid W- and F-cycles had been behaving as V-cycles.')]),
  B([R('Three functions had never done what their names say', { bold: true }), R(' (the 3d cheese mesh, PETSc sparse-matrix memory consumption, and 3d Nédélec interpolation), and one safety check, for distorted cells after refinement, had in effect never run: calls always resolved to a fallback that did nothing.')]),
  B([R('The defective code was often old.', { bold: true }), R(` Measured from the code each fix changed, the median age was about ${stats.median_age} years; ${stats.n_over5} of the ${stats.n_aged} cases measured were over five years old.`)]),
  P('These findings come from deal.II’s own record (commit messages, merged pull requests and changelog entries), not from the discussion threads. Section 7 explains this and the other limits.'),

  H('2. Method', HeadingLevel.HEADING_1),
  P('The work was done by an AI agent (Claude, made by Anthropic) at my direction, as Professor Bangerth suggested; I set the scope and checked the results. The steps were:'),
  B(`Collect every merged pull request numbered #15400 to #20399 from the public deal.II repository: ${stats.n_prs.toLocaleString('en-GB')} in all. For each, record its title, the messages of its commits, the files it changed, and the text of any changelog entry it added under doc/news/changes/ (${stats.n_changelog} did).`, 'steps'),
  B(`Set aside build, compiler, documentation and formatting changes, keeping the ${stats.n_candidates} fixes that changed library code in include/ or source/. All ${stats.n_candidates} were read.`, 'steps'),
  B('Keep only fixes whose own description says the library gave a wrong result, or silently did not do what was asked, without raising an error. Crashes, failed assertions, compile errors and performance problems were excluded, since those announce themselves.', 'steps'),
  B('For each kept fix, record how the test suite related to it: whether the fix added a new test, extended an existing one, or changed a stored output without changing the test itself. A stored output that changes while its test does not means the file had been recording the old, wrong result.', 'steps'),
  B('Estimate how long each defect had existed by running git blame on the lines each fix changed, as they stood just before the fix. This gives the age of the surrounding code, which is a rough guide only; where better evidence exists (the date a function was added, or an old issue number), that is given instead.', 'steps'),
  B('Check every case in this report against the commits themselves.', 'steps'),

  H('3. What turned up', HeadingLevel.HEADING_1),
  P(`Of the ${stats.n_candidates} source-code fixes read, ${cases.length} met the standard of a silent wrong result. The table below shows how each related to the existing test suite.`),
  sumTable,
  P(''),
  P(`In ${stats.test.new} of the ${cases.length} cases, no existing test exercised the situation at all, which matches Professor Bangerth’s account that most such defects sit in corner cases the original tests did not cover. In the five cases where an existing stored output changed and its test did not, the test was running the faulty code and comparing against a file that had recorded the fault: the suite caught the fix as a change, not the defect.`),

  H('4. The cases', HeadingLevel.HEADING_1),
  P('Each pull request number links to the pull request on GitHub. The descriptions are paraphrased from each fix’s changelog entry and commit messages. The age column is explained in Section 2.'),
];

const patterns = [
  H('5. Root causes', HeadingLevel.HEADING_1),
  P('Grouping the cases by what went wrong gives seven patterns.'),
  B([R('A corner case of a tested feature', { bold: true }), R(` (${stats.cause.corner_case} cases). The feature worked in the configurations its tests used and failed in one they did not: thin shells (#18568, #18574), cell categorisation in MatrixFree (#16252), periodic faces whose two sides differ in orientation (#17345), meshes mixing affine and non-affine cells (#19294), and particles on simplex meshes (#18001).`)], 'pat'),
  B([R('Behaviour that appears only in parallel or at scale', { bold: true }), R(` (${stats.cause.parallel_only + stats.cause.scale_threshold} cases). Norms of distributed PETSc vectors (#17415), constraints made consistent across processes (#17626), stale vertex positions on ghost cells (#20252), block vectors with more than 20 components (#20263), and 64-bit indices narrowed to 32 bits (#19069). Tests run on a few processes and small problems will not usually reach these.`)], 'pat'),
  B([R('Code that never did what its name says', { bold: true }), R(' (3 cases). The 3d branch of GridGenerator::cheese() never cut holes (#19596); PETScWrappers::SparseMatrix::memory_consumption() always returned 0 (#18668); and 3d Nédélec interpolation did not reproduce its own polynomial space (#20299, referring to an issue from about December 2014).')], 'pat'),
  B([R('A result that differed from the documented or conventional meaning', { bold: true }), R(' (3 cases). The SUNDIALS wrappers returned the number of output calls, not of time steps (#17096); PETSc solvers converged on the preconditioned residual norm (#19329); and the MUMPS wrapper reused its first factorization for later matrices (#20312). Each produced plausible numbers, so only a check of meaning, not of change, would show the fault.')], 'pat'),
  B([R('Stale or overwritten state', { bold: true }), R(' (4 cases). Multigrid W- and F-cycles overwrote intermediate solutions and became V-cycles (#19710); Raviart–Thomas gradients read values already overwritten by submit_value() (#20393); mappings reused metric data after the mesh changed (#19421); and a polynomial class left earlier contents in its output arrays (#18830).')], 'pat'),
  B([R('A wrong formula', { bold: true }), R(' (2 cases). A missing factor of the radius in CylindricalManifold::push_forward_gradient() (#20369), and a wrong normal direction for one Raviart–Thomas component in the matrix-free kernels (#17905).')], 'pat'),
  B([R('A check that never ran', { bold: true }), R(' (1 case). The distortion check after refinement had two overloads: one for dim == spacedim that did the check, and a general fallback for codimension one or more that did nothing. Every call named both template arguments, so the one-argument version was never selected, even when dim == spacedim (#20037). The pull request suggests this had been so since the spacedim template argument was introduced. It came to light only when a development version of Clang warned that the function was unused. A check that never runs produces no output, so no stored-output comparison could notice it.')], 'pat'),

  H('6. Observations', HeadingLevel.HEADING_1),
  P('Four observations may be of interest; they are offered tentatively.'),
  B('Where a stored output had recorded the wrong answer, comparison against it could only confirm the fault. The cheese fix shows the alternative: the corrected test now asserts the cell count derived by hand, an assertion that would have failed in 2015. This is the kind of test-internal assertion Professor Bangerth described.', 'obs'),
  B('Not all of the defects were corner cases. Several affected widely used functionality: the PETSc residual norm (#19329), the W- and F-cycles (#19710), the distortion check after mesh refinement (#20037) and FEPointEvaluation gradients, which also affected the step-19 tutorial (#19294). The code each fix changed had been in place for between about 2.5 and 12.5 years.', 'obs'),
  B('The distortion check (#20037) was found not by a test but by a compiler warning about an unused function. Static analysis of this kind may catch a class of silent defect that output comparison cannot.', 'obs'),
  B('Two of the fixes address issues opened ten or more years earlier (#20299 refers to issue #328; #20312’s branch refers to issue #2869), on branches named backlog-swarm, and at least one recent fix (#20391) carries an AI co-author line. Agents already appear to be finding some of these defects in deal.II.', 'obs'),

  H('7. Limits', HeadingLevel.HEADING_1),
  B('Issue and pull request discussions were not read. The access available for this work reached deal.II’s git history but not GitHub’s discussion threads, so the screen relies on what developers wrote in commits and changelog entries. Cases recorded only in an issue thread, or fixed with a terse commit message and no changelog entry, will have been missed; the true count is likely higher.', 'lim'),
  B('How each defect was discovered (by a user, a paper, or a developer) could not be determined without the discussion threads.', 'lim'),
  B('The ages come from git blame on the changed lines and measure the age of that code, not exactly when the defect began. A refactoring can make a defect look younger than it is, and a fix that adds lines borrows the age of their neighbours.', 'lim'),
  B('Deciding whether a fix describes a silent wrong result is a judgement. The descriptions in Section 4 are paraphrases, and each should be read against the linked pull request before being relied on.', 'lim'),
  B('All scripts, the per-pull-request data and the case list are available on request, so the screen can be rerun or extended to the earlier issues and pull requests.', 'lim'),
];

const numbering = { config: ['bullets', 'obs', 'lim', 'pat'].map(ref => ({ reference: ref, levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 270 } } } }] }))
  .concat([{ reference: 'steps', levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] }]) };

const footer = new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: 20 })] })] });
const portrait = { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } };
const landscape = { page: { size: { width: 12240, height: 15840, orientation: PageOrientation.LANDSCAPE }, margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } };

const doc = new Document({
  styles: { default: { document: { run: { font: FONT, size: 24 } } },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 28, bold: true, font: FONT }, paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 0 } }] },
  numbering,
  sections: [
    { properties: portrait, footers: { default: footer }, children: body },
    { properties: landscape, footers: { default: footer }, children: [caseTable] },
    { properties: portrait, footers: { default: footer }, children: patterns },
  ]
});
Packer.toBuffer(doc).then(b => { fs.writeFileSync(process.argv[2], b); console.log('ok'); });
