from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import textwrap
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont, ImageOps
except ModuleNotFoundError as error:
    raise SystemExit("Missing Python packages. Run: python3 -m pip install -r requirements.txt") from error


ROOT = Path(__file__).resolve().parent
RUNTIME = ROOT / "runtime"
RUN = ROOT / "run"
CONTENT_PATH = ROOT / "content.json"
BRIEF_PATH = ROOT / "brief.json"
CONCEPTS_PATH = ROOT / "concepts.json"
VISUAL_ASSETS_PATH = ROOT / "visual-assets.json"
VISUAL_PLAN_PATH = ROOT / "visual-plan.json"
APPROVALS = RUN / "approvals"
ROLES = ("a", "b", "question", "explain_a", "explain_b")
STORY_BEATS = ("setup", "mechanism", "payoff")
FONT_PATH = ROOT / "assets" / "fonts" / "PatrickHand-Regular.ttf"
VISUAL_TYPES = ("object", "diagram", "number", "tight-text-crop", "product", "icon")
VISUAL_SOURCE_KINDS = ("official-image", "official-screenshot", "licensed-reference", "constructed")
MAX_CONSTRUCTED_VISUALS = 2
AD_PHRASES = (
    "book a demo",
    "buy now",
    "click the link",
    "get started",
    "learn more",
    "sign up",
    "shop now",
    "try today",
)

sys.path.insert(0, str(RUNTIME))
try:
    import build_proof as engine  # noqa: E402
except ModuleNotFoundError as error:
    raise SystemExit("Missing Python packages. Run: python3 -m pip install -r requirements.txt") from error


def fail(message: str) -> None:
    raise SystemExit(message)


def load_json(path: Path):
    return json.loads(path.read_text())


def file_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def paths_hash(paths: list[Path]) -> str:
    digest = hashlib.sha256()
    for path in paths:
        digest.update(path.relative_to(ROOT).as_posix().encode("utf-8"))
        digest.update(path.read_bytes())
    return digest.hexdigest()


def write_json(path: Path, value: dict) -> None:
    path.write_text(json.dumps(value, indent=2) + "\n")


def validate_brief() -> dict:
    brief = load_json(BRIEF_PATH)
    for field in ("topic", "plainEnglish", "audience", "problemBefore", "mechanism", "surprisingTruth"):
        if not isinstance(brief.get(field), str) or not brief[field].strip():
            fail(f"brief.json is missing {field}.")
    evidence = brief.get("evidence")
    if not isinstance(evidence, list) or len(evidence) < 3:
        fail("brief.json must contain at least three evidence records.")
    evidence_ids: set[str] = set()
    for index, item in enumerate(evidence, start=1):
        if not all(isinstance(item.get(field), str) and item[field].strip() for field in ("id", "claim", "source")):
            fail(f"brief.json evidence {index} must include id, claim, and source.")
        if item["id"] in evidence_ids:
            fail(f"brief.json repeats evidence id: {item['id']}")
        evidence_ids.add(item["id"])
    return brief


def validate_visual_assets() -> dict:
    inventory = load_json(VISUAL_ASSETS_PATH)
    assets = inventory.get("assets")
    if not isinstance(assets, list) or not 6 <= len(assets) <= 20:
        fail("visual-assets.json must contain 6-20 sourced visual assets before concepts are generated.")
    asset_ids: set[str] = set()
    local_paths: set[str] = set()
    for index, asset in enumerate(assets, start=1):
        required = ("id", "localPath", "description", "recognizableObject", "sourcePageUrl", "assetSourceUrl")
        if not all(isinstance(asset.get(field), str) and asset[field].strip() for field in required):
            fail(f"Visual asset {index} is missing required source or recognition metadata.")
        if asset["id"] in asset_ids:
            fail(f"visual-assets.json repeats asset id: {asset['id']}")
        if asset["localPath"] in local_paths:
            fail(f"visual-assets.json repeats local image path: {asset['localPath']}")
        asset_ids.add(asset["id"])
        local_paths.add(asset["localPath"])
        if asset.get("sourceKind") not in VISUAL_SOURCE_KINDS:
            fail(f"Visual asset {asset['id']} has an unsupported sourceKind.")
        if not isinstance(asset.get("subjectSpecific"), bool):
            fail(f"Visual asset {asset['id']} must declare subjectSpecific as true or false.")
        for source_field in ("sourcePageUrl", "assetSourceUrl"):
            if not asset[source_field].startswith(("https://", "http://", "bundled://")):
                fail(f"Visual asset {asset['id']} must use a reviewable URL for {source_field}.")
        if asset["sourceKind"] == "constructed" and not str(asset.get("whyConstructed", "")).strip():
            fail(f"Constructed visual asset {asset['id']} must explain why a sourced visual could not be used.")
        relative_path = Path(asset["localPath"])
        if relative_path.is_absolute() or ".." in relative_path.parts:
            fail(f"Visual asset {asset['id']} must use a package-relative localPath.")
        image_path = ROOT / relative_path
        if not image_path.is_file():
            fail(f"Visual asset {asset['id']} is missing its local image: {asset['localPath']}")
        try:
            with Image.open(image_path) as image:
                if image.width < 400 or image.height < 200:
                    fail(
                        f"Visual asset {asset['id']} is too small for phone-size evidence: "
                        f"{asset['localPath']} ({image.width}x{image.height}; minimum 400x200)."
                    )
                image.verify()
        except Exception as error:
            fail(f"Visual asset {asset['id']} is unreadable: {asset['localPath']} ({error})")
    return inventory


def validate_concepts(require_selected: bool = False) -> dict:
    brief = validate_brief()
    inventory = validate_visual_assets()
    evidence_ids = {item["id"] for item in brief["evidence"]}
    visual_assets = {item["id"]: item for item in inventory["assets"]}
    data = load_json(CONCEPTS_PATH)
    concepts = data.get("concepts")
    if not isinstance(concepts, list) or len(concepts) != 5:
        fail("concepts.json must contain exactly five teaching concepts.")
    concept_ids: set[str] = set()
    for index, concept in enumerate(concepts, start=1):
        fields = (
            "id",
            "title",
            "viewerQuestion",
            "viewerLearns",
            "whyInteresting",
            "whyNotAnAd",
            "finalTakeaway",
        )
        if not all(isinstance(concept.get(field), str) and concept[field].strip() for field in fields):
            fail(f"Concept {index} is missing a required teaching field.")
        if len(concept["finalTakeaway"].split()) > 16:
            fail(f"Concept {concept['id']} finalTakeaway must be 16 words or fewer.")
        if concept["id"] in concept_ids:
            fail(f"concepts.json repeats concept id: {concept['id']}")
        concept_ids.add(concept["id"])
        refs = concept.get("evidenceIds")
        if not isinstance(refs, list) or not refs or any(ref not in evidence_ids for ref in refs):
            fail(f"Concept {concept['id']} must reference evidence from brief.json.")
        visual_asset_ids = concept.get("visualAssetIds")
        if (
            not isinstance(visual_asset_ids, list)
            or len(visual_asset_ids) != 6
            or len(set(visual_asset_ids)) != 6
            or any(asset_id not in visual_assets for asset_id in visual_asset_ids)
        ):
            fail(f"Concept {concept['id']} must reference six unique assets from visual-assets.json.")
        chosen_assets = [visual_assets[asset_id] for asset_id in visual_asset_ids]
        constructed_count = sum(asset["sourceKind"] == "constructed" for asset in chosen_assets)
        if constructed_count > MAX_CONSTRUCTED_VISUALS:
            fail(f"Concept {concept['id']} may use at most two constructed visuals.")
        if sum(bool(asset["subjectSpecific"]) for asset in chosen_assets) < 4:
            fail(f"Concept {concept['id']} must use at least four subject-specific visuals.")
        comparisons = concept.get("comparisonPlan")
        if not isinstance(comparisons, list) or len(comparisons) != 3:
            fail(f"Concept {concept['id']} must plan exactly three comparisons.")
        if tuple(comparison.get("beat") for comparison in comparisons) != STORY_BEATS:
            fail(f"Concept {concept['id']} must escalate through {STORY_BEATS} in order.")
        for comparison in comparisons:
            if not all(
                isinstance(comparison.get(field), str) and comparison[field].strip()
                for field in ("beat", "leftLabel", "rightLabel", "difference")
            ):
                fail(f"Concept {concept['id']} has an incomplete comparison plan.")
            if comparison["leftLabel"].strip().lower() == comparison["rightLabel"].strip().lower():
                fail(f"Concept {concept['id']} compares identical labels.")
    selected = data.get("selectedConceptId")
    if require_selected and selected not in concept_ids:
        fail("concepts.json must select one of its five concept IDs.")
    return data


def concept_approval_hash() -> str:
    inventory = validate_visual_assets()
    asset_paths = [ROOT / item["localPath"] for item in inventory["assets"]]
    return paths_hash([BRIEF_PATH, VISUAL_ASSETS_PATH, CONCEPTS_PATH, *asset_paths])


def require_concept_approval() -> dict:
    concepts = validate_concepts(require_selected=True)
    path = APPROVALS / "concept.json"
    if not path.is_file():
        fail("The selected concept is not approved. Show all five concepts, then run approve-concept.")
    receipt = load_json(path)
    if (
        receipt.get("status") != "approved"
        or receipt.get("conceptId") != concepts["selectedConceptId"]
        or receipt.get("inputHash") != concept_approval_hash()
    ):
        fail("The concept approval is stale. Show the current five concepts and approve one again.")
    return receipt


def selected_concept(concepts: dict) -> dict:
    return next(item for item in concepts["concepts"] if item["id"] == concepts["selectedConceptId"])


def script_approval_hash() -> str:
    return paths_hash([BRIEF_PATH, CONCEPTS_PATH, CONTENT_PATH])


def require_script_approval() -> dict:
    path = APPROVALS / "script.json"
    if not path.is_file():
        fail("The script is not approved. Show all fifteen sentences, then run approve-script.")
    receipt = load_json(path)
    if receipt.get("status") != "approved" or receipt.get("inputHash") != script_approval_hash():
        fail("The script approval is stale. Show and approve the current fifteen sentences again.")
    return receipt


def validate_visual_plan(content: dict, concepts: dict) -> dict:
    inventory = validate_visual_assets()
    visual_assets = {item["id"]: item for item in inventory["assets"]}
    approved_asset_ids = selected_concept(concepts)["visualAssetIds"]
    approved_asset_id_set = set(approved_asset_ids)
    plan = load_json(VISUAL_PLAN_PATH)
    if plan.get("selectedConceptId") != concepts["selectedConceptId"]:
        fail("visual-plan.json must use the approved selected concept.")
    proofs = plan.get("proofs")
    if not isinstance(proofs, list) or len(proofs) != 6:
        fail("visual-plan.json must contain exactly six proof-image plans.")
    expected = {
        (lesson, side): content["lessons"][lesson - 1][f"{side}Image"]
        for lesson in (1, 2, 3)
        for side in ("left", "right")
    }
    seen: set[tuple[int, str]] = set()
    used_asset_ids: list[str] = []
    for proof in proofs:
        key = (proof.get("lesson"), proof.get("side"))
        if key not in expected or key in seen:
            fail("visual-plan.json must plan each lesson side exactly once.")
        seen.add(key)
        for field in ("assetId", "image", "proves", "recognizableObject", "cropInstruction"):
            if not isinstance(proof.get(field), str) or not proof[field].strip():
                fail(f"Visual plan for lesson {key[0]} {key[1]} is missing {field}.")
        asset_id = proof["assetId"]
        if asset_id not in approved_asset_id_set or asset_id not in visual_assets:
            fail(f"Visual plan for lesson {key[0]} {key[1]} uses an asset outside the approved concept.")
        if asset_id in used_asset_ids:
            fail("visual-plan.json must use six different approved visual assets.")
        used_asset_ids.append(asset_id)
        if proof.get("visualType") not in VISUAL_TYPES:
            fail(f"Visual plan for lesson {key[0]} {key[1]} has an unsupported visualType.")
        if proof["image"] != expected[key]:
            fail(f"Visual plan for lesson {key[0]} {key[1]} does not match content.json.")
        if proof["image"] != visual_assets[asset_id]["localPath"]:
            fail(f"Visual plan for lesson {key[0]} {key[1]} does not use its inventoried asset file.")
    if used_asset_ids != approved_asset_ids:
        fail("visual-plan.json must preserve the approved concept's six visual assets in comparison order.")
    return plan


def proof_approval_hash(content: dict, plan: dict) -> str:
    image_paths = [ROOT / proof["image"] for proof in plan["proofs"]]
    return paths_hash([CONTENT_PATH, VISUAL_ASSETS_PATH, VISUAL_PLAN_PATH, *image_paths])


def require_proof_approval(content: dict, plan: dict) -> dict:
    path = APPROVALS / "proofs.json"
    if not path.is_file():
        fail("The six-image proof board is not approved. Run proof-board, show it, then run approve-proofs.")
    receipt = load_json(path)
    if receipt.get("status") != "approved" or receipt.get("inputHash") != proof_approval_hash(content, plan):
        fail("The proof-board approval is stale. Show and approve the current six images again.")
    return receipt


def validate_script() -> dict:
    engine.NOTES_FONT = str(FONT_PATH)
    concepts = validate_concepts(require_selected=True)
    content = load_json(CONTENT_PATH)
    lessons = content.get("lessons")
    if not isinstance(lessons, list) or len(lessons) != 3:
        fail("content.json must contain exactly three lessons.")
    for lesson_index, lesson in enumerate(content["lessons"], start=1):
        for field in ("leftLabel", "rightLabel", "sentences"):
            if not lesson.get(field):
                fail(f"Lesson {lesson_index} is missing {field}.")
        sentences = lesson["sentences"]
        if len(sentences) != 5 or tuple(item.get("role") for item in sentences) != ROLES:
            fail(f"Lesson {lesson_index} must use roles {ROLES} in order.")
        if not sentences[0].get("text", "").startswith("This is "):
            fail(f"Lesson {lesson_index} first sentence must start with 'This is '.")
        if not sentences[1].get("text", "").startswith("This is "):
            fail(f"Lesson {lesson_index} second sentence must start with 'This is '.")
        if sentences[2].get("text") != "What's the difference?":
            fail(f"Lesson {lesson_index} question must be exactly: What's the difference?")
        for sentence in sentences:
            if not sentence.get("text") or not sentence.get("chunks"):
                fail(f"Lesson {lesson_index} has an empty sentence or caption chunk.")
            lowered = sentence["text"].lower()
            if any(phrase in lowered for phrase in AD_PHRASES):
                fail(f"Lesson {lesson_index} contains ad-like CTA language: {sentence['text']}")
            if any(len(chunk) > 42 for chunk in sentence["chunks"]):
                fail(f"Lesson {lesson_index} has a caption chunk over 42 characters.")
    comparison_plan = selected_concept(concepts)["comparisonPlan"]
    for lesson_index, (lesson, planned) in enumerate(zip(lessons, comparison_plan), start=1):
        if lesson["leftLabel"] != planned["leftLabel"] or lesson["rightLabel"] != planned["rightLabel"]:
            fail(f"Lesson {lesson_index} labels do not match the approved concept plan.")
    final_takeaway = selected_concept(concepts)["finalTakeaway"].strip()
    if lessons[-1]["sentences"][-1]["text"].strip() != final_takeaway:
        fail("The final sentence must exactly match the approved concept's finalTakeaway.")
    word_count = sum(len(sentence["text"].split()) for lesson in lessons for sentence in lesson["sentences"])
    if not 55 <= word_count <= 100:
        fail(f"Narration must contain 55-100 words for the 25-35 second contract; found {word_count}.")
    return content


def validate_content() -> dict:
    content = validate_script()
    concepts = validate_concepts(require_selected=True)
    for lesson_index, lesson in enumerate(content["lessons"], start=1):
        for field in ("leftImage", "rightImage"):
            if not lesson.get(field):
                fail(f"Lesson {lesson_index} is missing {field}.")
            image_path = ROOT / lesson[field]
            if not image_path.is_file():
                fail(f"Lesson {lesson_index} references a missing image: {lesson[field]}")
            try:
                with Image.open(image_path) as image:
                    if image.width < 400 or image.height < 200:
                        fail(
                            f"Lesson {lesson_index} proof image is too small for phone-size evidence: "
                            f"{lesson[field]} ({image.width}x{image.height}; minimum 400x200)."
                        )
                    image.verify()
            except Exception as error:
                fail(f"Lesson {lesson_index} has an unreadable image: {lesson[field]} ({error})")
    validate_visual_plan(content, concepts)
    if not FONT_PATH.is_file():
        fail("Missing bundled Patrick Hand font.")
    label_font = ImageFont.truetype(str(FONT_PATH), 53)
    for lesson_index, lesson in enumerate(content["lessons"], start=1):
        for label in (lesson["leftLabel"], lesson["rightLabel"]):
            box = label_font.getbbox(label.title())
            if box[2] - box[0] > 400:
                fail(f"Lesson {lesson_index} label is too wide for its proof column: {label}")
        for sentence in lesson["sentences"]:
            for chunk in sentence["chunks"]:
                fitted = engine.fit_font(chunk, 940, 100, 58)
                box = fitted.getbbox(chunk)
                if box[2] - box[0] > 940:
                    fail(f"Lesson {lesson_index} caption cannot fit safely: {chunk}")
    for pose in ("point-left.png", "point-right.png", "question.png", "coffee-explain.png", "raise-hand.png"):
        pose_path = ROOT / "assets" / "poses" / pose
        if not pose_path.is_file():
            fail(f"Missing fixed pose asset: {pose}")
        expected_hash = load_json(ROOT / "assets" / "pose-hashes.json").get(pose)
        actual_hash = hashlib.sha256(pose_path.read_bytes()).hexdigest()
        if not expected_hash or actual_hash != expected_hash:
            fail(f"Fixed pose asset changed or failed provenance: {pose}")
        try:
            with Image.open(pose_path) as image:
                rgba = image.convert("RGBA")
                if not rgba.getchannel("A").getbbox():
                    fail(f"Fixed pose has no visible pixels: {pose}")
        except Exception as error:
            fail(f"Fixed pose is unreadable: {pose} ({error})")
    return content


def visual_factory(path: Path):
    def load() -> Image.Image:
        return Image.open(path).convert("RGB")

    return load


def require_creative_approvals(content: dict) -> None:
    concepts = validate_concepts(require_selected=True)
    require_concept_approval()
    require_script_approval()
    plan = validate_visual_plan(content, concepts)
    require_proof_approval(content, plan)


def configure_engine(require_approvals: bool = False) -> None:
    engine.NOTES_FONT = str(FONT_PATH)
    content = validate_content()
    if require_approvals:
        require_creative_approvals(content)
    engine.ROOT = ROOT
    engine.RUN = RUN
    engine.FRAMES = RUN / "frames"
    engine.AUDIO = RUN / "audio"
    engine.OUTPUT = RUN / "output"
    engine.CONTACT = RUN / "contact"
    engine.SOURCE_HOST = ROOT / "assets" / "poses"
    engine.LESSONS = tuple((lesson["leftLabel"], lesson["rightLabel"]) for lesson in content["lessons"])
    engine.SENTENCES = tuple(
        engine.Sentence(item["text"], tuple(item["chunks"]), lesson_index, item["role"])
        for lesson_index, lesson in enumerate(content["lessons"])
        for item in lesson["sentences"]
    )
    engine.VISUAL_BUILDERS = tuple(
        (visual_factory(ROOT / lesson["leftImage"]), visual_factory(ROOT / lesson["rightImage"]))
        for lesson in content["lessons"]
    )

    reference_rows = load_json(ROOT / "voice-references.json")
    engine.VOICE_REFERENCE_SIGNATURE = hashlib.sha256(
        b"".join((ROOT / item["file"]).read_bytes() + item["text"].encode("utf-8") for item in reference_rows)
    ).hexdigest()

    def voice_references():
        return [
            {"audio": (ROOT / item["file"]).read_bytes(), "text": item["text"]}
            for item in reference_rows
        ]

    engine.build_source_voice_references = voice_references


def show_concepts() -> None:
    data = validate_concepts()
    inventory = validate_visual_assets()
    visual_assets = {item["id"]: item for item in inventory["assets"]}
    rows = [
        {
            "id": concept["id"],
            "title": concept["title"],
            "viewerQuestion": concept["viewerQuestion"],
            "viewerLearns": concept["viewerLearns"],
            "whyInteresting": concept["whyInteresting"],
            "whyNotAnAd": concept["whyNotAnAd"],
            "storyArc": concept["comparisonPlan"],
            "finalTakeaway": concept["finalTakeaway"],
            "visualAssets": [
                {
                    "id": asset_id,
                    "description": visual_assets[asset_id]["description"],
                    "sourceKind": visual_assets[asset_id]["sourceKind"],
                }
                for asset_id in concept["visualAssetIds"]
            ],
        }
        for concept in data["concepts"]
    ]
    print(json.dumps({"status": "review-required", "concepts": rows, "providerCalls": 0}, indent=2))


def show_assets() -> None:
    inventory = validate_visual_assets()
    print(json.dumps({"status": "review-required", **inventory, "providerCalls": 0}, indent=2))


def approve_concept(concept_id: str | None, human_review: str) -> None:
    if human_review != "pass":
        fail("Concept approval requires --human-review pass after showing all five concepts.")
    data = validate_concepts()
    valid_ids = {concept["id"] for concept in data["concepts"]}
    if concept_id not in valid_ids:
        fail("--concept-id must name one of the five concepts in concepts.json.")
    data["selectedConceptId"] = concept_id
    write_json(CONCEPTS_PATH, data)
    APPROVALS.mkdir(parents=True, exist_ok=True)
    receipt = {"status": "approved", "conceptId": concept_id, "inputHash": concept_approval_hash()}
    write_json(APPROVALS / "concept.json", receipt)
    print(json.dumps(receipt, indent=2))


def approve_script(human_review: str) -> None:
    if human_review != "pass":
        fail("Script approval requires --human-review pass after showing all fifteen sentences.")
    require_concept_approval()
    validate_script()
    APPROVALS.mkdir(parents=True, exist_ok=True)
    receipt = {"status": "approved", "inputHash": script_approval_hash()}
    write_json(APPROVALS / "script.json", receipt)
    print(json.dumps(receipt, indent=2))


def wrapped_lines(text: str, width: int) -> list[str]:
    return textwrap.wrap(text, width=width, break_long_words=False) or [""]


def proof_board() -> Path:
    require_concept_approval()
    require_script_approval()
    content = validate_content()
    concepts = validate_concepts(require_selected=True)
    plan = validate_visual_plan(content, concepts)
    canvas = Image.new("RGB", (1080, 1920), (246, 248, 250))
    draw = ImageDraw.Draw(canvas)
    title_font = ImageFont.truetype(str(FONT_PATH), 54)
    label_font = ImageFont.truetype(str(FONT_PATH), 38)
    note_font = ImageFont.truetype(str(FONT_PATH), 27)
    draw.text((40, 30), "Six-image proof review", font=title_font, fill=(12, 12, 24))
    draw.text((40, 91), "Can every image prove one point in under one second?", font=note_font, fill=(65, 75, 90))
    card_width, card_height = 498, 560
    for index, proof in enumerate(plan["proofs"]):
        column, row = index % 2, index // 2
        x = 30 + column * 522
        y = 145 + row * 580
        draw.rounded_rectangle((x, y, x + card_width, y + card_height), radius=14, fill="white", outline=(190, 198, 210), width=2)
        lesson = content["lessons"][proof["lesson"] - 1]
        label = lesson[f"{proof['side']}Label"].title()
        draw.text((x + 22, y + 16), f"{proof['lesson']}. {label}", font=label_font, fill=(12, 12, 24))
        image_box = (x + 20, y + 72, x + card_width - 20, y + 390)
        with Image.open(ROOT / proof["image"]) as image:
            visual = ImageOps.contain(image.convert("RGB"), (image_box[2] - image_box[0], image_box[3] - image_box[1]), Image.Resampling.LANCZOS)
        visual_x = image_box[0] + (image_box[2] - image_box[0] - visual.width) // 2
        visual_y = image_box[1] + (image_box[3] - image_box[1] - visual.height) // 2
        canvas.paste(visual, (visual_x, visual_y))
        cursor_y = y + 410
        for line in wrapped_lines(proof["proves"], 39)[:4]:
            draw.text((x + 22, cursor_y), line, font=note_font, fill=(45, 55, 70))
            cursor_y += 31
    review_dir = RUN / "review"
    review_dir.mkdir(parents=True, exist_ok=True)
    path = review_dir / "proof-board.jpg"
    canvas.save(path, quality=94)
    print(json.dumps({"status": "review-required", "artifact": str(path), "providerCalls": 0}, indent=2))
    return path


def approve_proofs(human_review: str) -> None:
    if human_review != "pass":
        fail("Proof approval requires --human-review pass after showing the six-image board.")
    require_concept_approval()
    require_script_approval()
    content = validate_content()
    concepts = validate_concepts(require_selected=True)
    plan = validate_visual_plan(content, concepts)
    board = proof_board()
    APPROVALS.mkdir(parents=True, exist_ok=True)
    receipt = {
        "status": "approved",
        "inputHash": proof_approval_hash(content, plan),
        "proofBoard": str(board.relative_to(ROOT)),
    }
    write_json(APPROVALS / "proofs.json", receipt)
    print(json.dumps(receipt, indent=2))


def smoke() -> None:
    configure_engine()
    smoke_dir = RUN / "smoke"
    smoke_dir.mkdir(parents=True, exist_ok=True)
    frames = [
        engine.frame_image(sentence.lesson, sentence.role, chunk, index)
        for index, sentence in enumerate(engine.SENTENCES)
        for chunk in sentence.chunks
    ]
    sheet = Image.new("RGB", (540, ((len(frames) + 2) // 3) * 320), "white")
    for index, frame in enumerate(frames):
        thumb = ImageOps.fit(frame, (180, 320), method=Image.Resampling.LANCZOS)
        sheet.paste(thumb, ((index % 3) * 180, (index // 3) * 320))
    path = smoke_dir / "pose-and-layout-smoke.jpg"
    sheet.save(path, quality=92)
    print(json.dumps({"status": "pass", "providerCalls": 0, "artifact": str(path)}, indent=2))


def validate() -> None:
    content = validate_content()
    require_creative_approvals(content)
    missing_tools = [tool for tool in ("ffmpeg", "ffprobe") if not shutil.which(tool)]
    if missing_tools:
        fail("Missing local tools: " + ", ".join(missing_tools))
    print(json.dumps({"status": "pass", "lessons": len(content["lessons"]), "providerCalls": 0}, indent=2))


def render() -> None:
    configure_engine(require_approvals=True)
    engine.main()
    video = sorted((RUN / "output").glob("*.mp4"), key=lambda path: path.stat().st_mtime)[-1]
    contacts = sorted((RUN / "contact").glob("*.jpg"), key=lambda path: path.stat().st_mtime)
    manifest = {
        "inputHash": input_hash(),
        "video": str(video),
        "videoSha256": file_hash(video),
        "voiceSha256": file_hash(RUN / "audio" / "voice.m4a"),
        "contactSheet": str(contacts[-1]) if contacts else None,
    }
    (RUN / "render-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


def input_hash() -> str:
    content = load_json(CONTENT_PATH)
    paths = [
        BRIEF_PATH,
        VISUAL_ASSETS_PATH,
        CONCEPTS_PATH,
        CONTENT_PATH,
        VISUAL_PLAN_PATH,
        ROOT / "voice-references.json",
        FONT_PATH,
    ]
    paths.extend(ROOT / lesson[field] for lesson in content["lessons"] for field in ("leftImage", "rightImage"))
    paths.extend(sorted((ROOT / "assets" / "poses").glob("*.png")))
    paths.extend(ROOT / item["file"] for item in load_json(ROOT / "voice-references.json"))
    digest = hashlib.sha256()
    for path in paths:
        digest.update(path.relative_to(ROOT).as_posix().encode("utf-8"))
        digest.update(path.read_bytes())
    return digest.hexdigest()


def latest_video() -> Path:
    manifest_path = RUN / "render-manifest.json"
    if manifest_path.exists():
        manifested = Path(load_json(manifest_path)["video"])
        if manifested.is_file():
            return manifested
    videos = sorted((RUN / "output").glob("*.mp4"), key=lambda path: path.stat().st_mtime)
    if not videos:
        fail("No rendered MP4 exists. Run render first.")
    return videos[-1]


def inspect() -> dict:
    require_creative_approvals(validate_content())
    video = latest_video()
    manifest_path = RUN / "render-manifest.json"
    if not manifest_path.exists():
        fail("Missing render manifest. Render through the official runner first.")
    manifest = load_json(manifest_path)
    probe = json.loads(subprocess.check_output([
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration:stream=codec_type,width,height,r_frame_rate", "-of", "json", str(video),
    ], text=True))
    video_stream = next((item for item in probe["streams"] if item.get("codec_type") == "video"), {})
    audio_streams = [item for item in probe["streams"] if item.get("codec_type") == "audio"]
    duration = float(probe["format"]["duration"])
    silence_scan = subprocess.run([
        "ffmpeg", "-hide_banner", "-i", str(video), "-af",
        "silencedetect=noise=-42dB:d=0.251", "-f", "null", "-",
    ], capture_output=True, text=True, check=False)
    checks = {
        "size": (video_stream.get("width"), video_stream.get("height")) == (1080, 1920),
        "fps": video_stream.get("r_frame_rate") == "30/1",
        "duration": 25 <= duration <= 35,
        "oneAudioStream": len(audio_streams) == 1,
        "noSilenceGapOver250ms": "silence_duration:" not in silence_scan.stderr,
        "currentInputs": manifest.get("inputHash") == input_hash(),
        "manifestedVideo": Path(manifest.get("video", "")) == video,
        "manifestedVideoHash": manifest.get("videoSha256") == file_hash(video),
        "manifestedVoiceHash": manifest.get("voiceSha256") == file_hash(RUN / "audio" / "voice.m4a"),
    }
    timeline = load_json(RUN / "timeline.json")
    inspection_frames = RUN / "inspection-frames"
    if inspection_frames.exists():
        shutil.rmtree(inspection_frames)
    inspection_frames.mkdir(parents=True)
    contact = Image.new("RGB", (540, ((len(timeline) + 2) // 3) * 320), "white")
    for index, item in enumerate(timeline):
        frame_path = inspection_frames / f"frame-{index:03d}.png"
        midpoint = float(item["start"]) + float(item["duration"]) / 2
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{midpoint:.3f}",
            "-i", str(video), "-frames:v", "1", str(frame_path),
        ], check=True)
        with Image.open(frame_path) as frame:
            thumb = ImageOps.fit(frame.convert("RGB"), (180, 320), method=Image.Resampling.LANCZOS)
        contact.paste(thumb, ((index % 3) * 180, (index // 3) * 320))
    contact_path = RUN / "contact" / "inspection-contact.jpg"
    contact_path.parent.mkdir(parents=True, exist_ok=True)
    contact.save(contact_path, quality=92)
    report = {
        "status": "pass" if all(checks.values()) else "fail",
        "video": str(video),
        "contactSheet": str(contact_path),
        "duration": duration,
        "inputHash": manifest.get("inputHash"),
        "checks": checks,
    }
    report_path = RUN / "inspection.json"
    report_path.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))
    if report["status"] != "pass":
        raise SystemExit(1)
    return report


def finalize(human_review: str) -> None:
    if human_review != "pass":
        fail("Finalization requires --human-review pass after watching the MP4 and checking the voice.")
    report = inspect()
    final_dir = ROOT / "final"
    final_dir.mkdir(parents=True, exist_ok=True)
    destination = final_dir / "mugsy-explains.mp4"
    shutil.copy2(report["video"], destination)
    receipt = {
        "status": "final",
        "video": destination.name,
        "videoSha256": file_hash(destination),
        "inputHash": report["inputHash"],
        "checks": report["checks"],
        "humanReview": human_review,
    }
    (final_dir / "receipt.json").write_text(json.dumps(receipt, indent=2) + "\n")
    print(json.dumps({"status": "final", "video": str(destination)}, indent=2))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "command",
        choices=(
            "smoke",
            "assets",
            "concepts",
            "approve-concept",
            "approve-script",
            "proof-board",
            "approve-proofs",
            "validate",
            "render",
            "inspect",
            "finalize",
        ),
    )
    parser.add_argument("--concept-id")
    parser.add_argument("--human-review", choices=("pass", "fail"), default="fail")
    args = parser.parse_args()
    if args.command == "smoke":
        smoke()
    elif args.command == "assets":
        show_assets()
    elif args.command == "concepts":
        show_concepts()
    elif args.command == "approve-concept":
        approve_concept(args.concept_id, args.human_review)
    elif args.command == "approve-script":
        approve_script(args.human_review)
    elif args.command == "proof-board":
        proof_board()
    elif args.command == "approve-proofs":
        approve_proofs(args.human_review)
    elif args.command == "validate":
        validate()
    elif args.command == "render":
        render()
    elif args.command == "inspect":
        inspect()
    else:
        finalize(args.human_review)


if __name__ == "__main__":
    main()
