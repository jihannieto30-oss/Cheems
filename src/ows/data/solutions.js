/*
  problem → knowledge → solution

  The premise of the platform: nobody arrives wanting to read about porosity.
  They arrive with porosity. Each entry decomposes a defect into the vectors
  that actually produce it, what to look at to confirm which one is live, and
  what to change.
*/

export const SOLUTIONS = [
  {
    id: 'porosity',
    title: 'POROSITY',
    standard: 'AWS D1.1 §6.9',
    premise: 'Gas dissolved in the puddle, trapped by a solidification front it could not outrun.',
    vectors: [
      {
        label: 'CONTAMINATION',
        checks: ['Oil, cutting fluid, paint', 'Rust and mill scale', 'Zinc from galvanising'],
      },
      {
        label: 'GAS FLOW',
        checks: ['Below 20 cfh — starved', 'Above 45 cfh — turbulent, aspirating', 'Draught over 5 mph'],
      },
      {
        label: 'MOISTURE',
        checks: ['Electrode exposure time', 'Condensation on cold plate', 'Wet or porous gas line'],
      },
      {
        label: 'PARAMETERS',
        checks: ['Arc length too long', 'Stickout beyond gas envelope', 'Travel outpacing the puddle'],
      },
    ],
    resolution: [
      'Grind to bright metal 1 in either side of the joint',
      'Verify flow at the nozzle, not at the regulator',
      'Return low-hydrogen electrodes to a holding oven',
      'Shorten the arc, reduce stickout, slow travel',
    ],
  },
  {
    id: 'cracking',
    title: 'CRACKING',
    standard: 'AWS D1.1 §5.6 · §6.9',
    premise:
      'Two unrelated failures under one name. Establish hot or cold before changing anything.',
    vectors: [
      {
        label: 'MATERIAL',
        checks: ['Carbon equivalent above 0.45', 'Sulphur and phosphorus levels', 'Section thickness, restraint'],
      },
      {
        label: 'HEAT INPUT',
        checks: ['Cooling rate through t8/5', 'Interpass temperature drift', 'Bead too small for the section'],
      },
      {
        label: 'HYDROGEN',
        checks: ['Electrode moisture', 'Surface hydrocarbons', 'Delay of up to 72 h before it shows'],
      },
      {
        label: 'JOINT DESIGN',
        checks: ['Depth-to-width above 1.4', 'Unfilled craters', 'Restraint with no path to move'],
      },
    ],
    resolution: [
      'Preheat to the carbon-equivalent requirement and hold interpass',
      'Move to a low-hydrogen consumable and control its exposure',
      'Correct bead profile — width at or above depth',
      'PWHT where the code or the restraint calls for it',
    ],
  },
  {
    id: 'lack-of-fusion',
    title: 'LACK OF FUSION',
    standard: 'AWS D1.1 §6.9',
    premise:
      'Metal deposited against metal that never melted. Planar, tight, and invisible to the eye.',
    vectors: [
      {
        label: 'HEAT INPUT',
        checks: ['Current below the transfer threshold', 'Travel speed too high', 'Cold start on a cold plate'],
      },
      {
        label: 'TRANSFER MODE',
        checks: ['Short-circuit on heavy section', 'No spray transition reached', 'Voltage below the mode window'],
      },
      {
        label: 'TECHNIQUE',
        checks: ['Arc riding the puddle, not the leading edge', 'No dwell at the sidewall', 'Wrong work and travel angle'],
      },
      {
        label: 'ACCESS',
        checks: ['Included angle too tight', 'Interpass slag left in place', 'Root face beyond reach'],
      },
    ],
    resolution: [
      'Raise current or drop travel until the leading edge stays molten',
      'Move to spray or pulsed transfer above 1/4 in section',
      'Direct the arc at the sidewall and dwell at the toes',
      'Open the groove; inspect by UT, not RT',
    ],
  },
  {
    id: 'undercut',
    title: 'UNDERCUT',
    standard: 'AWS D1.1 Table 6.1',
    premise: 'Base metal melted away at the toe and never refilled. A fatigue problem first.',
    vectors: [
      {
        label: 'CURRENT',
        checks: ['Amperage above the electrode range', 'Voltage widening the arc cone', 'Arc force washing the toe'],
      },
      {
        label: 'TRAVEL',
        checks: ['Speed outrunning the fill', 'No pause at the weave extremity', 'Erratic rhythm'],
      },
      {
        label: 'ANGLE',
        checks: ['Work angle off the bisector', 'Excessive drag or push', 'Wrong position for the technique'],
      },
      {
        label: 'CONSUMABLE',
        checks: ['Diameter oversized for the joint', 'Wrong classification for position', 'Electrode extension out of range'],
      },
    ],
    resolution: [
      'Drop current to the lower third of the electrode range',
      'Slow travel and dwell at both toes of the weave',
      'Return the work angle to the joint bisector',
      'Blend and reweld — do not simply cap over it',
    ],
  },
  {
    id: 'distortion',
    title: 'DISTORTION',
    standard: 'AWS D1.1 §7.21',
    premise:
      'Restrained expansion and contraction resolving into permanent movement. Predictable, therefore preventable.',
    vectors: [
      {
        label: 'HEAT INPUT',
        checks: ['Oversized welds', 'Excessive passes', 'Continuous where intermittent would serve'],
      },
      {
        label: 'SEQUENCE',
        checks: ['Welded end to end in one direction', 'Unbalanced about the neutral axis', 'No back-step or skip'],
      },
      {
        label: 'JOINT DESIGN',
        checks: ['Single-sided groove', 'Excess groove volume', 'Asymmetric fillet placement'],
      },
      {
        label: 'RESTRAINT',
        checks: ['Fixturing that traps stress', 'No presetting for known shrinkage', 'Tacks too few, too far apart'],
      },
    ],
    resolution: [
      'Specify the smallest weld the design allows',
      'Balance the sequence about the neutral axis, back-step each run',
      'Preset the joint against the predicted shrinkage',
      'Correct by controlled flame straightening, not force',
    ],
  },
]
