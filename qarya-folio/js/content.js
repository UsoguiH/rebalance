// كل نصوص الموقع ومواقع الأقسام هنا. عدّل هذا الملف لتخصيص معرض أعمالك.
// All copy and section positions live here. Edit this file to personalise.

export const profile = {
  name: 'اسمك هنا',
  role: 'مطوّر ومصمم تجارب تفاعلية',
  tagline: 'أهلاً بك في قريتي — اركب الجمل وتجوّل بين أعمالي',
  about: [
    'مرحباً! أنا مطوّر ومصمم أحب صنع تجارب على الويب تمزج البرمجة بالفن والحكاية.',
    'أعمل على الواجهات الأمامية والرسوميات ثلاثية الأبعاد وتصميم الحركة والصوت.',
    'هذه القرية نفسها مثال على ما أحب صنعه: مكان صغير تتجوّل فيه بدل صفحة جامدة.',
  ],
  facts: [
    ['الموقع', 'الرياض، السعودية'],
    ['الخبرة', 'أكثر من ٥ سنوات'],
    ['اللغات', 'العربية، الإنجليزية'],
  ],
};

export const projects = [
  {
    id: 'rihla',
    title: 'رحلة',
    subtitle: 'تطبيق لحجز الرحلات البرية',
    color: '#c43b2e',
    year: '٢٠٢٦',
    tags: ['React', 'Node.js', 'خرائط'],
    body: 'منصة تربط المسافرين بأدلاء محليين لرحلات التخييم في البر، مع خرائط تفاعلية وحجز فوري ودفع إلكتروني.',
    link: '#',
  },
  {
    id: 'huruf',
    title: 'حروف',
    subtitle: 'أداة لتكوين الخط العربي',
    color: '#1f8a8a',
    year: '٢٠٢٥',
    tags: ['Canvas', 'Typography', 'AI'],
    body: 'محرر يحوّل النص إلى تكوينات خطية مستوحاة من الكوفي والثلث، مع تصدير متجهي جاهز للطباعة.',
    link: '#',
  },
  {
    id: 'thurayya',
    title: 'الثريا',
    subtitle: 'خريطة سماء ثلاثية الأبعاد',
    color: '#2e3f7f',
    year: '٢٠٢٥',
    tags: ['Three.js', 'GLSL', 'WebAudio'],
    body: 'خريطة سماء تفاعلية تعرض النجوم بأسمائها العربية القديمة، مع رواية صوتية لقصص كل نجم.',
    link: '#',
  },
  {
    id: 'dukkan',
    title: 'دكّان',
    subtitle: 'متجر إلكتروني للحرفيين',
    color: '#e8742a',
    year: '٢٠٢٤',
    tags: ['Next.js', 'Stripe', 'تصميم'],
    body: 'متجر يعرض منتجات الحرفيين المحليين بتصميم يحترم اتجاه القراءة من اليمين إلى اليسار في كل تفصيلة.',
    link: '#',
  },
];

export const skills = [
  'JavaScript', 'TypeScript', 'Three.js', 'WebGL', 'React', 'Node.js',
  'Blender', 'GLSL', 'WebAudio', 'تصميم الواجهات',
];

export const contact = [
  { id: 'mail', label: 'البريد', value: 'you@example.com', href: 'mailto:you@example.com' },
  { id: 'github', label: 'GitHub', value: 'github.com/you', href: 'https://github.com/' },
  { id: 'linkedin', label: 'LinkedIn', value: 'linkedin.com/in/you', href: 'https://www.linkedin.com/' },
  { id: 'x', label: 'X', value: '@you', href: 'https://x.com/' },
];

// أماكن الأقسام في القرية (metres; +X east, -Z north). The village module
// builds a landmark at each `landmark` spot; the zone circle sits in front of
// it where the camel stops. Keep these in sync with js/world/village.js.
export const zones = [
  { id: 'welcome', section: 'welcome', title: 'بوابة القرية', x: 0, z: 17, radius: 3, landmark: { x: 0, z: 14 }, autoOpen: false },
  { id: 'project-0', section: 'project', project: 0, title: projects[0].title, x: -22, z: -3, radius: 2.4, landmark: { x: -25, z: -3 } },
  { id: 'project-1', section: 'project', project: 1, title: projects[1].title, x: -22, z: -11, radius: 2.4, landmark: { x: -25, z: -11 } },
  { id: 'project-2', section: 'project', project: 2, title: projects[2].title, x: -14, z: -3, radius: 2.4, landmark: { x: -11, z: -3 } },
  { id: 'project-3', section: 'project', project: 3, title: projects[3].title, x: -14, z: -11, radius: 2.4, landmark: { x: -11, z: -11 } },
  { id: 'about', section: 'about', title: 'بيتي', x: 18, z: -3, radius: 2.6, landmark: { x: 18, z: -9 } },
  { id: 'skills', section: 'skills', title: 'خيمة المهارات', x: 2, z: -22, radius: 2.8, landmark: { x: 2, z: -27 } },
  { id: 'contact', section: 'contact', title: 'برج البريد', x: 22, z: 13, radius: 2.6, landmark: { x: 26, z: 13 } },
  { id: 'oasis', section: 'oasis', title: 'الواحة', x: 28, z: -27, radius: 3, landmark: { x: 36, z: -34 } },
];

// Other named spots the world modules use.
export const spots = {
  well: { x: 0, z: -4 },            // central plaza with the well
  souq: { x: -18, z: -7 },          // the market square (the four project stalls)
  playground: { x: -22, z: 18 },    // stacked pots to knock over
  campfire: { x: 12, z: 24 },
  gate: { x: 0, z: 14 },
};

export const ui = {
  loading: 'جارٍ تجهيز القرية…',
  start: 'ادخل القرية',
  press: 'اضغط Enter',
  tap: 'المس للفتح',
  close: 'إغلاق',
  visit: 'زيارة المشروع',
  menu: 'الأقسام',
  help: 'التحكم',
  sections: {
    welcome: 'البداية',
    project: 'مشروع',
    about: 'نبذة عني',
    skills: 'المهارات',
    contact: 'تواصل معي',
    oasis: 'الواحة',
  },
  welcomeBody: [
    'أهلاً وسهلاً! هذه قرية صغيرة في قلب الصحراء، وكل بيت فيها يحكي جزءاً من قصتي.',
    'في السوق غرباً تجد مشاريعي، وبيتي شرقاً، وخيمة المهارات شمالاً، وبرج البريد للتواصل.',
  ],
  oasisBody: [
    'وصلت إلى الواحة! استرح قليلاً تحت النخيل واشرب من الماء البارد.',
  ],
  helpDesktop: [
    ['↑ ↓ أو W S', 'تقدّم وتراجع'],
    ['← → أو A D', 'الالتفاف'],
    ['Shift', 'الإسراع'],
    ['Space', 'القفز'],
    ['Enter', 'فتح القسم'],
    ['H', 'صوت الجمل'],
    ['M', 'كتم الصوت'],
    ['R', 'العودة للبداية'],
    ['عجلة الفأرة', 'التقريب والإبعاد'],
  ],
  helpMobile: [
    ['اسحب على الشاشة', 'التحرك (أبعد = أسرع)'],
    ['زر القفز', 'القفز'],
    ['زر الجمل', 'صوت الجمل'],
    ['إصبعان', 'التقريب والإبعاد'],
  ],
};

export function toArabicDigits(n) {
  return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
}
