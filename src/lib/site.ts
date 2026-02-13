export const SITE = {
  name: 'American Dream Softwash',
  // TODO: replace with your real domain once you deploy (used for sitemap/canonical URLs)
  url: 'https://adreamsoftwash.com',
  phoneDisplay: '(567) 777-7638',
  phoneTel: '+15677777638',
  email: 'servic@adreamsoftwash.com',
  serviceArea: 'Toledo • Perrysburg • Sylvania • Maumee • Monclova & nearby',
  owners: 'Owned & operated by James & Austin',
  addressLine: 'Toledo, Ohio',
  hours: 'Mon–Sat: 8am–6pm',
  socials: {
    facebook: '',
    googleBusiness: '',
  },
} as const;
export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/gallery", label: "Gallery" },
  { href: "/about", label: "About" },
  { href: "/service-areas", label: "Service Area" },
  { href: "/contact", label: "Contact" },
  { href: "/faq", label: "FAQ" },
] as const;

