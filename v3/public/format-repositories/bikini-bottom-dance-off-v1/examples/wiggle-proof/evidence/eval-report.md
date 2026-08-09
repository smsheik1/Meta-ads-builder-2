# Bikini Bottom Dance Off evaluation

**B · 85/100 blind score**

Decision: pass

Technical gates: 16/16 passed

Blind shipping threshold: 85/100

## Technical gates

| Gate | Status | Measurement | Required |
| --- | --- | --- | --- |
| Reel width | pass | 1080 | exactly 1080 px |
| Reel height | pass | 1920 | exactly 1920 px |
| Frame rate | pass | 30 | 30 fps ±0.01 |
| Complete runtime | pass | 47 | 47 sec ±0.08 |
| Playable audio track | pass | aac | audio stream present |
| Three audible countdown beeps | pass | -36.1, -36.1, -33.9 | every beep window at least -45 dB |
| Music during every dance | pass | 5 measurements | every dance window at least -45 dB |
| Dialogue is audible | pass | 5 measurements | every dialogue window at least -45 dB |
| Countdown has clean gaps | pass | -91, -91, -91 | silent windows at most -65 dB |
| Every solo has showcase time | pass | 5.121, 5.121, 5.121, 5.121 | each solo at least 5 sec |
| Full group finale | pass | 9 | exactly 9 sec |
| Dedicated finale motions | pass | 4 | all four finale clips rendered |
| Nobody freezes in the finale | pass | 0, 0, 0, 0 | zero freeze events over 0.75 sec |
| Closing performer stays alive | pass | 02c080b9059c5902edb4dc4d0fd11fdc8446c964a80571a1e33c24d3fe2fd0c1, ad076aa7d109d8639599f9a67cec3819d2571c02b0ab51089b21eccdaa36a1b7 | CTA frame hashes differ |
| Four-character closing chorus | pass | 4 | four distinct voices |
| Replay seam | pass | 0.999 | half-scale luma SSIM at least 0.995 |

## Blind creative review

| Criterion | Status | Rating | Score | Confidence | Evidence |
| --- | --- | ---: | ---: | --- | --- |
| Character integrity | scored | 3 | 17/20 | high | 3.2-14.5s: SpongeBob and Patrick remain immediately recognizable through the opening, handoff, tilts, and body sways; their eyes, faces, silhouettes, and clothing stay coherent inside their panels.; 17.5-31s: Mr. Krabs keeps a stable eye-stalk, claw, shirt, and round-body silhouette while leaning and turning, and Squilliam's head, eyes, nose, arms, and torso remain coherent during his bends and arm poses.; 34.5-40s: All four characters remain identifiable during the finale, including side and back-facing turns, without visible melting, limb loss, or destructive intersections. |
| Motion quality and performance | scored | 3 | 17/20 | high | 4-14.5s: SpongeBob performs a compact arm-and-body sequence before Patrick takes over with broad leans and sways; the changes are continuous and intentionally staged.; 17.5-31s: Mr. Krabs works his claws and torso through a distinct routine, while Squilliam bends, turns, and raises his arms in a separate performance style without freezing or foot chaos.; 34.5-40s: The finale keeps all four moving through coordinated turns and gestures, though several moves are low-amplitude and read more as sways or pose changes than full-bodied dancing. |
| Dance readability and variety | scored | 3 | 12.75/15 | high | 3.2-31s: Each solo is clearly handed off with a bright character-colored border, a fixed name and dance label, and a visibly different movement vocabulary for SpongeBob, Patrick, Mr. Krabs, and Squilliam.; 34.5-40s: The 'FINAL ROUND - EVERYBODY WIGGLE!' section shows all four panels active at once, and each dancer continues to register independently. |
| Edit, pacing, and story flow | scored | 3 | 12.75/15 | high | 0-3.2s: A bold three-count establishes the dance-off and flows directly into SpongeBob's opening line.; 7.5-31s: Patrick, Mr. Krabs, and Squilliam hand off in a clear taunt-then-solo pattern, supported by captions, colored panel emphasis, and rhythmic slide transitions.; 34.5-47s: The group finale resolves into a large 'WHO WON?' CTA, then the file returns cleanly to the countdown when replayed. |
| Audio and voice performance | scored | 3 | 8.5/10 | medium | 3-10.8s: SpongeBob's opening and Patrick's taunt are intelligible over the music and align with the matching caption and highlighted character panel.; 15-27.6s: Mr. Krabs's and Squilliam's taunts remain understandable, are paced to their visual handoffs, and are associated with the correct color-coded captions and active panels.; 41-47s: The closing line lands above the music, followed by a deliberate brief audio release that supports the loop back into the countdown. |
| Reels composition and captions | scored | 3 | 8.5/10 | high | 3.2-31s: The 2x2 grid keeps every face, colored name tag, active border, and dance label readable, while taunt captions use high-contrast type in a dedicated lane below the panels.; 34.5-46.5s: The finale headline and oversized CTA remain centered and readable, and the lower portion of the 9:16 frame retains generous breathing room for expected Reels overlays. |
| Hook, payoff, and replay desire | scored | 3 | 8.5/10 | high | 0-3.2s: The large countdown and 'WHO CAN DANCE BEST?' question create an immediate, understandable competition hook.; 34.5-46.5s: All four dancers return for the final round, followed by the direct 'WHO WON?' and comment-your-winner CTA.; 46.5-47s: The darkened CTA ending cuts naturally back to the same four-panel board and countdown at the opening, making replay feel intentional. |

## Critical failures

None.

## Review limitations

None.

Automatic evidence: `quality-report.json`

Review packet: `review-packet.json`

Blind submission: `blind-review.json`

Contact sheet: `contact-sheet.png`
