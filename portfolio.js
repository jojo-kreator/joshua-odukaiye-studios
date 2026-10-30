/* The photographs on the site, in the order they appear.
 *
 * To add a photograph:
 *   1. Put two JPEGs in the "img" folder:  name.jpg  (long edge about 2000 px)  and  name-m.jpg  (long edge about 1200 px).
 *   2. Add one line for it inside a row below:   ["name", "WIDTH:HEIGHT", "A short description of the photo"],
 *      where WIDTH:HEIGHT are the pixel size of name-m.jpg (for example "1200:800").
 *
 * A row shows its photographs side by side at one shared height, so put 2 or 3 photographs in a row.
 * To add a new section (for example Weddings or Fashion), copy a whole { ... } block, give it a new "id" and "title".
 * "narrow": true keeps a section of tall (portrait) photographs from becoming too large on wide screens.
 */
window.PORTFOLIO = [
  {
    id: "portraits",
    title: "Studio portraits",
    note: "Controlled light and honest expression.",
    narrow: true,
    rows: [
      [
        ["portrait-pinstripe-suit", "800:1200", "Man in a navy pinstripe double-breasted suit against a dark studio backdrop"],
        ["portrait-grey-backdrop", "960:1200", "Close portrait of a woman in a cream blouse, resting her cheek on her hand, against a grey studio backdrop"],
      ],
      [
        ["portrait-white-gown", "900:1200", "Woman in a white gown and lace headpiece reclining on a red chair against a grey studio backdrop"],
        ["portrait-green-backdrop", "960:1200", "Seated woman in a red top against a deep green studio backdrop"],
      ],
    ]
  },
  {
    id: "graduation",
    title: "Graduation sessions",
    note: "A milestone, photographed with the gown and the person wearing it.",
    narrow: true,
    rows: [
      [
        ["graduation-seated", "800:1200", "Graduate seated on an orange chair in a black jacket and maroon hood, her gown on a stand beside her"],
        ["graduation-standing", "800:1200", "Graduate standing in a maroon cap and hood, her gown on a stand beside her"],
      ],
    ]
  },
  {
    id: "worship",
    title: "Worship gatherings",
    note: "The room as it felt, from the lectern to the last row.",
    rows: [
      [
        ["worship-congregation-bw", "1200:900", "Black and white view over the congregation toward a minister speaking at the lectern"],
        ["worship-minister-profile", "1200:900", "Minister speaking in profile in front of wood panelling, with a camera operator behind him"],
        ["worship-minister-pointing", "1200:900", "Minister pointing toward the congregation from behind a glass lectern"],
      ],
      [
        ["worship-man-glasses", "1200:900", "Man in glasses and a patterned cap listening among the congregation"],
        ["worship-row-of-faces", "1200:900", "Rows of worshippers during a service, a woman in an orange top looking toward the camera"],
        ["worship-man-bw", "1200:900", "Black and white portrait of a man between two blurred faces in the congregation"],
      ],
      [
        ["worship-singer-lectern", "1200:900", "Woman singing with her eyes closed at the lectern, also shown on the screen beside her"],
        ["worship-hands-raised", "1200:900", "Woman in a white dress with both hands raised in worship"],
        ["worship-team-in-white", "1200:900", "Worship leader with her arm raised, flanked by singers in white shirts"],
      ],
    ]
  },
  {
    id: "live",
    title: "Live recording sessions",
    note: "Low light, close to the music.",
    rows: [
      [
        ["live-band-wide", "1200:960", "Wide view of a live recording session: a singer with an acoustic guitar, a vocalist, keyboards and an electric guitarist under studio lights"],
        ["live-keys-vocal", "1200:960", "Musician singing and playing a red Nord Stage keyboard in a dimly lit recording room"],
      ],
      [
        ["live-camera-tripod", "960:1200", "Woman with her eyes closed and a hand on her chest, standing beside a camera on a tripod during a live session"],
        ["live-keys-headphones", "960:1200", "Keyboardist in headphones and round glasses playing a red Nord Stage keyboard"],
        ["live-guitar-vocal", "960:1200", "Singer with an acoustic guitar, eyes closed and smiling, mid-song on a live recording session"],
      ],
    ]
  },
];
