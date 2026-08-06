# ADS site-wide visual refresh plan

**Owner:** James Gibbs  
**Status:** proposed visual direction for Preview testing  
**Scope:** American Dream Softwash public marketing pages, ADS Bin Cleaning public page, and shared navigation/footer  
**Exclusions:** do not make the operational customer portal, CRM, or field screens animation-heavy

## Goal

Make the website feel more energetic, modern, memorable, and visually polished without turning it into a cartoon, slowing down phones, weakening readability, or making the entire American Dream Softwash company look like only a trash-bin business.

## Brand direction

Keep the recognizable American Dream Softwash family:

- deep navy for trust and structure;
- bright clean blue for water, freshness, and primary actions;
- red for important promotional accents and urgent calls to action;
- white and very light blue/aqua for clean breathing room;
- stronger dark/light contrast so sections do not blend into one long white page.

Do not replace the entire identity with unrelated colors. Improve the balance, saturation, section contrast, gradients, shadows, shapes, and spacing around the existing brand.

## Site-wide visual system

### 1. Stronger hero sections

- Use layered navy-to-blue or light-blue-to-white backgrounds rather than flat white.
- Add subtle animated water shimmer, soft bubbles, mist, or a moving highlight line.
- Use a bold headline, one clear main action, one secondary action, and real service proof.
- Replace placeholders with original ADS photographs and video when James supplies them. Do not substitute stock photography without approval.

### 2. Motion that supports the message

- Fade-and-rise section reveals as the visitor scrolls.
- Slight button lift, glow, and arrow movement on hover or tap.
- Service-card icons that make one short movement on hover.
- Counters or proof points that animate once when visible.
- Before/after sliders or wipe reveals for real cleaning results.
- Gentle background motion only; no constant distracting bouncing.

All motion must honor `prefers-reduced-motion`, remain usable by keyboard, and avoid large autoplay files that slow mobile devices.

### 3. Better section rhythm

- Alternate white, light-blue, navy, and carefully used red-accent sections.
- Use curved, angled, or wave-shaped section dividers sparingly.
- Add real visual anchors: before/after work, process diagrams, testimonials, service-area proof, and pricing/action panels.
- Reduce repeated plain white cards that all look equally important.

### 4. Public homepage and exterior-cleaning pages

The whole site should use a **clean-transformation** theme rather than a garbage-can theme:

- water movement;
- grime-to-clean reveals;
- shine sweeps;
- soft-wash spray arcs;
- roof, siding, concrete, gutter, and bin service icons;
- authentic ADS work photography.

Garbage cans may appear in the Bin Cleaning navigation feature or bin-cleaning section, but they should not dominate roof, house, concrete, gallery, about, or service-area pages.

### 5. ADS Bin Cleaning page animation concept

The bin page can have more personality:

- a trash cart and recycling cart roll subtly into the hero;
- the lids make a small opening movement;
- a contained spray/bubble animation passes through;
- a grime overlay wipes away to reveal clean carts;
- the animation stops after one short cycle rather than looping constantly;
- real before/after ADS bin photographs replace the illustrated demonstration when available.

This animation must be lightweight CSS/SVG or a carefully optimized asset, responsive, and decorative rather than required to understand pricing or service.

### 6. Portal, CRM, and field screens

Operational screens should stay calmer and faster:

- stronger color-coded status chips;
- clearer icons and progress indicators;
- improved spacing, hierarchy, and mobile navigation;
- limited confirmation animation after saving, sharing, completing, or uploading;
- no rolling bins, background bubbles, or decorative motion that interferes with work.

## Recommended first Preview prototype

Build and review these pieces before restyling every page:

1. Shared header and call-to-action polish.
2. Homepage hero and service-card treatment.
3. One real before/after interaction.
4. ADS Bin Cleaning animated hero concept.
5. Stronger alternating section backgrounds and dividers.
6. Phone performance and reduced-motion test.

After James and Austin review the Preview, apply the approved system consistently across the remaining public pages. Do not merge or deploy the visual refresh to production without James Gibbs's explicit approval.

## What to avoid

- animations merely because movement is possible;
- cartoon garbage cans throughout the entire soft-wash website;
- constant looping, shaking, bouncing, or flashing;
- changing every brand color at once;
- stock photos presented as ADS work;
- tiny text over moving backgrounds;
- heavy video or animation that delays mobile loading;
- making the portal/CRM visually busy;
- changing the existing Lavo exterior-cleaning quote flow while restyling its surrounding button or page placement.
