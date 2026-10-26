# قدّور يتكلم

قدّور يقول التسجيل مع كابشن كلمة بكلمة، ويتحرك مع الكلام: فمه يمشي مع الصوت، يرمش، عيونه تلتفت، حواجبه تنرفع، يهز راسه، يضرب بالعصا على الكلمات المهمة، ويقفز وهو يضحك.

- **تشغيل مباشر:** `python3 -m http.server` داخل المجلد، افتح `index.html` واضغط على الشاشة.
- **فيديو:** `node tools/video.js http://localhost:8000/index.html out.mp4 60 52.3 voice.wav`
- **تسجيل جديد:** `tools/stt.py` يطلع الكلمات وتوقيتها، صحّح الكلمات في `words_fixed.json`، وعدّل التمثيل في `buildActing()` داخل `index.html`.

مبني بطريقة [rossark-motion-skill](../.claude/skills/rossark-motion-skill/SKILL.md)، وتفاصيل الريق في `MOTION.md`.
