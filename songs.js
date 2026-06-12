/* MAESTRO song library — public-domain / traditional melodies only.
 * Format: melody "PITCH:BEATS ... | ..." (| = phrase), chords "SYM:BEATS ...".
 * Library order = learning path (tier non-decreasing). */
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.MAESTRO_SONGS = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  return [
    {
      id: 'twinkle', he: 'כוכב קטן', en: 'Twinkle Twinkle', tier: 1, bpm: 100, key: 'C',
      melody:
        'C4:1 C4:1 G4:1 G4:1 A4:1 A4:1 G4:2 | F4:1 F4:1 E4:1 E4:1 D4:1 D4:1 C4:2 | ' +
        'G4:1 G4:1 F4:1 F4:1 E4:1 E4:1 D4:2 | G4:1 G4:1 F4:1 F4:1 E4:1 E4:1 D4:2 | ' +
        'C4:1 C4:1 G4:1 G4:1 A4:1 A4:1 G4:2 | F4:1 F4:1 E4:1 E4:1 D4:1 D4:1 C4:2',
      chords:
        'C:4 F:2 C:2 F:2 C:2 G7:2 C:2 C:2 F:2 C:2 G7:2 C:2 F:2 C:2 G7:2 ' +
        'C:4 F:2 C:2 F:2 C:2 G7:2 C:2',
    },
    {
      // Hänschen klein — the melody of the Israeli kids' classic
      id: 'yonatan', he: 'יונתן הקטן', en: 'Yonatan HaKatan', tier: 1, bpm: 110, key: 'C',
      melody:
        'G4:1 E4:1 E4:2 F4:1 D4:1 D4:2 | C4:1 D4:1 E4:1 F4:1 G4:1 G4:1 G4:2 | ' +
        'D4:1 D4:1 D4:1 D4:1 D4:1 E4:1 F4:2 | E4:1 E4:1 E4:1 E4:1 E4:1 F4:1 G4:2 | ' +
        'G4:1 E4:1 E4:2 F4:1 D4:1 D4:2 | C4:1 E4:1 G4:1 G4:1 C4:4',
      chords: 'C:4 G7:4 C:4 G7:4 G7:8 C:6 G7:2 C:4 G7:4 C:2 G7:2 C:4',
    },
    {
      // Frère Jacques — known to every Israeli kid as אחינו יעקב
      id: 'frere', he: 'אחינו יעקב', en: 'Frère Jacques', tier: 1, bpm: 100, key: 'C',
      melody:
        'C4:1 D4:1 E4:1 C4:1 C4:1 D4:1 E4:1 C4:1 | E4:1 F4:1 G4:2 E4:1 F4:1 G4:2 | ' +
        'G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4:1 C4:1 G4:0.5 A4:0.5 G4:0.5 F4:0.5 E4:1 C4:1 | ' +
        'C4:1 G3:1 C4:2 C4:1 G3:1 C4:2',
      chords: 'C:8 C:8 C:8 C:1 G7:1 C:2 C:1 G7:1 C:2',
    },
    {
      id: 'odetojoy', he: 'המנון לשמחה', en: 'Ode to Joy', tier: 1, bpm: 110, key: 'C',
      melody:
        'E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 | C4:1 C4:1 D4:1 E4:1 E4:1.5 D4:0.5 D4:2 | ' +
        'E4:1 E4:1 F4:1 G4:1 G4:1 F4:1 E4:1 D4:1 | C4:1 C4:1 D4:1 E4:1 D4:1.5 C4:0.5 C4:2',
      chords: 'C:4 G:4 C:4 G:4 C:4 G:4 C:4 G:2 C:2',
    },
    {
      id: 'birthday', he: 'יום הולדת שמח', en: 'Happy Birthday', tier: 1, bpm: 90, key: 'F',
      melody:
        'C4:0.5 C4:0.5 D4:1 C4:1 F4:1 E4:2 | C4:0.5 C4:0.5 D4:1 C4:1 G4:1 F4:2 | ' +
        'C4:0.5 C4:0.5 C5:1 A4:1 F4:1 E4:1 D4:1 | Bb4:0.5 Bb4:0.5 A4:1 F4:1 G4:1 F4:2',
      chords: 'F:4 C7:2 C7:4 F:2 F:3 Bb:3 Bb:2 F:1 C7:2 F:1',
    },
    {
      id: 'jingle', he: "ג'ינגל בלס", en: 'Jingle Bells', tier: 1, bpm: 120, key: 'C',
      melody:
        'E4:1 E4:1 E4:2 | E4:1 E4:1 E4:2 | E4:1 G4:1 C4:1 D4:1 E4:4 | ' +
        'F4:1 F4:1 F4:1 F4:1 | F4:1 E4:1 E4:1 E4:0.5 E4:0.5 | G4:1 G4:1 F4:1 D4:1 C4:4',
      chords: 'C:8 C:8 F:4 C:4 G7:4 C:4',
    },
    {
      // Traditional Hassidic circle tune; verified vs abcnotation (3 copies of one transcription)
      id: 'david', he: 'דוד מלך ישראל', en: 'David Melech Yisrael', tier: 1, bpm: 105, key: 'C',
      melody:
        'G4:2 E4:2 G4:0.5 G4:0.5 G4:0.5 G4:0.5 E4:2 | G4:2 A4:2 G4:1 F4:1 E4:1 D4:1 | ' +
        'C4:0.5 C4:0.5 D4:0.5 D4:0.5 C4:0.5 C4:0.5 D4:1 C4:1 F4:1 E4:0.5 D4:0.5 E4:1 | ' +
        'C4:0.5 C4:0.5 D4:0.5 D4:0.5 C4:0.5 C4:0.5 D4:1 C4:1 F4:1 E4:0.5 D4:0.5 C4:1',
      chords:
        'C:2 C:2 C:2 C:2 C:2 F:2 C:1 G:1 C:1 G:1 ' +
        'C:1 G:1 C:1 G:1 C:1 F:1 G:1 C:1 C:1 G:1 C:1 G:1 C:1 F:1 G:1 C:1',
    },
    {
      // Verified vs Wikipedia LilyPond score + Hymnary tune ISRAELI incipit (Dm)
      id: 'hevenu', he: 'הבאנו שלום עליכם', en: 'Hevenu Shalom Aleichem', tier: 2, bpm: 115, key: 'Dm',
      melody:
        'A3:0.5 D4:0.5 F4:0.5 A4:2 F4:1.5 E4:0.5 E4:0.5 D4:1.5 R:0.5 | ' +
        'D4:0.5 F4:0.5 A4:0.5 D5:2 Bb4:1.5 A4:0.5 A4:0.5 G4:1.5 R:0.5 | ' +
        'G4:0.5 A4:0.5 Bb4:0.5 A4:1.5 E4:0.5 A4:1.5 G4:0.5 G4:0.5 F4:1.5 R:0.5 | ' +
        'F4:0.5 E4:0.5 D4:0.5 A4:1 A4:1 A4:1 A4:1 A4:0.75 G4:0.25 F4:0.5 E4:0.5 D4:2',
      chords: 'Dm:8 D7:1.5 Gm:6.5 A:1.5 Dm:6.5 Dm:1.5 A:4 A7:2 Dm:2',
    },
    {
      id: 'canon', he: 'הקנון של פכלבל', en: "Pachelbel's Canon", tier: 2, bpm: 80, key: 'D',
      melody:
        'F#5:2 E5:2 D5:2 C#5:2 B4:2 A4:2 B4:2 C#5:2 | ' +
        'D5:2 C#5:2 B4:2 A4:2 G4:2 F#4:2 G4:2 E4:2 | ' +
        'D4:1 F#4:1 A4:1 G4:1 F#4:1 D4:1 F#4:1 E4:1 | ' +
        'D4:1 B3:1 D4:1 A4:1 G4:1 B4:1 A4:1 G4:1 | ' +
        'F#4:1 D4:1 E4:1 C#4:1 D4:4',
      chords:
        'D:2 A:2 Bm:2 F#m:2 G:2 D:2 G:2 A:2 D:2 A:2 Bm:2 F#m:2 G:2 D:2 G:2 A:2 ' +
        'D:2 A:2 Bm:2 F#m:2 G:2 D:2 G:2 A:2 D:2 A:2 G:2 D:2',
    },
    {
      id: 'furelise', he: 'לאליזה', en: 'Für Elise', tier: 3, bpm: 120, key: 'Am',
      melody:
        'E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 A4:1 | ' +
        'R:0.5 C4:0.5 E4:0.5 A4:0.5 B4:1 R:0.5 E4:0.5 G#4:0.5 B4:0.5 C5:1 | ' +
        'R:0.5 E4:0.5 E5:0.5 D#5:0.5 E5:0.5 D#5:0.5 E5:0.5 B4:0.5 D5:0.5 C5:0.5 A4:1 | ' +
        'R:0.5 C4:0.5 E4:0.5 A4:0.5 B4:1 R:0.5 E4:0.5 C5:0.5 B4:0.5 A4:2',
      chords: 'Am:5 E7:6 Am:6 E7:4 Am:3',
    },
    {
      // Scott Joplin 1902 (public domain) — the famous A-strain opening
      id: 'entertainer', he: 'האנטרטיינר', en: 'The Entertainer', tier: 3, bpm: 95, key: 'C',
      melody:
        'D4:0.5 D#4:0.5 E4:0.5 C5:1 E4:0.5 C5:1 E4:0.5 C5:3.5 | ' +
        'C5:0.5 D5:0.5 D#5:0.5 E5:0.5 C5:0.5 D5:0.5 E5:1 B4:0.5 D5:1 C5:2.5 | ' +
        'D4:0.5 D#4:0.5 E4:0.5 C5:1 E4:0.5 C5:1 E4:0.5 C5:3.5 | ' +
        'C5:0.5 D5:0.5 D#5:0.5 E5:0.5 C5:0.5 D5:0.5 E5:1 B4:0.5 D5:1 C5:2.5',
      chords: 'C:8 C:4 G7:2 C:2 C:8 C:4 G7:2 C:2',
    },
    {
      // Verified vs en+he Wikipedia LilyPond scores (pitch-identical); Dm standard key
      id: 'hatikvah', he: 'התקווה', en: 'Hatikvah', tier: 3, bpm: 80, key: 'Dm',
      melody:
        'D4:0.5 E4:0.5 F4:0.5 G4:0.5 A4:1 A4:1 Bb4:0.5 A4:0.5 Bb4:0.5 D5:0.5 A4:2 | ' +
        'G4:1 G4:0.5 G4:0.5 F4:1 F4:1 E4:0.5 D4:0.5 E4:0.5 F4:0.5 D4:1.5 A3:0.5 | ' +
        'D4:0.5 E4:0.5 F4:0.5 G4:0.5 A4:1 A4:1 Bb4:0.5 A4:0.5 Bb4:0.5 D5:0.5 A4:2 | ' +
        'G4:1 G4:0.5 G4:0.5 F4:1 F4:1 E4:0.5 D4:0.5 E4:0.5 F4:0.5 D4:2 | ' +
        'D4:1 D5:1 D5:1 D5:1 C5:0.5 D5:0.5 C5:0.5 Bb4:0.5 A4:2 | ' +
        'D4:1 D5:1 D5:1 D5:1 C5:0.5 D5:0.5 C5:0.5 Bb4:0.5 A4:2 | ' +
        'C5:1 C5:0.5 C5:0.5 F4:1 F4:1 G4:0.5 A4:0.5 Bb4:0.5 C5:0.5 A4:1 G4:0.5 F4:0.5 | ' +
        'G4:1 G4:1 F4:1 F4:0.5 F4:0.5 E4:0.5 D4:0.5 E4:0.5 F4:0.5 D4:2 | ' +
        'C5:1 C5:0.5 C5:0.5 F4:1 F4:1 G4:0.5 A4:0.5 Bb4:0.5 C5:0.5 A4:1 G4:0.5 F4:0.5 | ' +
        'G4:1 G4:1 F4:1 F4:0.5 F4:0.5 E4:0.5 D4:0.5 E4:0.5 F4:0.5 D4:2',
      chords:
        'Dm:4 Gm:2 Dm:2 Gm:2 Dm:2 A7:2 Dm:2 Dm:4 Gm:2 Dm:2 Gm:2 Dm:2 A7:2 Dm:2 ' +
        'Dm:4 C:2 F:2 Dm:4 C:2 F:2 ' +
        'Am:2 Dm:2 Gm:2 F:2 Gm:2 Dm:2 A7:2 Dm:2 Am:2 Dm:2 Gm:2 F:2 Gm:2 Dm:2 A7:2 Dm:2',
    },
    {
      // Verified vs 2 ABC transcriptions + Wikipedia score; E Phrygian dominant
      id: 'havanagila', he: 'הבה נגילה', en: 'Hava Nagila', tier: 3, bpm: 125, key: 'E',
      melody:
        'E4:1 E4:1.5 G#4:0.5 F4:0.5 E4:0.5 | G#4:1 G#4:1.5 B4:0.5 A4:0.5 G#4:0.5 | ' +
        'A4:1 A4:1.5 C5:0.5 B4:0.5 A4:0.5 | G#4:1 F4:0.25 E4:0.25 F4:0.5 G#4:2 | ' +
        'E4:1 E4:1.5 G#4:0.5 F4:0.5 E4:0.5 | G#4:1 G#4:1.5 B4:0.5 A4:0.5 G#4:0.5 | ' +
        'A4:1 A4:1.5 C5:0.5 B4:0.5 A4:0.5 | G#4:1 F4:0.25 E4:0.25 F4:0.5 E4:2 | ' +
        'G#4:0.5 G#4:1 F4:0.5 E4:0.5 E4:0.5 E4:1 | F4:0.5 F4:1 E4:0.5 D4:0.5 D4:0.5 D4:1 | ' +
        'D4:1 F4:0.75 E4:0.25 D4:0.5 D4:0.5 A4:1 | G#4:1 F4:0.25 E4:0.25 F4:0.5 G#4:2 | ' +
        'G#4:0.5 G#4:1 F4:0.5 E4:0.5 E4:0.5 E4:1 | F4:0.5 F4:1 E4:0.5 D4:0.5 D4:0.5 D4:1 | ' +
        'D4:1 F4:0.75 E4:0.25 D4:0.5 D4:0.5 A4:1 | G#4:1 F4:0.25 E4:0.25 F4:0.5 E4:2 | ' +
        'A4:2 A4:2 A4:1 A4:1 A4:1 A4:1 | ' +
        'A4:0.5 A4:0.5 C5:0.75 B4:0.25 A4:0.5 C5:0.5 B4:0.5 A4:0.5 | ' +
        'A4:0.5 A4:0.5 C5:0.75 B4:0.25 A4:0.5 C5:0.5 B4:0.5 A4:0.5 | ' +
        'B4:0.5 B4:0.5 D5:0.75 C5:0.25 B4:0.5 D5:0.5 C5:0.5 B4:0.5 | ' +
        'B4:0.5 B4:0.5 D5:0.75 C5:0.25 B4:0.5 D5:0.5 C5:0.5 B4:0.5 | ' +
        'B4:0.5 B4:0.5 E5:1 B4:0.5 B4:0.5 E5:0.75 E4:0.25 | ' +
        'E4:0.5 E4:0.5 C5:0.5 B4:0.5 A4:2',
      chords:
        'E:4 E:4 Am:4 E:4 E:4 E:4 Am:4 E:4 ' +
        'E:4 Dm:4 Dm:4 E:4 E:4 Dm:4 Dm:4 E:4 ' +
        'Am:4 Am:4 Am:4 Am:4 Dm:4 Dm:4 E7:4 E7:2 Am:2',
    },
  ];
});
