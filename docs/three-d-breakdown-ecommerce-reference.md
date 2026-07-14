# 3D Breakdown Ecommerce Reference Baseline

> Historical reference analysis: use `docs/three-d-breakdown-prompt-signal-ledger.md` as the current source of truth for prompt, pipeline, evaluation, and credit-control decisions. This file preserves earlier experiments and may describe stale production details such as a four-clip assembly.

This is the current calibration target for the ecommerce version of `3D Breakdown`.

Reference file:

`/Users/shaz/Downloads/Franky_Shaw_-_70_Retention_with_my_v5_Framework_If_you_want_ads_that_hold_attent_InWQ2f.mp4`

Second reference file:

`/Users/shaz/Downloads/Franky_Shaw_-_Not_all_AI_ads_are_the_same._Using_my_v5_framework_which_I_don_t_h_Slo5Ef.mp4`

Local analysis artifacts:

- `/tmp/wiggly-reference-analysis/ecommerce-reference-contact-sheet.jpg`
- `/tmp/wiggly-reference-analysis/ecommerce-reference-first20-2fps.jpg`
- `/tmp/wiggly-reference-analysis/ecommerce-style-reference-2x2.jpg`
- `v3/public/three-d-breakdown/references/ecommerce-teardown-style-reference-clean-v7.jpg`

## Baseline Ratings

- Script: 9/10. It starts with a hidden problem the customer does not already understand, then turns product mechanism into the answer.
- Visuals: 9.5/10. Blue technical grid world, chunky 3D objects, macro product-science details, and a recurring silent 3D demonstrator/scale figure make it instantly readable.
- Speed/change density: 10/10. The first 20 seconds changes object state, camera scale, or mechanism roughly every 0.5-1.5 seconds.
- Continuity: 9/10. The world stays coherent while each beat introduces a new module.
- Wiggly current baseline before the latest prompt tightening: about 5.5/10 visually. The output was too flat, too poster-like, not hosted enough, and did not have enough product-science continuity.

## Required Ecommerce Grammar

The output should feel like a fast product-science teardown, not a product card, lifestyle ad, slideshow, or generic AI 3D montage.

Required ingredients:

- Bright blue/cyan technical grid floor and wall.
- Flat readable lab lighting, not moody cinematic darkness.
- A recurring silent 3D demonstrator/scale figure in most frames: full body, torso, hands, over-shoulder view, pointer, or product-use surface depending on the beat.
- The demonstrator is not a narrator, doctor, lab technician, mannequin, or test dummy. Avoid medical PPE, masks, lab coats, scientist costumes, and blue gloves. A plain cap or non-medical goggles perched on the head are okay when they read as casual creator/demo styling, but the character must never look like a clinician.
- The human never performs the ad copy. Narrator/captions carry the argument; the human only demonstrates scale, use, and cause/effect.
- The checked-in style reference is text-free on purpose. It preserves the silent demonstrator, blue-grid world, body-route, product path, mechanism insert, and final payoff without asking image models to copy source captions or shirt text. Real Wiggly captions are renderer overlays.
- One product or package identity anchored across the sequence.
- No generated readable text, captions, labels, logos, numbers, checkmarks, or arrows inside images.
- Brand names, product names, evidence text, CTA copy, and overlay text may appear in prompt context, but image/video providers must render blank packages/tokens only. v10 failed this by writing product text in the final panel; v11 is the current accepted storyboard direction.
- Captions are renderer overlays.
- One visible state change per frame or roughly every second in video.
- Four or more visual modules across the 20 seconds: product/scale intro, body/pathway or hidden obstacle, mechanism machine or cutaway, component/particle movement, evidence payoff, final product payoff.
- The best frames teach with objects, not explanation: the demonstrator uses or wears the product, the hidden route/obstacle appears, particles/components move, a machine/cutaway changes state, and the final product resolves the lesson.
- Maxfusion founder rule: each script line must become a visible object/action before it becomes an image prompt. If the narration says a body, product, ingredient, or mechanism changes state, the frame must show that change instead of relying on text.
- Every generated frame needs a concrete prompt skeleton: locked style, recurring demonstrator/product, scene action, camera/framing, lighting, color/mood, and consistency. If any frame cannot be described this way, it is too vague for this format.
- Apply the founder prompt discipline to every storyboard still and production anchor: visual fingerprint first, recurring subject/product second, then concrete action, camera/framing, lighting, color/mood, and consistency. The frame must feel like footage from the same ad, not a standalone AI image sample.
- Each frame needs one visible before/after state change: object moves, layer peels, path blocks, capsule travels, particles scatter, mechanism opens, or payoff resolves.
- The demonstrator must stay consistent across frames: same face, cap/goggles if used, shirt color, body scale, and product relationship. Reference consistency matters more than inventing a fresh character pose in every panel.
- For delivery, digestion, or absorption premises, the original reference grammar is: full-body demonstrator with capsule/cup, transparent torso or body-route, macro obstacle wall, machine/pipe mechanism, demonstrator/product proof, final bottle/product close. Do not force this grammar onto routine, testing, portability, taste, or ingredient-compression premises.
- Do not overcorrect this into a standalone beaker or generic lab-chamber demo. The original uses transparent torso, gut route, cell-wall, and body/pathway footage, but it stays tied to the same silent demonstrator, product, capsule, and blue-grid world.
- "Avoid biology montage" means avoid detached stock-science footage. Reference-style body-route/cell-wall visuals are correct when the demonstrator, product path, capsule particles, or scale proxy remains the continuity anchor.
- Hidden obstacle frames should look like clean graphic product-science footage: blue body-route, tidy pink cell-wall/obstacle surface, visible particles, and crisp grid-world lighting. Avoid wet fleshy intestine tunnels, gore, horror anatomy, disconnected organ close-ups, or gross medical macro shots.

## Original First-20s Reference Map

The opening 20 seconds of the original reference is the clearest Seed target:

1. Full-body human holds the supplement and swallows it.
2. Camera cuts into the same body with transparent torso and digestive route.
3. Golden particles move through gut/pathway space.
4. A pink cell-wall obstacle appears and physically blocks or piles up the particles.
5. The video returns to the full-body demonstrator to show what happens before the ingredient becomes available.
6. The brand mechanism appears as a physical product-science machine, then returns to the demonstrator/product world.

This is the key lesson: it is not generic biology footage. It is a silent human/product demo that repeatedly jumps into physical mechanism modules and returns to the same blue-grid product world.

## Second Reference Transcript

After the game, a steel box arrived. Inside, beige compression socks for tired legs. He immediately thought of his grandmother. Through one sock, he pictured a rocking chair and a very long flight. Clearly, he decided they weren't for him. Then the beige shell cracked away, revealing Hollow socks: black, athletic, and completely rebuilt with soft alpaca fiber. He pulled them just below his knees. The graduated compression supported his legs, and he could still move freely, so he trained in them. They stayed up, stayed comfortable, and never interrupted a cut, jump, or landing. Athlete, pilot, golfer, surgeon. Compression socks aren't just for one kind of person. They were simply first to notice. Hollow, reimagined compression socks for everyday movement. Learn more and meet the pair your legs may actually enjoy. Oh, hello.

## Second Reference Pattern

- Concrete incident first: the box arrives after a game.
- False classification: the athlete assumes the product is for a grandmother or long flight.
- Product POV gag: the sock becomes a portal into the wrong mental model.
- Literal reveal: the beige old-product shell cracks away.
- Rebuild proof: black athletic sock, alpaca fiber, graduated compression.
- Use test: pull below knees, move, cut, jump, land.
- Audience expansion: athlete, pilot, golfer, surgeon.
- Final reframing: the old audience noticed first, but the product is for everyday movement.
- Clean product close with brand/product, not a feature list.

## Six-Frame Storyboard Board

The first paid-ish visual gate is one 6-frame storyboard board for visual QA. It is not final footage.

1. False assumption/common use.
2. Hidden physical obstacle, body route, or product path.
3. First mechanism/component setup with the silent demonstrator, torso, hands, full-body scale figure, or prop demo still anchoring the world.
4. Peak impossible-to-film cutaway or delivery reveal.
5. Unified evidence/payoff with the engineered product central.
6. Final product payoff with blank tokens for renderer overlays.

The board is allowed to be a contact sheet for QA only. Individual production anchors later must not be a collage, split screen, or labeled storyboard.
The second-half reveal anchor must keep the product and silent demonstrator in the same blue-grid world; do not detach the mechanism into a standalone macro tube or biology insert.

Current accepted Seed visual gate artifacts:

- Storyboard board direction: `output/three-d-breakdown/seed-style-b-storyboard-board-v20-reference-balance.jpg`
- Current four-beat rough: `output/three-d-breakdown/final-assembly/seed-reference-match-v5-captioned-voice.mp4`
- Current four-beat contact sheet: `output/three-d-breakdown/final-assembly/seed-reference-match-v5-2fps-contact.jpg`

## 20 Second Clip Rhythm

MVP duration is 20 seconds. The locked acceptance assembly uses two 10-second clips:

1. Clip 1: frames 1-3, false assumption, hidden problem, and mechanism setup.
2. Clip 2: frames 4-6, peak reveal, evidence payoff, and clean final product state.

Each clip needs quick internal micro-beats rather than one slow drift. First/last-frame conditioning locks frames 1 to 3 and frames 4 to 6; the middle frame becomes timecoded choreography.

Supplement clips use a body-route only when the selected premise and evidence are about ingestion, digestion, or absorption. Routine, testing, portability, taste, and ingredient-compression stories stay in the coherent demonstrator/product world instead of inventing anatomy.

## Current Provider Stop Condition

Do not keep trying provider calls if Replicate or another provider reports credit, rate-limit, or configuration limits. Stop and ask the user to fix the external account state.
