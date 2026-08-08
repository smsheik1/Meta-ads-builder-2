"use client";

import {
  ArrowRight,
  BadgeCheck,
  BookOpenText,
  Box,
  Braces,
  ChevronDown,
  Cpu,
  Download,
  FileInput,
  FileVideo,
  FileX2,
  Hand,
  ImageOff,
  Inbox,
  ListChecks,
  MessageSquareCode,
  OctagonAlert,
  PackageCheck,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  TerminalSquare,
  VideoOff,
  Workflow,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import type { BikiniBottomDanceOffTrustData } from "./bikiniBottomDanceOffTrust.server";
import styles from "./BikiniBottomDanceOffTrust.module.css";

type Props = {
  data: BikiniBottomDanceOffTrustData;
  openProofHref: string;
  poster: string | undefined;
  repositoryHref: string;
  videoSrc: string;
};

const fileGroupIcons = [
  BookOpenText,
  Braces,
  MessageSquareCode,
  BadgeCheck,
  Cpu,
  Box,
];

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
                <a href="#dance-off-assembly"><span>1</span>Assembly line</a>
              </li>
              <li>
                <a href="#proof"><span>2</span>Proof explained</a>
              </li>
              <li>
                <a href="#dance-off-quality"><span>3</span>Quality checks</a>
              </li>
              <li>
                <a href="#dance-off-repo"><span>4</span>Repo contents</a>
              </li>
              <li>
                <a href="#dance-off-advanced"><span>5</span>Advanced details</a>
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
              <p>
                See how your song and cast become a finished, inspected Reel.
              </p>
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
                icon={FileInput}
              />
              <FlowStation
                number="02"
                title="Plan"
                artifact="Timed scene map"
                color="pink"
                icon={ListChecks}
              />
              <FlowStation
                number="03"
                title="Approve"
                artifact="Human sign-off"
                color="lime"
                icon={Hand}
                approval
              />
              <FlowStation
                number="04"
                title="Generate"
                artifact="Voice + motion + edit"
                color="yellow"
                icon={Sparkles}
              />
              <FlowStation
                number="05"
                title="Inspect"
                artifact="Checks + watch-through"
                color="coral"
                icon={ScanSearch}
              />
              <FlowStation
                number="06"
                title="Deliver"
                artifact="MP4 + grade + evidence"
                color="violet"
                icon={PackageCheck}
              />
            </div>
            <div className={styles.transformation}>
              <div className={styles.packageSummary}>
                <span className={styles.packageIcon} data-color="cyan">
                  <Inbox aria-hidden="true" />
                </span>
                <span>
                  <small>What enters</small>
                  <strong>One creative request</strong>
                </span>
              </div>
              <span className={styles.transformArrow} aria-hidden="true">
                <ArrowRight />
              </span>
              <div className={styles.packageSummary}>
                <span className={styles.packageIcon} data-color="lime">
                  <FileVideo aria-hidden="true" />
                </span>
                <span>
                  <small>What exits</small>
                  <strong>Final video + proof receipt</strong>
                </span>
              </div>
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
              <p className={styles.eyebrow}>02 · Why this proof works</p>
              <h3 id="dance-off-proof-title">See it work.</h3>
              <p>
                Each timestamp is tied to the published video and a measured
                requirement from this exact Repo version.
              </p>
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
          aria-labelledby="dance-off-failures-title"
        >
          <div className={styles.panelHeading}>
            <div>
              <p className={styles.eyebrow}>03 · Quality checks</p>
              <h3 id="dance-off-failures-title">What gets stopped.</h3>
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

          <div className={styles.gateGrid}>
            <FailureGate
              color="cyan"
              icon={FileX2}
              title="Invalid requests"
            >
              A missing song, dialogue, video size, or dance assignment stops
              before generation.
            </FailureGate>
            <FailureGate
              color="pink"
              icon={ImageOff}
              title="Mismatched assets"
            >
              Unknown character, motion, background, and voice IDs fail contract
              validation.
            </FailureGate>
            <FailureGate
              color="lime"
              icon={Hand}
              title="Unapproved spending"
            >
              Fish Audio remains locked until dialogue is validated and the
              provider call is explicitly approved.
            </FailureGate>
            <FailureGate
              color="coral"
              icon={VideoOff}
              title="Broken final video"
            >
              Freezes, missing audio, bad dimensions, failed replay seams, or
              missing human approval block delivery.
            </FailureGate>
          </div>
          <div className={styles.exampleStop}>
            <OctagonAlert aria-hidden="true" />
            <p>
              <strong>Example stop:</strong> a taunt exceeds its 58-character
              contract. Voice generation does not run, so nothing is spent.
            </p>
          </div>
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
          </div>

          <div className={styles.repoSummary}>
            <span>
              <strong>
                {data.stats.motions} dances · {data.stats.backgrounds}{" "}
                backgrounds · automatic + human quality checks
              </strong>
              <small>
                <RefreshCw aria-hidden="true" /> Read from the published v
                {data.version} Repo
              </small>
            </span>
            <a href={repositoryHref} download>
              <Download aria-hidden="true" /> Download exact Repo
            </a>
          </div>

          <div className={styles.fileGroups}>
            {data.fileGroups.map((group, index) => {
              const Icon = fileGroupIcons[index] ?? Box;
              return (
                <details
                  key={group.title}
                  className={styles.fileGroup}
                  ref={(node) => {
                    fileGroupRefs.current[index] = node;
                  }}
                  open={index === 0}
                >
                  <summary>
                    <span className={styles.fileIcon} data-color={group.color}>
                      <Icon aria-hidden="true" />
                    </span>
                    <span>
                      <strong>{group.title}</strong>
                      <small>
                        {group.summary} · {group.files.length} files
                      </small>
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
              );
            })}
          </div>
        </section>

        <details id="dance-off-advanced" className={styles.advanced}>
          <summary>
            <span className={styles.advancedIcon}>
              <TerminalSquare aria-hidden="true" />
            </span>
            <span>
              <strong>Advanced · exact execution details</strong>
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
                  <dt>Automatic</dt>
                  <dd>
                    {data.proof.automaticScore}/{data.proof.automaticMaximum}
                  </dd>
                </div>
                <div>
                  <dt>Human review</dt>
                  <dd>
                    {data.proof.humanScore}/{data.proof.humanMaximum}
                  </dd>
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
  return `dance-off-file-${filePath.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function FlowStation({
  approval = false,
  artifact,
  color,
  icon: Icon,
  number,
  title,
}: {
  approval?: boolean;
  artifact: string;
  color: string;
  icon: typeof FileInput;
  number: string;
  title: string;
}) {
  return (
    <article className={styles.station}>
      <span className={styles.step}>{number}</span>
      <span className={styles.machine} data-color={color}>
        <Icon aria-hidden="true" />
        {approval ? (
          <span className={styles.gateArm} aria-hidden="true" />
        ) : null}
      </span>
      {approval ? <span className={styles.gateState}>Pauses here</span> : null}
      <div className={styles.stationCopy}>
        <h4>{title}</h4>
        <span>{artifact}</span>
      </div>
    </article>
  );
}

function FailureGate({
  children,
  color,
  icon: Icon,
  title,
}: {
  children: ReactNode;
  color: string;
  icon: typeof FileInput;
  title: string;
}) {
  return (
    <article className={styles.failureGate}>
      <span data-color={color}>
        <Icon aria-hidden="true" />
      </span>
      <div>
        <h4>{title}</h4>
        <p>{children}</p>
      </div>
    </article>
  );
}
