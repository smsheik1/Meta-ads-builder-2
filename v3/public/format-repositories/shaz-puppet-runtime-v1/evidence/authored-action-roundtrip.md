# Authored action recipe round trip

Source Xstage SHA-256: `507e8b0fa7b95d36b9429671b6b6a9ffa3dd77f5c559b84eb2b49add04512fca`

The actions below were rendered directly from their permitted Xstage ranges, extracted into `shaz-pose-recipe-v1`, then rendered again from the recipes. Every recipe render is byte-identical to its direct calibration render. Finished artist-rendered frames were used only for visual evaluation and were never used as runtime or generation inputs.

| Action | Xstage frames | Recipe SHA-256 | Render SHA-256 | Round trip |
| --- | ---: | --- | --- | --- |
| present | 37–55 | `4194a352de951974d04d59abf1f267bd6c51025625f9b4cebab8b7157cdbcf38` | `35ae879582e30077feec8fd5947c7015ce4c45f0c23a74274e0afabd01d666a7` | byte-identical |
| shrug | 67–97 | `d94d08de5955c872543d85033a4ad7cb1cec25eae5f9ebb9ce6d1831e75f0da0` | `dcc2e9e5e20764a6eb1b8028407f3787fc844dbf2988bd70156d03aeaea1c4f4` | byte-identical |
| think | 117–165 | `8f260f187de082b1cf0ce4f0b0b8cb78dcb808e9f04662ba0630298e503e800f` | `c6892a1d0062f1e1de70f5d65be6aaa046e560d96a90528e98ef7090694efda2` | byte-identical |
| idea | 189–201 | `0579e530f63be54bc18a4fd983210c9f28bc92bddc95bb0de227912e3eefade1` | `1052755e50a3c2a40af9c8eba2eaa1af249f5bef530f7f53bed11383c6904e6a` | byte-identical |
| point | 225–264 | `86690e7f7d3574a78e386fd50f2523fcec5d004268432d0e82f55b0e8f1bffa0` | `3f32feb2b292085e90a8d2837fe921bd989cdf88ed2053e4c9d0d1f5cfa14e41` | byte-identical |
| confident | 287–299 | `20977ef32be9bc4261b18aa9158764b048403f30b75617107f46735130c04380` | `09224fc8e9f9e848ab71bb23e97e1acfc035db6fd6205b1dc5a690f65c8f1ffe` | byte-identical |

## `/watch-video` inspection

Every extracted frame from all six action clips was read in chronological order.

- `present`: neutral anticipation, facial squash, open-palm presentation, and opposite hand-on-hip settle remain connected.
- `shrug`: both hands turn palm-up; shoulders and head counter-tilt; the second beat closes the eyes; AutoPatch removes elbow seams.
- `think`: hand-to-chin substitution, eyelid changes, head drag, torso counter-motion, and held contemplation remain clean.
- `idea`: neutral anticipation resolves into a raised index finger, open mouth, and opposite hand-on-hip pose without joint gaps.
- `point`: extended pointing arm, hand substitution, head drag, and hip-hand pose remain stable through the hold.
- `confident`: neutral anticipation resolves into an asymmetric hands-on-hips stance with a controlled head/torso settle.

All six recipes pass the automated provenance, layer-order, clipping, joint-continuity, and facial-pop gates on every frame. The `idea` recipe records the artist reference's intentional raised-finger contact with the top edge on local frames 5–8; source-only validation prevents generated poses from declaring that exception.

The full 350-frame diagnostic sweep exposed unfinished post-roll beginning after frame 299. That material does not appear in the supplied 11.58-second artist reference and is not registered as an authored action. The explicit action registry prevents future agents from treating it as reusable source motion.
