"use client";

import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  Download,
  ShieldCheck,
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

const assemblySteps = [
  {
    title: "Song analysis",
    cost: "Free",
    description: "Finds the beat, the best excerpt, and exact timing.",
  },
  {
    title: "Dance plan",
    cost: "Free",
    description:
      "Assigns solo, reaction, and finale dances to all four characters.",
  },
  {
    title: "Voice lines",
    cost: "Free tier",
    description:
      "Creates the opening, taunts, and closing line in four voices.",
    waiting: "Waits for your approval",
  },
  {
    title: "Render",
    cost: "Free",
    description: "Builds one 1080 × 1920 Reel with captions and music.",
  },
  {
    title: "Review and deliver",
    cost: "Free",
    description:
      "Checks the video, gets an independent grade, and returns the MP4.",
    waiting: "Waits for your review",
  },
] as const;

const agentCommands = [
  "npm run check",
  "npm run smoke",
  "npm run list-motions",
  "node runner.mjs init --run=<id> --song=<file>",
  "node runner.mjs validate --run=<id>",
  "node runner.mjs render --run=<id> --approve-provider",
  "node runner.mjs inspect --run=<id>",
  "node runner.mjs finalize --run=<id> --review=<review.json>",
] as const;

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
        <section
          id="dance-off-assembly"
          className={styles.panel}
          aria-labelledby="dance-off-assembly-title"
        >
          <div className={styles.assemblyHeader}>
            <h3 id="dance-off-assembly-title">The assembly line</h3>
            <p className={styles.assemblyPath}>
              Song analysis → Dance plan → Voice lines → Render → Deliver
            </p>
          </div>

          <div
            className={styles.assemblyGrid}
            aria-label="Five steps from song analysis to final delivery"
          >
            {assemblySteps.map((step, index) => (
              <article key={step.title} className={styles.assemblyStep}>
                <div className={styles.assemblyStepHead}>
                  <h4>
                    {index + 1}. {step.title}
                  </h4>
                  <span>{step.cost}</span>
                </div>
                <p>{step.description}</p>
                {"waiting" in step ? (
                  <strong className={styles.stepWait}>{step.waiting}</strong>
                ) : null}
              </article>
            ))}
          </div>

          <article className={styles.agentCommands}>
            <h4>What the coding agent runs</h4>
            <pre aria-label="Exact Dance Off runtime commands">
              <code>{agentCommands.join("\n")}</code>
            </pre>
          </article>
        </section>

        <section
          id="proof"
          className={styles.panel}
          aria-labelledby="dance-off-proof-title"
        >
          <div className={styles.panelHeading}>
            <div>
              <p className={styles.eyebrow}>02 · Finished example</p>
              <h3 id="dance-off-proof-title">Watch the final video.</h3>
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
              final MP4, intended cast and dialogue, and this rubric. It does
              not receive the source, render history, previous score, or known
              defects.
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
            below its critical floor. Missing, indirect, or low-confidence
            playback evidence is inconclusive and requires another judge.
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
              <p className={styles.receiptNote}>
                Archived visual/caption-assisted pilot. Current rubric {data.grading.rubricVersion}{" "}
                requires direct moving-video and audio perception before a score can ship.
              </p>
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
