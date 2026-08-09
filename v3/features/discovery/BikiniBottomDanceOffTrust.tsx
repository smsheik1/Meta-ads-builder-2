"use client";

import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  Download,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { useRef, useState } from "react";
import type { BikiniBottomDanceOffTrustData } from "./bikiniBottomDanceOffTrust.server";
import styles from "./BikiniBottomDanceOffTrust.module.css";

type Props = {
  data: BikiniBottomDanceOffTrustData;
  openProofHref: string;
  poster: string | undefined;
  repositoryHref: string;
  videoSrc: string;
};

export function BikiniBottomDanceOffTrust({
  data,
  openProofHref,
  poster,
  repositoryHref,
  videoSrc,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileGroupRefs = useRef<Array<HTMLDetailsElement | null>>([]);
  const [activeAnnotation, setActiveAnnotation] = useState(0);

  function seekToAnnotation(index: number) {
    const annotation = data.annotations[index];
    if (!annotation) return;

    setActiveAnnotation(index);
    if (!videoRef.current) return;
    videoRef.current.currentTime = annotation.seconds;
    void videoRef.current.play().catch(() => undefined);
  }

  function revealSource(filePath: string) {
    const groupIndex = data.fileGroups.findIndex((group) =>
      group.files.some((file) => file.path === filePath),
    );
    const group = fileGroupRefs.current[groupIndex];
    if (group) group.open = true;
  }

  return (
    <section id="how-it-works" className={styles.root}>
      <div className={styles.shell}>
        <header className={styles.intro}>
          <div>
            <span className={styles.kicker}>Inside this Format</span>
            <h2>How this Format works.</h2>
            <p>
              Follow the workflow, inspect the finished proof, and see exactly
              what comes with the Repo.
            </p>
          </div>
          <nav aria-label="Format system sections">
            <ol className={styles.sectionIndex}>
              <li>
                <a href="#dance-off-assembly">
                  <span>1</span>Assembly line
                </a>
              </li>
              <li>
                <a href="#proof">
                  <span>2</span>Proof explained
                </a>
              </li>
              <li>
                <a href="#dance-off-quality">
                  <span>3</span>How it is graded
                </a>
              </li>
              <li>
                <a href="#dance-off-repo">
                  <span>4</span>Repo contents
                </a>
              </li>
              <li>
                <a href="#dance-off-advanced">
                  <span>5</span>Advanced details
                </a>
              </li>
            </ol>
          </nav>
        </header>

        <section
          id="dance-off-assembly"
          className={styles.panel}
          aria-labelledby="dance-off-assembly-title"
        >
          <div className={styles.panelHeading}>
            <div>
              <p id="dance-off-assembly-title" className={styles.eyebrow}>
                01 · Assembly line
              </p>
              <h3>One request moves straight to a finished Reel.</h3>
            </div>
            <a
              className={styles.sourceLink}
              href={`#${sourceFileId("SKILL.md")}`}
              onClick={() => revealSource("SKILL.md")}
            >
              <Workflow aria-hidden="true" /> Open SKILL.md
              <ArrowRight aria-hidden="true" />
            </a>
          </div>

          <div
            className={styles.conveyor}
            aria-label="Six connected production stages with a required approval gate before generation"
          >
            <div className={styles.conveyorLabel}>
              <span>One episode</span>
              <span className={styles.direction}>
                <span className={styles.directionDesktop}>
                  Moves in one direction
                </span>
                <span className={styles.directionMobile}>
                  Moves down the line
                </span>
                <ArrowRight aria-hidden="true" />
              </span>
            </div>
            <div className={styles.flow}>
              <FlowStation
                number="01"
                title="Brief enters"
                artifact="Song + cast + direction"
                color="cyan"
              />
              <FlowStation
                number="02"
                title="Plan"
                artifact="Timed scene map"
                color="pink"
              />
              <FlowStation
                number="03"
                title="Approve"
                artifact="Human sign-off"
                color="lime"
                approval
              />
              <FlowStation
                number="04"
                title="Generate"
                artifact="Voice + motion + edit"
                color="yellow"
              />
              <FlowStation
                number="05"
                title="Inspect"
                artifact="Checks + watch-through"
                color="coral"
              />
              <FlowStation
                number="06"
                title="Deliver"
                artifact="MP4 + grade + evidence"
                color="violet"
              />
            </div>
          </div>
        </section>

        <section
          id="proof"
          className={styles.panel}
          aria-labelledby="dance-off-proof-title"
        >
          <div className={styles.panelHeading}>
            <div>
              <p className={styles.eyebrow}>02 · Proof explained</p>
              <h3 id="dance-off-proof-title">See it work.</h3>
            </div>
            <a
              className={styles.sourceLink}
              href={`#${sourceFileId("PROOF-REPORT.md")}`}
              onClick={() => revealSource("PROOF-REPORT.md")}
            >
              <BadgeCheck aria-hidden="true" /> Open proof report
              <ArrowRight aria-hidden="true" />
            </a>
          </div>

          <div className={styles.proofGrid}>
            <div className={styles.videoColumn}>
              <div className={styles.videoFrame}>
                <video
                  ref={videoRef}
                  src={videoSrc}
                  poster={poster}
                  controls
                  playsInline
                  preload="metadata"
                />
                <span className={styles.timecode} aria-live="polite">
                  {data.annotations[activeAnnotation]?.timeLabel} / 00:
                  {data.proof.durationSeconds}
                </span>
              </div>
              <a className={styles.openProof} href={openProofHref}>
                Open finished ad <ArrowRight aria-hidden="true" />
              </a>
            </div>

            <div className={styles.annotationList}>
              {data.annotations.map((annotation, index) => (
                <button
                  key={annotation.title}
                  type="button"
                  className={styles.annotation}
                  data-color={annotation.color}
                  aria-pressed={activeAnnotation === index}
                  onClick={() => seekToAnnotation(index)}
                >
                  <time>{annotation.timeLabel}</time>
                  <span>
                    <strong>{annotation.title}</strong>
                    <small>{annotation.description}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section
          id="dance-off-quality"
          className={styles.panel}
          aria-labelledby="dance-off-grading-title"
        >
          <div className={styles.panelHeading}>
            <div>
              <p className={styles.eyebrow}>03 · Final evaluation</p>
              <h3 id="dance-off-grading-title">
                How your finished video is graded.
              </h3>
            </div>
            <a
              className={styles.sourceLink}
              href={`#${sourceFileId("quality.json")}`}
              onClick={() => revealSource("quality.json")}
            >
              <ShieldCheck aria-hidden="true" /> Open quality.json
              <ArrowRight aria-hidden="true" />
            </a>
          </div>

          <div className={styles.gradeSummary}>
            <div>
              <strong>{data.stats.technicalGates}/{data.stats.technicalGates}</strong>
              <span>Technical gates must pass</span>
            </div>
            <div>
              <strong>{data.grading.passingScore}/100</strong>
              <span>Minimum blind score</span>
            </div>
            <div>
              <strong>0</strong>
              <span>Critical failures allowed</span>
            </div>
          </div>

          <div className={styles.blindNote}>
            <ShieldCheck aria-hidden="true" />
            <p>
              <strong>Blind means independent.</strong> The judge receives the
              final MP4, intended cast and dialogue, and this rubric—not the
              source, render history, previous score, or known defects.
            </p>
          </div>

          <div className={styles.rubric}>
            <div className={styles.rubricHeading}>
              <strong>The blind judge scores seven things</strong>
              <span>Every rating needs time-coded evidence</span>
            </div>
            <ol>
              {data.grading.criteria.map((criterion) => (
                <li key={criterion.id}>
                  <span className={styles.criterionWeight}>{criterion.weight}</span>
                  <strong>{criterion.label}</strong>
                  {criterion.critical ? <small>Critical</small> : null}
                </li>
              ))}
            </ol>
          </div>

          <div className={styles.ratingScale} aria-label="Five-level blind review scale">
            {data.grading.ratingScale
              .slice()
              .reverse()
              .map((rating) => (
                <div key={rating.rating}>
                  <strong>{rating.rating}</strong>
                  <span>{rating.label}</span>
                </div>
              ))}
          </div>
          <p className={styles.gradeRule}>
            A technically valid video still fails below {data.grading.passingScore},
            or when character integrity, motion, audio, or composition falls
            below its critical floor. Missing playback or low-confidence
            evidence is inconclusive and requires another judge.
          </p>
        </section>

        <section
          id="dance-off-repo"
          className={styles.panel}
          aria-labelledby="dance-off-repo-title"
        >
          <div className={styles.panelHeading}>
            <div>
              <p className={styles.eyebrow}>04 · Everything included</p>
              <h3 id="dance-off-repo-title">The exact Repo files.</h3>
            </div>
            <a className={styles.repoDownload} href={repositoryHref} download>
              <Download aria-hidden="true" /> Download exact Repo
            </a>
          </div>

          <div className={styles.fileGroups}>
            {data.fileGroups.map((group, index) => (
              <details
                key={group.title}
                className={styles.fileGroup}
                ref={(node) => {
                  fileGroupRefs.current[index] = node;
                }}
                open={index === 0}
              >
                <summary>
                  <span>
                    <strong>{group.title}</strong>
                    <small>{group.summary}</small>
                  </span>
                  <span className={styles.fileCount}>
                    {group.files.length} files
                  </span>
                  <ChevronDown aria-hidden="true" />
                </summary>
                <ul>
                  {group.files.map((file) => (
                    <li key={file.path} id={sourceFileId(file.path)}>
                      <code>{file.path}</code>
                      <span>{file.description}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </section>

        <details id="dance-off-advanced" className={styles.advanced}>
          <summary>
            <span>
              <strong>Advanced execution details</strong>
              <small>
                Commands and the published proof receipt, available when you
                need them.
              </small>
            </span>
            <ChevronDown aria-hidden="true" />
          </summary>
          <div className={styles.advancedBody}>
            <div className={styles.terminal}>
              <div>
                <span>
                  <i />
                  <i />
                  <i />
                </span>
                <small>Read from package.json scripts</small>
              </div>
              <ol>
                {data.commands.map((command) => (
                  <li key={command}>
                    <span>$</span> {command}
                  </li>
                ))}
              </ol>
            </div>
            <div className={styles.receipt}>
              <h4>Published proof receipt</h4>
              <dl>
                <div>
                  <dt>Renderer</dt>
                  <dd>{data.proof.renderer.replace("../", "")}</dd>
                </div>
                <div>
                  <dt>Quality</dt>
                  <dd>
                    {data.proof.grade} · {data.proof.score}/100 ·{" "}
                    {data.proof.status}
                  </dd>
                </div>
                <div>
                  <dt>Technical</dt>
                  <dd>
                    {data.proof.technicalPassed}/{data.proof.technicalTotal} gates
                  </dd>
                </div>
                <div>
                  <dt>Blind rubric</dt>
                  <dd>Version {data.proof.rubricVersion}</dd>
                </div>
                <div>
                  <dt>Output</dt>
                  <dd>
                    {data.proof.width} × {data.proof.height} ·{" "}
                    {data.proof.durationSeconds}s MP4
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </details>
      </div>
    </section>
  );
}

function sourceFileId(filePath: string) {
  return `dance-off-file-${filePath
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

function FlowStation({
  approval = false,
  artifact,
  color,
  number,
  title,
}: {
  approval?: boolean;
  artifact: string;
  color: string;
  number: string;
  title: string;
}) {
  return (
    <article className={styles.station}>
      <span className={styles.machine} data-color={color}>
        {number}
      </span>
      {approval ? <span className={styles.gateState}>Approval</span> : null}
      <div className={styles.stationCopy}>
        <h4>{title}</h4>
        <span>{artifact}</span>
      </div>
    </article>
  );
}
