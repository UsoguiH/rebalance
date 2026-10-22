// Word timings. Every animation is keyed to a word id so the whole piece
// re-times itself when cues.json is regenerated from a new voice-over.
export class Cues {
  constructor(doc) {
    this.duration = doc.duration;
    this.words = doc.words;
    this.map = new Map(doc.words.map((w) => [w.id, w]));
  }
  // start time of a word (or its end with end=true)
  at(id, end = false) {
    const w = this.map.get(id);
    if (!w) throw new Error('unknown cue ' + id);
    return end ? w.end : w.start;
  }
  end(id) { return this.at(id, true); }
}
