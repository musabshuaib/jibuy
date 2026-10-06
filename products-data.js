/* products-data.js — seed catalogue (192 products) + default coupons.
   Images use "art|emoji|hue|variant" tokens. storage.js turns them into inline SVG artwork, so every product
   always has three pictures with no hotlinking. In the admin panel you can replace them with real https:// URLs or uploads. */
(function () {
  'use strict';

  const categories = [
    { id: 'gym', name: 'Gym Accessories', icon: '🏋️', hue: 268 },
    { id: 'tech', name: 'Tech', icon: '💻', hue: 212 },
    { id: 'gadgets', name: 'Gadgets', icon: '⌚', hue: 322 },
    { id: 'sports', name: 'Sports Accessories', icon: '⚽', hue: 150 }
  ];

  const OPTIONS = {
    color: ['Colour', ['Black', 'Midnight Blue', 'Royal Purple', 'Crimson Red']],
    size: ['Size', ['S', 'M', 'L', 'XL']],
    shoe: ['Size (EU)', ['40', '41', '42', '43', '44', '45']],
    weight: ['Weight', ['5kg', '10kg', '15kg', '20kg']],
    oz: ['Weight', ['10oz', '12oz', '14oz', '16oz']],
    length: ['Length', ['1m', '2m', '3m']],
    ball: ['Size', ['Size 4', 'Size 5']],
    none: null
  };

  const BRANDS = ['Apex', 'Volt', 'Nova', 'Zenith', 'Kinetic', 'Titan', 'Pulse', 'Axis', 'Orion', 'Blaze'];
  const CITIES = ['Lagos', 'Abuja', 'Ibadan', 'Port Harcourt', 'Kano', 'Enugu', 'Benin City', 'Ilorin', 'Abeokuta', 'Kaduna'];
  const TIERS = [
    { suffix: 'Lite', mult: 0.75, blurb: 'The Lite edition is great value for beginners.' },
    { suffix: '', mult: 1, blurb: 'Comes with a 6-month seller warranty.' },
    { suffix: 'Pro', mult: 1.4, blurb: 'The Pro edition has a premium build for serious users.' }
  ];
  const FEATURES = {
    gym: ['Built for daily heavy training', 'Sweat-resistant and easy to wipe clean', 'Compact enough for home or gym storage'],
    tech: ['Tested for everyday campus and office use', 'Plug-and-play, no drivers needed', '6-month seller warranty'],
    gadgets: ['Rechargeable via USB-C', 'Light enough to carry everywhere', 'Works with Android and iPhone'],
    sports: ['Durable materials for rough pitches and courts', 'Comfortable fit for long sessions', 'Used by campus and club teams']
  };

  // [name, emoji, base price in naira, option type, description]
  const CATALOGUE = {
    gym: [
      ['Adjustable Dumbbell Set', '🏋️', 32000, 'weight', 'Cast-iron plates with a secure spin-lock collar.'],
      ['Resistance Bands Set', '➰', 7500, 'none', 'Five latex bands from light to extra heavy, with a carry pouch.'],
      ['Non-Slip Yoga Mat', '🧘', 9500, 'color', 'Thick 8mm foam with a grippy texture on both sides.'],
      ['Padded Gym Gloves', '🧤', 6000, 'size', 'Breathable palm padding with wrist support.'],
      ['Lifting Belt', '🏋️‍♂️', 14500, 'size', 'Firm lumbar support for squats and deadlifts.'],
      ['Speed Skipping Rope', '🪀', 3500, 'color', 'Ball-bearing handles for smooth, fast spins.'],
      ['Shaker Bottle 700ml', '🥤', 4500, 'color', 'Leak-proof lid with a mixing ball for protein shakes.'],
      ['Push-Up Bars', '💪', 8000, 'color', 'Anti-slip base and foam grips to save your wrists.'],
      ['Ab Roller Wheel', '⚙️', 9000, 'color', 'Wide wheel with knee pad for core workouts.'],
      ['Cast Kettlebell', '🔔', 18000, 'weight', 'Flat base and wide handle for swings and snatches.'],
      ['Doorway Pull-Up Bar', '🚪', 16500, 'none', 'No-screw install, supports up to 150kg.'],
      ['Wrist Wraps', '🥊', 4000, 'color', 'Stretch-resistant wraps with thumb loops.'],
      ['Gym Duffel Bag', '🎒', 15000, 'color', 'Separate shoe compartment and wet-clothes pocket.'],
      ['Foam Roller', '🧱', 8500, 'color', 'High-density roller for post-workout recovery.'],
      ['Ankle Weights', '🦵', 9800, 'weight', 'Adjustable straps with soft neoprene lining.'],
      ['Hand Grip Strengthener', '✊', 3000, 'none', 'Adjustable tension for forearm and grip training.']
    ],
    tech: [
      ['Wireless Earbuds', '🎧', 18500, 'color', 'Bluetooth 5.3 with deep bass and a 24-hour charging case.'],
      ['Bluetooth Speaker', '🔊', 22000, 'color', 'Splash-proof party speaker with 12 hours of playtime.'],
      ['Power Bank 20000mAh', '🔋', 19500, 'color', 'Dual USB output with fast charging and LED indicator.'],
      ['65W Fast Charger', '🔌', 14500, 'none', 'GaN charger for phones, tablets and laptops.'],
      ['Braided USB-C Cable', '🔗', 3500, 'length', 'Tangle-free nylon braid rated for fast charging.'],
      ['Aluminium Laptop Stand', '💻', 12500, 'none', 'Foldable stand with six height settings.'],
      ['Mechanical Keyboard', '⌨️', 38000, 'color', 'Hot-swappable switches with RGB backlight.'],
      ['Gaming Mouse', '🖱️', 16500, 'color', '12,000 DPI sensor with six programmable buttons.'],
      ['1080p Webcam', '📷', 24000, 'none', 'Auto-focus lens with a built-in noise-cancelling mic.'],
      ['Flexible Phone Tripod', '📱', 7500, 'color', 'Bendable legs that grip tables, rails and branches.'],
      ['Laptop Backpack', '🎒', 21000, 'color', 'Water-resistant, with a USB charging port and padded sleeve.'],
      ['512GB Portable SSD', '💾', 62000, 'none', 'Up to 1,000MB/s read speed in a pocket-size case.'],
      ['128GB Flash Drive', '💽', 8500, 'none', 'USB 3.2 drive with a retractable connector.'],
      ['24-inch Full HD Monitor', '🖥️', 98000, 'none', 'IPS panel with 75Hz refresh and HDMI input.'],
      ['4G MiFi Router', '📶', 35000, 'none', 'Pocket router that connects up to 10 devices on any SIM.'],
      ['Shockproof Phone Case', '📲', 5500, 'color', 'Raised edges protect the screen and camera.']
    ],
    gadgets: [
      ['Smart Watch', '⌚', 32000, 'color', 'AMOLED display with heart-rate, sleep and call alerts.'],
      ['Fitness Band', '💓', 15500, 'color', 'Tracks steps, calories and workouts for up to 10 days per charge.'],
      ['Ring Light 12-inch', '🔆', 13500, 'none', 'Dimmable light with a phone holder for content creators.'],
      ['Mini Projector', '📽️', 85000, 'none', 'Portable projector with HDMI, USB and Wi-Fi mirroring.'],
      ['Foldable Drone', '🚁', 120000, 'none', 'HD camera with altitude hold and one-key takeoff.'],
      ['Action Camera 4K', '🎥', 58000, 'none', 'Waterproof camera with image stabilisation and a mounting kit.'],
      ['Smart LED Bulb', '💡', 4500, 'color', 'App-controlled bulb with 16 million colours.'],
      ['Handheld Rechargeable Fan', '🌬️', 6500, 'color', 'Three speeds and a battery that lasts up to 8 hours.'],
      ['Neckband Earphones', '🎶', 9500, 'color', 'Magnetic buds with 20 hours of battery.'],
      ['VR Headset', '🥽', 45000, 'none', 'Adjustable lenses that fit most smartphones.'],
      ['E-Reader 6-inch', '📖', 68000, 'none', 'Glare-free screen with weeks of battery life.'],
      ['Smart Plug', '🔌', 6000, 'none', 'Schedule and control appliances from your phone.'],
      ['Car Phone Holder', '🚗', 5000, 'none', 'One-hand grip with a strong magnetic base.'],
      ['Dash Cam 1080p', '📹', 34000, 'none', 'Loop recording and night vision with a G-sensor.'],
      ['RGB LED Strip', '🌈', 8500, 'length', 'Remote-controlled strip with music sync.'],
      ['Portable Blender', '🍹', 16000, 'color', 'USB-rechargeable bottle blender for smoothies on the go.']
    ],
    sports: [
      ['Match Football', '⚽', 12500, 'ball', 'Machine-stitched ball with a durable butyl bladder.'],
      ['Basketball', '🏀', 14000, 'ball', 'Deep-channel grip for indoor and outdoor courts.'],
      ['Running Shoes', '👟', 38000, 'shoe', 'Cushioned midsole and breathable mesh upper.'],
      ['Club Jersey', '👕', 12000, 'size', 'Moisture-wicking fabric in bold club colours.'],
      ['Shin Guards', '🛡️', 6500, 'size', 'Lightweight shells with soft foam backing.'],
      ['Tennis Racket', '🎾', 28000, 'none', 'Graphite frame with a pre-strung head and cover.'],
      ['Swim Goggles', '🏊', 7500, 'color', 'Anti-fog lenses with UV protection.'],
      ['Cycling Helmet', '⛑️', 19500, 'size', 'Ventilated shell with an adjustable fit dial.'],
      ['Sports Socks 3-Pack', '🧦', 3000, 'size', 'Cushioned heel and arch support.'],
      ['Insulated Water Bottle', '🧴', 7000, 'color', 'Keeps drinks cold for 24 hours.'],
      ['Track Suit', '🧥', 24500, 'size', 'Soft-stretch jacket and trousers for warm-ups.'],
      ['Knee Support', '🩹', 6000, 'size', 'Compression sleeve with open patella for easy movement.'],
      ['Badminton Set', '🏸', 15500, 'none', 'Two rackets, three shuttlecocks and a net.'],
      ['Boxing Gloves', '🥊', 17500, 'oz', 'Multi-layer foam with a secure wrist strap.'],
      ['Sports Cap', '🧢', 4500, 'color', 'Quick-dry cap with an adjustable back strap.'],
      ['Sweatband Set', '🎽', 2800, 'color', 'Head and wrist bands that keep sweat out of your eyes.']
    ]
  };

  function rng(seed) { // mulberry32: deterministic so the catalogue is identical on every fresh install
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const round500 = n => Math.max(500, Math.round(n / 500) * 500);

  function buildProducts() {
    const rand = rng(20260);
    const out = [];
    let n = 0;
    categories.forEach((cat, ci) => {
      CATALOGUE[cat.id].forEach(([base, emoji, price, opt, desc], bi) => {
        TIERS.forEach((tier, ti) => {
          n++;
          const brand = BRANDS[(bi * 3 + ti + ci) % BRANDS.length];
          const p = round500(price * tier.mult);
          const hue = (cat.hue + ti * 18 + bi * 7) % 360;
          const o = OPTIONS[opt];
          out.push({
            id: 'p' + String(n).padStart(3, '0'),
            name: `${brand} ${base}${tier.suffix ? ' ' + tier.suffix : ''}`,
            brand,
            category: cat.id,
            price: p,
            oldPrice: rand() < 0.38 ? round500(p * (1.12 + rand() * 0.25)) : null,
            rating: Math.round((3.8 + rand() * 1.1) * 10) / 10,
            reviewCount: 5 + Math.floor(rand() * 480),
            stock: rand() < 0.05 ? 0 : 3 + Math.floor(rand() * 45),
            location: CITIES[Math.floor(rand() * CITIES.length)],
            verified: rand() < 0.7,
            featured: rand() < 0.15,
            images: [0, 1, 2].map(v => `art|${emoji}|${(hue + v * 14) % 360}|${v}`),
            description: `${desc} ${tier.blurb}`,
            features: FEATURES[cat.id],
            variants: o ? { label: o[0], options: o[1] } : null,
            tags: [cat.name.toLowerCase(), base.toLowerCase(), brand.toLowerCase()],
            created: 1788220800000 - n * 3600000
          });
        });
      });
    });
    return out;
  }

  const coupons = [
    { id: 'JIBUY10', code: 'JIBUY10', type: 'percent', value: 10, min: 0, active: true, note: '10% off your order' },
    { id: 'STUDENT15', code: 'STUDENT15', type: 'percent', value: 15, min: 20000, active: true, note: '15% off orders from ₦20,000' },
    { id: 'WELCOME2000', code: 'WELCOME2000', type: 'fixed', value: 2000, min: 10000, active: true, note: '₦2,000 off orders from ₦10,000' },
    { id: 'FREESHIP', code: 'FREESHIP', type: 'shipping', value: 0, min: 15000, active: true, note: 'Free delivery on orders from ₦15,000' }
  ];

  window.JIBUY_SEED = { categories, buildProducts, coupons };
})();
