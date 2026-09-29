// كل نصوص الموقع هنا. عدّل هذا الملف لتخصيص معرض أعمالك.
// All site copy lives here. Edit this file to personalise the portfolio.

export const profile = {
  name: 'اسمك هنا',
  role: 'مطوّر ويب ومصمم تجارب ثلاثية الأبعاد',
  tagline: 'اركب الجمل واستكشف أعمالي في الصحراء',
  about: [
    'مرحباً! أنا مطوّر ومصمم أحب بناء تجارب تفاعلية على الويب تمزج بين البرمجة والفن.',
    'أعمل على الواجهات الأمامية، الرسوميات ثلاثية الأبعاد بـ WebGL، وتصميم الحركة والصوت.',
    'هذا الموقع نفسه مثال على ما أحب صنعه: عالم صغير يمكنك التجوّل فيه بدل صفحة جامدة.',
  ],
  facts: [
    ['الموقع', 'الرياض، السعودية'],
    ['الخبرة', 'أكثر من ٥ سنوات'],
    ['اللغات', 'العربية، الإنجليزية'],
  ],
};

export const projects = [
  {
    id: 'oasis',
    title: 'واحة',
    subtitle: 'تطبيق لحجز الرحلات الصحراوية',
    color: '#e07a3f',
    accent: '#2f6f73',
    icon: 'tent',
    year: '٢٠٢٦',
    tags: ['React', 'Node.js', 'خرائط'],
    body: 'منصة تربط المسافرين بمرشدين محليين لرحلات التخييم في الصحراء، مع خرائط تفاعلية وحجز فوري ودفع إلكتروني.',
    link: '#',
  },
  {
    id: 'khatt',
    title: 'خطّ',
    subtitle: 'أداة لتوليد الخط العربي',
    color: '#2f6f73',
    accent: '#f2c14e',
    icon: 'pen',
    year: '٢٠٢٥',
    tags: ['Canvas', 'Typography', 'AI'],
    body: 'محرر يحوّل النص إلى تكوينات خطية مستوحاة من الخط الكوفي والثلث، مع تصدير بصيغة SVG للطباعة.',
    link: '#',
  },
  {
    id: 'najm',
    title: 'نجم',
    subtitle: 'تجربة فلكية ثلاثية الأبعاد',
    color: '#3b3a6b',
    accent: '#f2c14e',
    icon: 'star',
    year: '٢٠٢٥',
    tags: ['Three.js', 'GLSL', 'WebAudio'],
    body: 'خريطة سماء تفاعلية تعرض النجوم بأسمائها العربية التي ورثها علم الفلك الحديث، مع رواية صوتية.',
    link: '#',
  },
  {
    id: 'souq',
    title: 'سوق',
    subtitle: 'متجر إلكتروني للحرفيين',
    color: '#b5473a',
    accent: '#f4e3c1',
    icon: 'bag',
    year: '٢٠٢٤',
    tags: ['Next.js', 'Stripe', 'تصميم'],
    body: 'متجر يعرض منتجات الحرفيين المحليين بتصميم يحترم اتجاه القراءة من اليمين إلى اليسار في كل تفصيلة.',
    link: '#',
  },
];

export const skills = [
  'JavaScript', 'TypeScript', 'Three.js', 'WebGL', 'React', 'Node.js',
  'Blender', 'تصميم', 'GLSL', 'WebAudio',
];

export const contact = [
  { id: 'mail', label: 'البريد', value: 'you@example.com', href: 'mailto:you@example.com', color: '#e07a3f' },
  { id: 'github', label: 'GitHub', value: 'github.com/you', href: 'https://github.com/', color: '#3b3a6b' },
  { id: 'linkedin', label: 'LinkedIn', value: 'linkedin.com/in/you', href: 'https://www.linkedin.com/', color: '#2f6f73' },
  { id: 'x', label: 'X', value: '@you', href: 'https://x.com/', color: '#1e1e24' },
];

export const ui = {
  loading: 'جارٍ تجهيز القافلة…',
  start: 'ابدأ الرحلة',
  soundOn: 'الصوت: يعمل',
  soundOff: 'الصوت: مطفأ',
  press: 'اضغط Enter',
  tap: 'المس للفتح',
  close: 'إغلاق',
  visit: 'زيارة المشروع',
  menu: 'الأقسام',
  help: 'التحكم',
  reset: 'أعد صفّ الجِرار',
  jars: (n, total) => `أسقطت ${toArabicDigits(n)} من ${toArabicDigits(total)} جِرار`,
  strike: 'ضربة كاملة! 🎉',
  helpDesktop: [
    ['↑  /  W', 'تقدّم'],
    ['↓  /  S', 'فرملة ورجوع للخلف'],
    ['← →  /  A D', 'الالتفاف'],
    ['Shift', 'الإسراع (والانزلاق في المنعطفات)'],
    ['Space', 'القفز'],
    ['H', 'صوت الجمل'],
    ['Enter', 'فتح القسم'],
    ['عجلة الفأرة', 'التقريب والإبعاد'],
    ['M', 'كتم الصوت'],
  ],
  helpMobile: [
    ['عصا التحكم', 'التحرك (اسحب بعيداً للجري)'],
    ['زر القفز', 'القفز'],
    ['زر الجمل', 'صوت الجمل'],
    ['إصبعان', 'التقريب والإبعاد'],
  ],
  sections: {
    welcome: 'البداية',
    projects: 'المشاريع',
    about: 'نبذة عني',
    skills: 'المهارات',
    contact: 'تواصل معي',
    playground: 'ملعب الجِرار',
    oasis: 'الواحة',
  },
};

export function toArabicDigits(n) {
  return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
}
