// Gate: just حواء and آدم — two big doors, nothing else.
import { $, $$, hydrateIcons, hasChosenSection, getSection, setSection } from './shell.js';
import { spring } from './motion.js';

hydrateIcons();
if (hasChosenSection()) $(`.g2.${getSection()}`)?.classList.add('last');
$$('.g2').forEach((d, i) => {
  spring(d, [{ opacity: 0, transform: 'translateY(36px) scale(.96)' }, { opacity: 1, transform: 'none' }], 'smooth', { delay: 0.05 + i * 0.09 });
  d.addEventListener('click', () => setSection(d.dataset.door));
});
