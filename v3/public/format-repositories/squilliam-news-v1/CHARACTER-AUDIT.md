# Character import audit

The downloaded archives were inspected without modifying the originals. Four characters passed the news-anchor render check and ship in this private Format Repo: Squilliam Fancyson, Squidward Tentacles, SpongeBob SquarePants, and Mr. Krabs.

| Character | Import result | Reason |
| --- | --- | --- |
| Squilliam Fancyson | Included | Existing calibrated 48-joint presenter rig. |
| Squidward Tentacles | Included | 48-joint skeleton is structurally equivalent to Squilliam's rig. |
| SpongeBob SquarePants | Included | Named arm, face, jaw, and eyelid bones passed the nine-pose smoke render. |
| Mr. Krabs | Included | Named arm, claw, jaw, and eyelid bones passed the nine-pose smoke render. |
| Patrick Star | Left out | The rig responds, but framing and desk placement did not meet the presenter bar. |
| Sandy Cheeks | Left out | The rig responds, but the helmet/glass material obscures her face in the official renderer. |
| Larry the Lobster | Left out | The 41-joint skeleton uses generic `Dummy` names and needs a manual semantic adapter. |
| Man Ray | Left out | The 57-joint skeleton uses generic `Dummy` names and needs a manual semantic adapter. |
| Announcer Fish | Left out | The archive contains only OBJ/MTL geometry with no skeleton. |
| Gary | Left out | The archive contains only OBJ/MTL geometry with no skeleton. |

The left-out archives remain in the user's Downloads folder and can be revisited later without bloating or destabilizing this kit.
