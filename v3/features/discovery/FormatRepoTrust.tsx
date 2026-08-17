"use client";

import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  ChevronRight,
  Download,
  ShieldCheck,
} from "lucide-react";
import { useRef, useState } from "react";
import type { FormatRepoTrustData } from "./formatRepoTrust.types";
import styles from "./BikiniBottomDanceOffTrust.module.css";

type Props = {
  data: FormatRepoTrustData;
  openProofHref: string;
  poster: string | undefined;
  repositoryHref: string;
  videoSrc: string;
};

export function FormatRepoTrust({
  data,
  openProofHref,
  poster,
  repositoryHref,
  videoSrc,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRefs = useRef<Record<string, HTMLDetailsElement | null>>({});
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
    const file = fileRefs.current[filePath];
    if (file) file.open = true;
  }

  return (
    <section id="how-it-works" className={styles.root}>
      <div className={styles.shell}>
        <section
          id={`${data.idPrefix}-assembly`}
          className={styles.panel}
          aria-labelledby={`${data.idPrefix}-assembly-title`}
        >
          <div className={styles.assemblyHeader}>
            <h3 id={`${data.idPrefix}-assembly-title`}>
              {data.assembly.title}
            </h3>
            <p className={styles.assemblyPath}>{data.assembly.path}</p>
          </div>

          <div
            className={styles.assemblyGrid}
            aria-label={data.assembly.ariaLabel}
          >
            {data.assembly.steps.map((step, index) => (
              <article key={step.title} className={styles.assemblyStep}>
                <div className={styles.assemblyStepHead}>
                  <h4>
                    {index + 1}. {step.title}
                  </h4>
                  <span>{step.cost}</span>
                </div>
                <p>{step.description}</p>
                {step.waiting ? (
                  <strong className={styles.stepWait}>{step.waiting}</strong>
                ) : null}
              </article>
            ))}
          </div>

          <article className={styles.agentCommands}>
            <h4>{data.assembly.commandsLabel}</h4>
            <pre aria-label={data.assembly.commandsAriaLabel}>
              <code>{data.assembly.commands.join("\n")}</code>
            </pre>
          </article>
        </section>

        <section
          id="proof"
          className={styles.panel}
          aria-labelledby={`${data.idPrefix}-proof-title`}
        >
          <div className={styles.panelHeading}>
            <div>
              <p className={styles.eyebrow}>{data.proofCopy.eyebrow}</p>
              <h3 id={`${data.idPrefix}-proof-title`}>
                {data.proofCopy.title}
              </h3>
            </div>
            <a
              className={styles.sourceLink}
              href={`#${sourceFileId(data.idPrefix, "PROOF-REPORT.md")}`}
              onClick={() => revealSource("PROOF-REPORT.md")}
            >
              <BadgeCheck aria-hidden="true" /> Open proof report
              <ArrowRight aria-hidden="true" />
            </a>
          </div>

          <div
            className={styles.proofGrid}
            data-aspect={data.proof.aspectRatio ?? "9:16"}
          >
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
                  {data.annotations[activeAnnotation]?.timeLabel} /{" "}
                  {data.proof.durationTimeLabel}
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
          id={`${data.idPrefix}-quality`}
          className={styles.panel}
          aria-labelledby={`${data.idPrefix}-quality-title`}
        >
          <div className={styles.panelHeading}>
            <div>
              <p className={styles.eyebrow}>{data.quality.eyebrow}</p>
              <h3 id={`${data.idPrefix}-quality-title`}>
                {data.quality.title}
              </h3>
            </div>
            <a
              className={styles.sourceLink}
              href={`#${sourceFileId(data.idPrefix, "quality.json")}`}
              onClick={() => revealSource("quality.json")}
            >
              <ShieldCheck aria-hidden="true" /> Open quality.json
              <ArrowRight aria-hidden="true" />
            </a>
          </div>

          <div className={styles.gradeSummary}>
            {data.quality.summary.map((fact) => (
              <div key={fact.label}>
                <strong>{fact.value}</strong>
                <span>{fact.label}</span>
              </div>
            ))}
          </div>

          <div className={styles.blindNote}>
            <ShieldCheck aria-hidden="true" />
            <p>
              <strong>{data.quality.noteTitle}</strong> {data.quality.note}
            </p>
          </div>

          <div className={styles.rubric}>
            <div className={styles.rubricHeading}>
              <strong>{data.quality.criteriaTitle}</strong>
              <span>{data.quality.criteriaSubtitle}</span>
            </div>
            <ol>
              {data.quality.criteria.map((criterion, index) => (
                <li key={criterion.id}>
                  <span className={styles.criterionWeight}>
                    {criterion.value ?? String(index + 1).padStart(2, "0")}
                  </span>
                  <strong>{criterion.label}</strong>
                  {criterion.badge ? <small>{criterion.badge}</small> : null}
                </li>
              ))}
            </ol>
          </div>

          {data.quality.ratingScale?.length ? (
            <div
              className={styles.ratingScale}
              aria-label="Review rating scale"
            >
              {data.quality.ratingScale.map((rating) => (
                <div key={rating.value}>
                  <strong>{rating.value}</strong>
                  <span>{rating.label}</span>
                </div>
              ))}
            </div>
          ) : null}
          <p className={styles.gradeRule}>{data.quality.rule}</p>
        </section>

        <section
          id={`${data.idPrefix}-repo`}
          className={styles.panel}
          aria-labelledby={`${data.idPrefix}-repo-title`}
        >
          <div className={styles.panelHeading}>
            <div>
              <p className={styles.eyebrow}>04 · Everything included</p>
              <h3 id={`${data.idPrefix}-repo-title`}>Repo files</h3>
              <p className={styles.fileIntro}>
                Open any file to read its actual contents.
              </p>
            </div>
            <a className={styles.repoDownload} href={repositoryHref} download>
              <Download aria-hidden="true" /> Download exact Repo
            </a>
          </div>

          <div className={styles.fileGroups}>
            {data.files.map((file) => (
              <details
                key={file.path}
                id={sourceFileId(data.idPrefix, file.path)}
                className={styles.fileRow}
                ref={(node) => {
                  fileRefs.current[file.path] = node;
                }}
              >
                <summary>
                  <strong className={styles.fileLabel}>{file.label}</strong>
                  <code>{file.path}</code>
                  <ChevronRight aria-hidden="true" />
                </summary>
                <pre className={styles.fileContent}>
                  <code>{file.content}</code>
                </pre>
              </details>
            ))}
          </div>
        </section>

        <details id={`${data.idPrefix}-advanced`} className={styles.advanced}>
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
                {data.receipt.rows.map((row) => (
                  <div key={row.label}>
                    <dt>{row.label}</dt>
                    <dd>{row.value}</dd>
                  </div>
                ))}
              </dl>
              <p className={styles.receiptNote}>{data.receipt.note}</p>
            </div>
          </div>
        </details>
      </div>
    </section>
  );
}

function sourceFileId(prefix: string, filePath: string) {
  return `${prefix}-file-${filePath
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}
