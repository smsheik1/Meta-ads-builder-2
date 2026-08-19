# Authored action recipe round trip

Source Xstage SHA-256: `507e8b0fa7b95d36b9429671b6b6a9ffa3dd77f5c559b84eb2b49add04512fca`

The actions below were rendered directly from their permitted Xstage ranges, extracted into `shaz-pose-recipe-v1`, then rendered again from the recipes. Five recipe renders are byte-identical to their direct calibration renders. Full Point counteracts the demo-shot X reposition at `Shaz_Master-P`, above every body branch, and preserves the artist montage's stepped presentation cadence. Finished artist-rendered frames supplied phase, cadence, and acceptance evidence only; their pixels were never copied, resampled, embedded, or used as deformation data.

| Action | Xstage frames | Recipe SHA-256 | Render SHA-256 | Runtime relation |
| --- | ---: | --- | --- | --- |
| present | 37–55 | `4194a352de951974d04d59abf1f267bd6c51025625f9b4cebab8b7157cdbcf38` | `35ae879582e30077feec8fd5947c7015ce4c45f0c23a74274e0afabd01d666a7` | byte-identical |
| shrug | 67–97 | `d94d08de5955c872543d85033a4ad7cb1cec25eae5f9ebb9ce6d1831e75f0da0` | `dcc2e9e5e20764a6eb1b8028407f3787fc844dbf2988bd70156d03aeaea1c4f4` | byte-identical |
| think | 117–165 | `8f260f187de082b1cf0ce4f0b0b8cb78dcb808e9f04662ba0630298e503e800f` | `c6892a1d0062f1e1de70f5d65be6aaa046e560d96a90528e98ef7090694efda2` | byte-identical |
| aha | 189–201 | `6bb1e4b5905c87015f5a21c7950ccebe4882907c82a8aecf861668eb17ac23a1` | `1052755e50a3c2a40af9c8eba2eaa1af249f5bef530f7f53bed11383c6904e6a` | byte-identical |
| point | 189–264 | `82dde0723d1d283dba4470f0a1874f8e3f57048197f6b82c76774e1effae4f02` | `bae1e529eed24ca852be1db5030b865fe3fffe701f6854e6191eeed69feb2bd4` | master-root stage normalization plus artist-authored stepped exposures and holds |
| confident | 287–299 | `20977ef32be9bc4261b18aa9158764b048403f30b75617107f46735130c04380` | `09224fc8e9f9e848ab71bb23e97e1acfc035db6fd6205b1dc5a690f65c8f1ffe` | byte-identical |

## `/watch-video` inspection

Every extracted frame from all six action clips was read in chronological order.

- `present`: neutral anticipation, facial squash, open-palm presentation, and opposite hand-on-hip settle remain connected.
- `shrug`: both hands turn palm-up; shoulders and head counter-tilt; the second beat closes the eyes; AutoPatch removes elbow seams.
- `think`: hand-to-chin substitution, eyelid changes, head drag, torso counter-motion, and held contemplation remain clean.
- `aha`: neutral anticipation resolves into a raised index finger, open mouth, and opposite hand-on-hip pose without joint gaps.
- `point`: the complete performance starts from the sideways point, snaps upward into the Ah-ha accent, returns to the extended point, and preserves the rebound, head drag, grin, and opposite hip-hand through the settle.
- `confident`: neutral anticipation resolves into an asymmetric hands-on-hips stance with a controlled head/torso settle.

All six recipes pass the automated provenance, layer-order, clipping, joint-continuity, facial-pop, and temporal-motion gates on every frame. The `aha` microgesture and complete `point` recipe record the artist reference's intentional raised-finger contact with the top edge on local frames 5–8; source-only validation prevents generated poses from declaring that exception. Point cancels unwanted demo-shot motion at the shared master, uses the measured exposure-change frames, and permits only its declared 26-frame Ah-ha hold and 10-frame pointing-anticipation hold.

The full 350-frame diagnostic sweep exposed unfinished post-roll beginning after frame 299. That material does not appear in the supplied 11.58-second artist reference and is not registered as an authored action. The explicit action registry prevents future agents from treating it as reusable source motion.
