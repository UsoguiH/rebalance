# قرية الواحة: معرض أعمال ثلاثي الأبعاد

معرض أعمال تفاعلي باللغة العربية. يركب الزائر جملاً ويتجوّل في قرية طينية وسط الصحراء: السوق فيه المشاريع، والبيت فيه النبذة، وخيمة الشَّعر فيها المهارات، وبرج البريد للتواصل، وعند الواحة استراحة.

An interactive, Arabic (RTL) 3D portfolio. Visitors ride a camel around a mud-brick desert village. The souq holds the projects, the house the about section, the Bedouin tent the skills, and the post tower the contact links. There's an oasis to rest at, too. It's a new project written from scratch in a low-poly, faceted toy style. All code, models, music and sound effects are original: models are built in code and sound is synthesized with Web Audio.

## التشغيل / Run

No build step. Serve the folder with any static server (ES modules don't load from `file://`):

```sh
cd qarya-folio
python3 -m http.server 8080   # then open http://localhost:8080
```

three.js, cannon-es and the Arabic fonts are self-hosted in `vendor/` and `fonts/`. It works offline and deploys as-is to GitHub Pages, Netlify or any static host.

## التخصيص / Customise

Edit **`js/content.js`**. It holds your name, role, about text, projects, skills, contact links, every UI string, and the position of each section in the village.

## التحكم / Controls

| | Desktop | Phone |
|---|---|---|
| Move | ↑ ↓ / W S | drag anywhere (further = faster) |
| Turn | ← → / A D | drag direction |
| Run | Shift | drag to the edge |
| Jump | Space | jump button |
| Open section | Enter, or stand still in the circle | tap the prompt |
| Camel grunt | H | camel button |
| Mute | M | sound button |
| Reset | R | reset button |

## البنية / Structure

See [ARCHITECTURE.md](ARCHITECTURE.md) for the modules, the shared context, the events and the village layout.

## Licences

- three.js: MIT (`vendor/LICENSE-three.txt`)
- cannon-es: MIT (`vendor/LICENSE-cannon-es.txt`)
- Fonts Cairo, Reem Kufi and Aref Ruqaa: SIL Open Font License (`fonts/OFL-*.txt`)
